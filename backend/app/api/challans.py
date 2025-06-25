import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from ..core.database import get_db
from ..core.security import get_current_active_user
from ..models.models import User, DeliveryChallan, ChallanItem, Customer, OrderItem
from ..schemas.schemas import DeliveryChallanCreate, DeliveryChallanResponse, DeliveryChallanUpdate
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/challans", tags=["Delivery Challans"])

@router.get("/", response_model=List[DeliveryChallanResponse])
async def list_challans(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    customer_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List delivery challans"""
    try:
        query = db.query(DeliveryChallan).filter(DeliveryChallan.is_deleted == False)
        
        if customer_id:
            query = query.filter(DeliveryChallan.customer_id == customer_id)
        
        if status:
            query = query.filter(DeliveryChallan.delivery_status == status)
        
        challans = query.order_by(DeliveryChallan.challan_date.desc()).offset(skip).limit(limit).all()
        return challans
    except Exception as e:
        logger.error(f"Error retrieving challans: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve challans")

@router.post("/", response_model=DeliveryChallanResponse, status_code=201)
async def create_challan(
    challan_data: DeliveryChallanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create delivery challan"""
    try:
        # Validate customer
        customer = db.query(Customer).filter(
            and_(Customer.id == challan_data.customer_id, Customer.is_deleted == False)
        ).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Validate order items
        if not challan_data.challan_items:
            raise HTTPException(status_code=400, detail="Challan must contain items")
        
        total_quantity = sum(item.quantity for item in challan_data.challan_items)
        
        # Create challan
        db_challan = DeliveryChallan(
            customer_id=challan_data.customer_id,
            challan_date=challan_data.challan_date or datetime.utcnow(),
            total_quantity=total_quantity,
            delivery_status=challan_data.delivery_status,
            notes=challan_data.notes,
            created_by_user_id=current_user.id
        )
        db.add(db_challan)
        db.flush()
        
        # Create challan items
        for item_data in challan_data.challan_items:
            # Validate order item exists
            order_item = db.query(OrderItem).filter(
                and_(OrderItem.id == item_data.order_item_id, OrderItem.is_deleted == False)
            ).first()
            if not order_item:
                raise HTTPException(status_code=404, detail=f"Order item {item_data.order_item_id} not found")
            
            db_item = ChallanItem(
                challan_id=db_challan.id,
                order_item_id=item_data.order_item_id,
                quantity=item_data.quantity
            )
            db.add(db_item)
        
        db.commit()
        db.refresh(db_challan)
        return db_challan
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating challan: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create challan")

@router.get("/{challan_id}", response_model=DeliveryChallanResponse)
async def get_challan(
    challan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get challan by ID"""
    challan = db.query(DeliveryChallan).filter(
        and_(DeliveryChallan.id == challan_id, DeliveryChallan.is_deleted == False)
    ).first()
    
    if not challan:
        raise HTTPException(status_code=404, detail="Challan not found")
    
    return challan

@router.put("/{challan_id}/deliver")
async def mark_delivered(
    challan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark challan as delivered"""
    try:
        challan = db.query(DeliveryChallan).filter(
            and_(DeliveryChallan.id == challan_id, DeliveryChallan.is_deleted == False)
        ).first()
        
        if not challan:
            raise HTTPException(status_code=404, detail="Challan not found")
        
        challan.delivery_status = "delivered"
        db.commit()
        
        return {"message": "Challan marked as delivered"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error marking challan delivered: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update challan")
