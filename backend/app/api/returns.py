import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from ..core.database import get_db
from ..core.security import get_current_active_user
from ..models.models import User, Return, OrderItem, Order, Customer
from ..schemas.schemas import ReturnCreate, ReturnResponse
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/returns", tags=["Returns Management"])

@router.get("/", response_model=List[ReturnResponse])
async def list_returns(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    order_item_id: Optional[str] = Query(None),
    reason: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List returns with filtering"""
    try:
        query = db.query(Return).filter(Return.is_deleted == False)
        
        if order_item_id:
            query = query.filter(Return.order_item_id == order_item_id)
        if reason:
            query = query.filter(Return.reason == reason)
        if date_from:
            query = query.filter(Return.return_date >= date_from)
        if date_to:
            query = query.filter(Return.return_date <= date_to)
        
        returns = query.order_by(Return.return_date.desc()).offset(skip).limit(limit).all()
        
        # Convert to response format manually to avoid Pydantic issues
        response_data = []
        for return_item in returns:
            try:
                # Get order item info safely
                order_item = db.query(OrderItem).filter(OrderItem.id == return_item.order_item_id).first()
                order_item_data = None
                if order_item:
                    order_item_data = {
                        "id": str(order_item.id),
                        "order_id": str(order_item.order_id),
                        "material_type": order_item.material_type,
                        "quantity": order_item.quantity,
                        "unit_price": float(order_item.unit_price),
                        "customization_details": order_item.customization_details,
                        "production_stage": order_item.production_stage,
                        "stage_completed_at": order_item.stage_completed_at,
                        "created_at": order_item.created_at,
                        "updated_at": order_item.updated_at
                    }
                
                return_dict = {
                    "id": str(return_item.id),
                    "order_item_id": str(return_item.order_item_id),
                    "return_date": return_item.return_date,
                    "quantity": return_item.quantity,
                    "reason": return_item.reason,
                    "refund_amount": float(return_item.refund_amount),
                    "is_adjustment": return_item.is_adjustment,
                    "adjustment_amount": float(return_item.adjustment_amount),
                    "notes": return_item.notes,
                    "created_at": return_item.created_at,
                    "order_item": order_item_data
                }
                response_data.append(return_dict)
                
            except Exception as item_error:
                logger.warning(f"Error processing return {return_item.id}: {item_error}")
                # Continue with basic return data if relationship loading fails
                return_dict = {
                    "id": str(return_item.id),
                    "order_item_id": str(return_item.order_item_id),
                    "return_date": return_item.return_date,
                    "quantity": return_item.quantity,
                    "reason": return_item.reason,
                    "refund_amount": float(return_item.refund_amount),
                    "is_adjustment": return_item.is_adjustment,
                    "adjustment_amount": float(return_item.adjustment_amount),
                    "notes": return_item.notes,
                    "created_at": return_item.created_at,
                    "order_item": None
                }
                response_data.append(return_dict)
        
        logger.info(f"User {current_user.username} retrieved {len(response_data)} returns")
        return response_data
        
    except Exception as e:
        logger.error(f"Error retrieving returns: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to retrieve returns: {str(e)[:100]}"
        )

@router.post("/", response_model=ReturnResponse, status_code=201)
async def create_return(
    return_data: ReturnCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Record new return"""
    try:
        # Validate order item
        order_item = db.query(OrderItem).filter(
            and_(OrderItem.id == return_data.order_item_id, OrderItem.is_deleted == False)
        ).first()
        if not order_item:
            raise HTTPException(status_code=404, detail="Order item not found")
        
        # Validate quantity (cannot return more than ordered)
        if return_data.quantity > order_item.quantity:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot return {return_data.quantity} items. Order item only has {order_item.quantity} items."
            )
        
        # Create return record
        db_return = Return(
            order_item_id=return_data.order_item_id,
            return_date=return_data.return_date or datetime.utcnow(),
            quantity=return_data.quantity,
            reason=return_data.reason,
            refund_amount=return_data.refund_amount,
            is_adjustment=return_data.is_adjustment,
            adjustment_amount=return_data.adjustment_amount,
            notes=return_data.notes,
            created_by_user_id=current_user.id
        )
        
        db.add(db_return)
        db.commit()
        db.refresh(db_return)
        
        logger.info(f"User {current_user.username} created return for order item {return_data.order_item_id}")
        
        # Return with order item data
        return {
            "id": str(db_return.id),
            "order_item_id": str(db_return.order_item_id),
            "return_date": db_return.return_date,
            "quantity": db_return.quantity,
            "reason": db_return.reason,
            "refund_amount": float(db_return.refund_amount),
            "is_adjustment": db_return.is_adjustment,
            "adjustment_amount": float(db_return.adjustment_amount),
            "notes": db_return.notes,
            "created_at": db_return.created_at,
            "order_item": {
                "id": str(order_item.id),
                "order_id": str(order_item.order_id),
                "material_type": order_item.material_type,
                "quantity": order_item.quantity,
                "unit_price": float(order_item.unit_price),
                "customization_details": order_item.customization_details,
                "production_stage": order_item.production_stage,
                "stage_completed_at": order_item.stage_completed_at,
                "created_at": order_item.created_at,
                "updated_at": order_item.updated_at
            }
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating return: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create return")

@router.get("/{return_id}", response_model=ReturnResponse)
async def get_return(
    return_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get return by ID"""
    try:
        return_item = db.query(Return).filter(
            and_(Return.id == return_id, Return.is_deleted == False)
        ).first()
        
        if not return_item:
            raise HTTPException(status_code=404, detail="Return not found")
        
        # Get order item data
        order_item = db.query(OrderItem).filter(OrderItem.id == return_item.order_item_id).first()
        order_item_data = None
        if order_item:
            order_item_data = {
                "id": str(order_item.id),
                "order_id": str(order_item.order_id),
                "material_type": order_item.material_type,
                "quantity": order_item.quantity,
                "unit_price": float(order_item.unit_price),
                "customization_details": order_item.customization_details,
                "production_stage": order_item.production_stage,
                "stage_completed_at": order_item.stage_completed_at,
                "created_at": order_item.created_at,
                "updated_at": order_item.updated_at
            }
        
        return {
            "id": str(return_item.id),
            "order_item_id": str(return_item.order_item_id),
            "return_date": return_item.return_date,
            "quantity": return_item.quantity,
            "reason": return_item.reason,
            "refund_amount": float(return_item.refund_amount),
            "is_adjustment": return_item.is_adjustment,
            "adjustment_amount": float(return_item.adjustment_amount),
            "notes": return_item.notes,
            "created_at": return_item.created_at,
            "order_item": order_item_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving return: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve return")

@router.get("/summary/by-reason")
async def get_returns_summary_by_reason(
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get returns summary grouped by reason"""
    try:
        query = db.query(
            Return.reason,
            func.sum(Return.quantity).label('total_quantity'),
            func.sum(Return.refund_amount).label('total_refund'),
            func.count(Return.id).label('return_count')
        ).filter(Return.is_deleted == False)
        
        if date_from:
            query = query.filter(Return.return_date >= date_from)
        
        if date_to:
            query = query.filter(Return.return_date <= date_to)
        
        results = query.group_by(Return.reason).all()
        
        return {
            "period": {
                "from": date_from.isoformat() if date_from else None,
                "to": date_to.isoformat() if date_to else None
            },
            "summary": [
                {
                    "reason": row.reason,
                    "total_quantity": row.total_quantity,
                    "total_refund": float(row.total_refund),
                    "return_count": row.return_count
                }
                for row in results
            ],
            "totals": {
                "total_quantity": sum(row.total_quantity for row in results),
                "total_refund": float(sum(row.total_refund for row in results)),
                "total_returns": sum(row.return_count for row in results)
            }
        }
    except Exception as e:
        logger.error(f"Error retrieving returns summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve returns summary")
