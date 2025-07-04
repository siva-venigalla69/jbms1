import logging
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from ..core.database import get_db
from ..core.security import get_current_active_user
from ..models.models import User, Inventory, InventoryAdjustment
from ..schemas.schemas import InventoryCreate, InventoryUpdate, InventoryResponse
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/inventory", tags=["Inventory Management"])

@router.get("/")
async def list_inventory(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    category: Optional[str] = Query(None),
    low_stock: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List inventory items with filtering"""
    try:
        logger.info(f"User {current_user.username} requesting inventory list")
        
        query = db.query(Inventory).filter(
            and_(Inventory.is_deleted == False, Inventory.is_active == True)
        )
        
        if category:
            query = query.filter(Inventory.category.ilike(f"%{category}%"))
        
        if low_stock:
            query = query.filter(Inventory.current_stock <= Inventory.reorder_level)
        
        items = query.order_by(Inventory.item_name).offset(skip).limit(limit).all()
        
        # Convert to response format manually to avoid Pydantic issues
        response_data = []
        for item in items:
            item_dict = {
                "id": str(item.id),
                "item_name": item.item_name,
                "category": item.category,
                "current_stock": float(item.current_stock),
                "unit": item.unit,
                "reorder_level": float(item.reorder_level),
                "cost_per_unit": float(item.cost_per_unit),
                "supplier_name": item.supplier_name,
                "supplier_contact": item.supplier_contact,
                "is_active": item.is_active,
                "updated_at": item.last_updated,
                "created_at": item.created_at
            }
            response_data.append(item_dict)
        
        logger.info(f"User {current_user.username} retrieved {len(response_data)} inventory items")
        return response_data
        
    except Exception as e:
        logger.error(f"Error retrieving inventory: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to retrieve inventory: {str(e)[:100]}"
        )

@router.post("/", status_code=201)
async def create_inventory_item(
    item_data: InventoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create new inventory item"""
    try:
        # Check for duplicate item name
        existing = db.query(Inventory).filter(
            and_(
                Inventory.item_name.ilike(item_data.item_name),
                Inventory.is_deleted == False
            )
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Item name already exists")
        
        db_item = Inventory(
            item_name=item_data.item_name,
            category=item_data.category,
            current_stock=item_data.current_stock,
            unit=item_data.unit,
            reorder_level=item_data.reorder_level,
            cost_per_unit=item_data.cost_per_unit,
            supplier_name=item_data.supplier_name,
            supplier_contact=item_data.supplier_contact,
            created_by_user_id=current_user.id,
            updated_by_user_id=current_user.id
        )
        
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        
        # Return manual response to avoid schema issues
        response_dict = {
            "id": str(db_item.id),
            "item_name": db_item.item_name,
            "category": db_item.category,
            "current_stock": float(db_item.current_stock),
            "unit": db_item.unit,
            "reorder_level": float(db_item.reorder_level),
            "cost_per_unit": float(db_item.cost_per_unit),
            "supplier_name": db_item.supplier_name,
            "supplier_contact": db_item.supplier_contact,
            "is_active": db_item.is_active,
            "updated_at": db_item.last_updated,
            "created_at": db_item.created_at
        }
        
        logger.info(f"User {current_user.username} created inventory item {db_item.item_name}")
        return response_dict
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating inventory item: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create inventory item")

@router.put("/{item_id}")
async def update_inventory_item(
    item_id: str,
    item_update: InventoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update inventory item"""
    try:
        item = db.query(Inventory).filter(
            and_(Inventory.id == item_id, Inventory.is_deleted == False)
        ).first()
        
        if not item:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        
        # Update fields
        update_data = item_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(item, field, value)
        
        item.updated_by_user_id = current_user.id
        # Don't set last_updated manually - let database handle it
        
        db.commit()
        db.refresh(item)
        
        # Return manual response to avoid schema issues
        response_dict = {
            "id": str(item.id),
            "item_name": item.item_name,
            "category": item.category,
            "current_stock": float(item.current_stock),
            "unit": item.unit,
            "reorder_level": float(item.reorder_level),
            "cost_per_unit": float(item.cost_per_unit),
            "supplier_name": item.supplier_name,
            "supplier_contact": item.supplier_contact,
            "is_active": item.is_active,
            "updated_at": item.last_updated,
            "created_at": item.created_at
        }
        
        logger.info(f"User {current_user.username} updated inventory item {item.item_name}")
        return response_dict
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating inventory: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update inventory")

@router.post("/{item_id}/adjust", status_code=201)
async def adjust_inventory(
    item_id: str,
    adjustment_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Adjust inventory levels"""
    try:
        # Validate inventory item
        item = db.query(Inventory).filter(
            and_(Inventory.id == item_id, Inventory.is_deleted == False)
        ).first()
        
        if not item:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        
        # Extract adjustment data
        adjustment_type_raw = adjustment_data.get("adjustment_type", "quantity_change")
        # Handle adjustment_type enum properly
        if hasattr(adjustment_type_raw, 'value'):
            # If it's already an enum, use its value
            adjustment_type = adjustment_type_raw.value
        elif isinstance(adjustment_type_raw, str):
            # If it's a string, use it directly
            adjustment_type = adjustment_type_raw.lower()
        else:
            adjustment_type = str(adjustment_type_raw).lower()
        
        quantity_change = Decimal(str(adjustment_data.get("quantity_change", 0)))
        reason = adjustment_data.get("reason", "")
        notes = adjustment_data.get("notes", "")
        
        # Validate quantity change
        new_stock = item.current_stock + quantity_change
        if new_stock < 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot reduce stock by {abs(quantity_change)}. Current stock is {item.current_stock}"
            )
        
        # Create adjustment record
        db_adjustment = InventoryAdjustment(
            inventory_id=item_id,
            adjustment_type=adjustment_type,
            quantity_change=quantity_change,
            reason=reason,
            notes=notes,
            created_by_user_id=current_user.id
        )
        
        # Create adjustment record first
        db.add(db_adjustment)
        db.flush()  # Get the adjustment ID without committing
        
        # Update the inventory directly without using privileged session settings
        # This is safer and works on managed PostgreSQL instances
        old_stock = item.current_stock
        item.current_stock = new_stock
        item.updated_by_user_id = current_user.id
        # Let the database trigger handle last_updated/updated_at automatically
        
        db.commit()
        db.refresh(db_adjustment)
        db.refresh(item)
        
        logger.info(f"User {current_user.username} adjusted inventory {item.item_name} by {quantity_change}")
        
        return {
            "success": True,
            "message": "Inventory adjusted successfully",
            "adjustment": {
                "id": str(db_adjustment.id),
                "inventory_id": str(db_adjustment.inventory_id),
                "adjustment_type": db_adjustment.adjustment_type,
                "quantity_change": float(db_adjustment.quantity_change),
                "reason": db_adjustment.reason,
                "notes": db_adjustment.notes,
                "adjustment_date": db_adjustment.adjustment_date,
                "created_at": db_adjustment.created_at
            },
            "updated_inventory": {
                "id": str(item.id),
                "item_name": item.item_name,
                "old_stock": float(old_stock),
                "new_stock": float(item.current_stock),
                "change": float(quantity_change)
            }
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error adjusting inventory: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to adjust inventory: {str(e)}")

@router.get("/low-stock")
async def get_low_stock_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get items below reorder level"""
    try:
        items = db.query(Inventory).filter(
            and_(
                Inventory.is_deleted == False,
                Inventory.is_active == True,
                Inventory.current_stock <= Inventory.reorder_level
            )
        ).order_by(Inventory.current_stock.asc()).all()
        
        # Convert to response format manually to avoid Pydantic issues
        response_data = []
        for item in items:
            item_dict = {
                "id": str(item.id),
                "item_name": item.item_name,
                "category": item.category,
                "current_stock": float(item.current_stock),
                "unit": item.unit,
                "reorder_level": float(item.reorder_level),
                "cost_per_unit": float(item.cost_per_unit),
                "supplier_name": item.supplier_name,
                "supplier_contact": item.supplier_contact,
                "is_active": item.is_active,
                "updated_at": item.last_updated,
                "created_at": item.created_at
            }
            response_data.append(item_dict)
        
        logger.info(f"User {current_user.username} retrieved {len(response_data)} low stock items")
        return response_data
        
    except Exception as e:
        logger.error(f"Error retrieving low stock items: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to retrieve low stock items: {str(e)[:100]}"
        )
