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
        return orders
    except Exception as e:
        logger.error(f"Error retrieving orders: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve orders")

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
        
        # Create order
        db_order = Order(
            customer_id=order_data.customer_id,
            order_date=order_data.order_date or datetime.utcnow(),
            status=order_data.status,
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
        return db_order
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating order: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create order")

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