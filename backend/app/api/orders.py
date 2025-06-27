import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from decimal import Decimal
from ..core.database import get_db
from ..core.security import get_current_active_user
from ..models.models import User, Order, OrderItem, Customer
from ..schemas.schemas import (
    OrderCreate, OrderUpdate, OrderResponse, OrderItemUpdate, 
    ProductionStageUpdate, ProductionStage
)
from ..models.models import OrderStatus
from ..services.numbering import generate_order_number
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/orders", tags=["Order Management"])

@router.get("/", response_model=List[OrderResponse])
async def list_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    customer_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List orders with filtering and search"""
    try:
        logger.info(f"User {current_user.username} requesting orders list with skip={skip}, limit={limit}")
        
        query = db.query(Order).filter(Order.is_deleted == False)
        
        if customer_id:
            query = query.filter(Order.customer_id == customer_id)
        
        if status:
            query = query.filter(Order.status == status)
        
        if search:
            search_term = f"%{search.strip()}%"
            query = query.join(Customer).filter(
                or_(
                    Order.order_number.ilike(search_term),
                    Customer.name.ilike(search_term),
                    Order.notes.ilike(search_term)
                )
            )
        
        orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
        
        # Convert to response format manually to avoid Pydantic issues
        response_data = []
        for order in orders:
            try:
                # Get customer info safely
                customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
                customer_data = {
                    "id": str(customer.id),
                    "name": customer.name,
                    "phone": customer.phone,
                    "email": customer.email,
                    "address": customer.address,
                    "gst_number": customer.gst_number,
                    "created_at": customer.created_at,
                    "updated_at": customer.updated_at
                } if customer else None
                
                # Get order items safely
                order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
                items_data = []
                for item in order_items:
                    item_dict = {
                        "id": str(item.id),
                        "order_id": str(item.order_id),
                        "material_type": item.material_type,
                        "quantity": item.quantity,
                        "unit_price": float(item.unit_price),
                        "customization_details": item.customization_details,
                        "production_stage": item.production_stage,
                        "stage_completed_at": item.stage_completed_at,
                        "created_at": item.created_at,
                        "updated_at": item.updated_at
                    }
                    items_data.append(item_dict)
                
                order_dict = {
                    "id": str(order.id),
                    "order_number": order.order_number,
                    "customer_id": str(order.customer_id),
                    "order_date": order.order_date,
                    "status": order.status,
                    "total_amount": float(order.total_amount),
                    "notes": order.notes,
                    "created_at": order.created_at,
                    "updated_at": order.updated_at,
                    "customer": customer_data,
                    "order_items": items_data
                }
                response_data.append(order_dict)
            except Exception as item_error:
                logger.warning(f"Error processing order {order.id}: {item_error}")
                # Continue with basic order data if relationship loading fails
                order_dict = {
                    "id": str(order.id),
                    "order_number": order.order_number,
                    "customer_id": str(order.customer_id),
                    "order_date": order.order_date,
                    "status": order.status,
                    "total_amount": float(order.total_amount),
                    "notes": order.notes,
                    "created_at": order.created_at,
                    "updated_at": order.updated_at,
                    "customer": None,
                    "order_items": []
                }
                response_data.append(order_dict)
        
        logger.info(f"User {current_user.username} retrieved {len(response_data)} orders")
        return response_data
        
    except Exception as e:
        logger.error(f"Error retrieving orders: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to retrieve orders: {str(e)[:100]}"
        )

@router.post("/", response_model=OrderResponse, status_code=201)
async def create_order(
    order_data: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create new order with items"""
    try:
        # Validate customer
        customer = db.query(Customer).filter(
            and_(Customer.id == order_data.customer_id, Customer.is_deleted == False)
        ).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Validate order items
        if not order_data.order_items:
            raise HTTPException(status_code=400, detail="Order must contain items")
        
        # Calculate total amount
        total_amount = sum(item.quantity * item.unit_price for item in order_data.order_items)
        
        # Generate order number
        order_number = generate_order_number(db)
        
        # Create order - use OrderStatus enum properly
        status_value = order_data.status
        if isinstance(status_value, OrderStatus):
            # If it's already an enum, use its value
            status_db_value = status_value.value
        elif isinstance(status_value, str):
            # If it's a string, try to match it to enum value
            try:
                # Try direct mapping first
                if status_value.lower() in [s.value for s in OrderStatus]:
                    status_db_value = status_value.lower()
                else:
                    # Try enum name mapping
                    status_db_value = OrderStatus[status_value.upper()].value
            except (ValueError, KeyError):
                status_db_value = OrderStatus.PENDING.value
        else:
            status_db_value = OrderStatus.PENDING.value
        
        db_order = Order(
            order_number=order_number,
            customer_id=order_data.customer_id,
            order_date=order_data.order_date or datetime.utcnow(),
            status=status_db_value,
            total_amount=total_amount,
            notes=order_data.notes,
            created_by_user_id=current_user.id,
            updated_by_user_id=current_user.id
        )
        db.add(db_order)
        db.flush()
        
        # Create order items
        for item_data in order_data.order_items:
            db_item = OrderItem(
                order_id=db_order.id,
                material_type=item_data.material_type,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                customization_details=item_data.customization_details
            )
            db.add(db_item)
        
        db.commit()
        db.refresh(db_order)
        
        logger.info(f"User {current_user.username} created order {db_order.order_number}")
        
        # Return manual response to avoid schema issues
        return {
            "id": str(db_order.id),
            "order_number": db_order.order_number,
            "customer_id": str(db_order.customer_id),
            "order_date": db_order.order_date,
            "status": db_order.status,
            "total_amount": float(db_order.total_amount),
            "notes": db_order.notes,
            "created_at": db_order.created_at,
            "updated_at": db_order.updated_at,
            "customer": {
                "id": str(customer.id),
                "name": customer.name,
                "phone": customer.phone,
                "email": customer.email,
                "address": customer.address,
                "gst_number": customer.gst_number,
                "created_at": customer.created_at,
                "updated_at": customer.updated_at
            },
            "order_items": [
                {
                    "id": str(item.id),
                    "order_id": str(item.order_id),
                    "material_type": item.material_type,
                    "quantity": item.quantity,
                    "unit_price": float(item.unit_price),
                    "customization_details": item.customization_details,
                    "production_stage": item.production_stage,
                    "stage_completed_at": item.stage_completed_at,
                    "created_at": item.created_at,
                    "updated_at": item.updated_at
                } for item in db.query(OrderItem).filter(OrderItem.order_id == db_order.id).all()
            ]
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating order: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)[:100]}")

@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get order by ID"""
    order = db.query(Order).filter(
        and_(Order.id == order_id, Order.is_deleted == False)
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return order

@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: str,
    order_update: OrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update order"""
    try:
        order = db.query(Order).filter(
            and_(Order.id == order_id, Order.is_deleted == False)
        ).first()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Update fields
        update_data = order_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(order, field, value)
        
        order.updated_by_user_id = current_user.id
        order.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(order)
        
        logger.info(f"User {current_user.username} updated order {order.order_number}")
        return order
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating order: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update order")

@router.delete("/{order_id}")
async def delete_order(
    order_id: str,
    force: bool = Query(False, description="Force delete even with challans"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Soft delete order"""
    try:
        order = db.query(Order).filter(
            and_(Order.id == order_id, Order.is_deleted == False)
        ).first()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Check for existing challans unless force delete
        if not force:
            from ..models.models import ChallanItem
            has_challans = db.query(ChallanItem).join(OrderItem).filter(
                OrderItem.order_id == order_id
            ).first()
            
            if has_challans:
                raise HTTPException(
                    status_code=400, 
                    detail="Cannot delete order with existing delivery challans. Use force=true to override."
                )
        
        # Soft delete order and items
        order.is_deleted = True
        order.updated_by_user_id = current_user.id
        order.updated_at = datetime.utcnow()
        
        for item in order.order_items:
            item.is_deleted = True
        
        db.commit()
        
        logger.info(f"User {current_user.username} deleted order {order.order_number}")
        return {"message": "Order deleted successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting order: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete order")

@router.put("/items/{item_id}/stage", response_model=dict)
async def update_production_stage(
    item_id: str,
    stage_update: ProductionStageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update production stage for order item"""
    try:
        item = db.query(OrderItem).filter(
            and_(OrderItem.id == item_id, OrderItem.is_deleted == False)
        ).first()
        
        if not item:
            raise HTTPException(status_code=404, detail="Order item not found")
        
        # Update stage based on stage type
        current_time = datetime.utcnow()
        
        if stage_update.stage == ProductionStage.PRE_TREATMENT:
            item.pre_treatment_completed_at = current_time
            item.pre_treatment_completed_by = current_user.id
        elif stage_update.stage == ProductionStage.PRINTING:
            item.printing_completed_at = current_time
            item.printing_completed_by = current_user.id
        elif stage_update.stage == ProductionStage.POST_PROCESS:
            item.post_process_completed_at = current_time
            item.post_process_completed_by = current_user.id
        
        item.current_stage = stage_update.stage
        item.updated_at = current_time
        
        db.commit()
        
        logger.info(f"User {current_user.username} updated item {item_id} to stage {stage_update.stage}")
        return {
            "message": f"Production stage updated to {stage_update.stage}",
            "stage": stage_update.stage,
            "completed_at": current_time
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating production stage: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update production stage")

@router.get("/pending/summary")
async def get_pending_orders_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get summary of pending orders"""
    try:
        from sqlalchemy import func
        
        # Count by status
        status_counts = db.query(
            Order.status,
            func.count(Order.id).label('count'),
            func.sum(Order.total_amount).label('total_amount')
        ).filter(Order.is_deleted == False).group_by(Order.status).all()
        
        # Production stage summary
        stage_counts = db.query(
            OrderItem.current_stage,
            func.count(OrderItem.id).label('count')
        ).join(Order).filter(
            and_(Order.is_deleted == False, OrderItem.is_deleted == False)
        ).group_by(OrderItem.current_stage).all()
        
        return {
            "status_summary": [
                {
                    "status": row.status,
                    "count": row.count,
                    "total_amount": float(row.total_amount or 0)
                }
                for row in status_counts
            ],
            "production_summary": [
                {
                    "stage": row.current_stage,
                    "count": row.count
                }
                for row in stage_counts
            ]
        }
    except Exception as e:
        logger.error(f"Error retrieving pending orders summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve summary") 