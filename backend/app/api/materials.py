import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, exists, func
from ..core.database import get_db
from ..core.security import get_current_active_user
from ..models.models import User, MaterialIn, MaterialOut, Order, DeliveryChallan
from ..schemas.schemas import MaterialInCreate, MaterialInResponse, MaterialOutCreate, MaterialOutResponse
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/materials", tags=["Material Tracking"])

# Material In Endpoints
@router.get("/in")
async def list_material_in(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    order_id: Optional[str] = Query(None),
    material_type: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List material received records"""
    try:
        query = db.query(MaterialIn)
        
        if order_id:
            query = query.filter(MaterialIn.order_id == order_id)
        if material_type:
            query = query.filter(MaterialIn.material_type == material_type)
        if date_from:
            query = query.filter(MaterialIn.received_date >= date_from)
        if date_to:
            query = query.filter(MaterialIn.received_date <= date_to)
        
        materials = query.order_by(MaterialIn.received_date.desc()).offset(skip).limit(limit).all()
        return materials
    except Exception as e:
        logger.error(f"Error retrieving material in records: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve material in records")

@router.post("/in", status_code=201)
async def record_material_in(
    material_data: MaterialInCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Record material received"""
    try:
        # Validate order if provided
        if material_data.order_id:
            order = db.query(Order).filter(
                and_(Order.id == material_data.order_id, Order.is_deleted == False)
            ).first()
            if not order:
                raise HTTPException(status_code=404, detail="Order not found")
            # If order is provided, use its customer_id if customer_id not explicitly provided
            if not material_data.customer_id:
                material_data.customer_id = str(order.customer_id)
        
        # Validate customer if provided
        if material_data.customer_id:
            from ..models.models import Customer
            customer = db.query(Customer).filter(
                and_(Customer.id == material_data.customer_id, Customer.is_deleted == False)
            ).first()
            if not customer:
                raise HTTPException(status_code=404, detail="Customer not found")
        
        # Handle material_type enum properly
        material_type_value = material_data.material_type
        if hasattr(material_type_value, 'value'):
            # If it's already an enum, use its value
            material_type_db_value = material_type_value.value
        elif isinstance(material_type_value, str):
            # If it's a string, use it directly
            material_type_db_value = material_type_value.lower()
        else:
            material_type_db_value = str(material_type_value).lower()
        
        # Create material in record
        db_material = MaterialIn(
            order_id=material_data.order_id,
            customer_id=material_data.customer_id,
            material_type=material_type_db_value,
            quantity=material_data.quantity,
            unit=material_data.unit,
            received_date=material_data.received_date or datetime.utcnow(),
            notes=material_data.notes,
            created_by_user_id=current_user.id
        )
        
        db.add(db_material)
        db.commit()
        db.refresh(db_material)
        
        logger.info(f"User {current_user.username} recorded material in: {material_data.material_type}")
        return db_material
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error recording material in: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to record material in")

# Material Out Endpoints
@router.get("/out")
async def list_material_out(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    challan_id: Optional[str] = Query(None),
    material_type: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List material dispatched records"""
    try:
        query = db.query(MaterialOut)
        
        if challan_id:
            query = query.filter(MaterialOut.challan_id == challan_id)
        if material_type:
            query = query.filter(MaterialOut.material_type == material_type)
        if date_from:
            query = query.filter(MaterialOut.dispatch_date >= date_from)
        if date_to:
            query = query.filter(MaterialOut.dispatch_date <= date_to)
        
        materials = query.order_by(MaterialOut.dispatch_date.desc()).offset(skip).limit(limit).all()
        return materials
    except Exception as e:
        logger.error(f"Error retrieving material out records: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve material out records")

@router.post("/out", status_code=201)
async def record_material_out(
    material_data: MaterialOutCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Record material dispatched"""
    try:
        # Validate challan
        challan = db.query(DeliveryChallan).filter(
            and_(DeliveryChallan.id == material_data.challan_id, DeliveryChallan.is_deleted == False)
        ).first()
        if not challan:
            raise HTTPException(status_code=404, detail="Delivery challan not found")
        
        # If customer_id not provided, use challan's customer_id
        customer_id = material_data.customer_id or str(challan.customer_id)
        
        # Handle material_type enum properly
        material_type_value = material_data.material_type
        if hasattr(material_type_value, 'value'):
            # If it's already an enum, use its value
            material_type_db_value = material_type_value.value
        elif isinstance(material_type_value, str):
            # If it's a string, use it directly
            material_type_db_value = material_type_value.lower()
        else:
            material_type_db_value = str(material_type_value).lower()
        
        # Create material out record
        db_material = MaterialOut(
            challan_id=material_data.challan_id,
            customer_id=customer_id,
            material_type=material_type_db_value,
            quantity=material_data.quantity,
            unit=material_data.unit,
            dispatch_date=material_data.dispatch_date or datetime.utcnow(),
            notes=material_data.notes,
            created_by_user_id=current_user.id
        )
        
        db.add(db_material)
        db.commit()
        db.refresh(db_material)
        
        logger.info(f"User {current_user.username} recorded material out: {material_data.material_type}")
        return db_material
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error recording material out: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to record material out")

@router.get("/flow/summary")
async def get_material_flow_summary(
    material_type: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get material flow summary (in vs out)"""
    try:
        # Material In summary
        in_query = db.query(
            MaterialIn.material_type,
            func.sum(MaterialIn.quantity).label('total_in'),
            func.count(MaterialIn.id).label('records_in')
        )
        
        if material_type:
            in_query = in_query.filter(MaterialIn.material_type == material_type)
        if date_from:
            in_query = in_query.filter(MaterialIn.received_date >= date_from)
        if date_to:
            in_query = in_query.filter(MaterialIn.received_date <= date_to)
        
        material_in_data = in_query.group_by(MaterialIn.material_type).all()
        
        # Material Out summary
        out_query = db.query(
            MaterialOut.material_type,
            func.sum(MaterialOut.quantity).label('total_out'),
            func.count(MaterialOut.id).label('records_out')
        )
        
        if material_type:
            out_query = out_query.filter(MaterialOut.material_type == material_type)
        if date_from:
            out_query = out_query.filter(MaterialOut.dispatch_date >= date_from)
        if date_to:
            out_query = out_query.filter(MaterialOut.dispatch_date <= date_to)
        
        material_out_data = out_query.group_by(MaterialOut.material_type).all()
        
        # Combine data
        material_flow = {}
        
        for row in material_in_data:
            material_flow[row.material_type] = {
                "material_type": row.material_type,
                "total_in": float(row.total_in or 0),
                "records_in": row.records_in,
                "total_out": 0,
                "records_out": 0,
                "balance": float(row.total_in or 0)
            }
        
        for row in material_out_data:
            if row.material_type in material_flow:
                material_flow[row.material_type]["total_out"] = float(row.total_out or 0)
                material_flow[row.material_type]["records_out"] = row.records_out
                material_flow[row.material_type]["balance"] = (
                    material_flow[row.material_type]["total_in"] - float(row.total_out or 0)
                )
            else:
                material_flow[row.material_type] = {
                    "material_type": row.material_type,
                    "total_in": 0,
                    "records_in": 0,
                    "total_out": float(row.total_out or 0),
                    "records_out": row.records_out,
                    "balance": -float(row.total_out or 0)
                }
        
        return {
            "summary": list(material_flow.values()),
            "total_materials": len(material_flow)
        }
    except Exception as e:
        logger.error(f"Error retrieving material flow summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve material flow summary")

@router.get("/pending-dispatch")
async def get_pending_dispatch(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get challans that haven't been dispatched yet"""
    try:
        # Find challans without material out records
        pending_challans = db.query(DeliveryChallan).filter(
            and_(
                DeliveryChallan.is_deleted == False,
                DeliveryChallan.delivery_status == "pending",
                ~exists().where(MaterialOut.challan_id == DeliveryChallan.id)
            )
        ).all()
        
        return [
            {
                "challan_id": challan.id,
                "challan_number": challan.challan_number,
                "customer_name": challan.customer.name,
                "challan_date": challan.challan_date,
                "total_quantity": challan.total_quantity
            }
            for challan in pending_challans
        ]
    except Exception as e:
        logger.error(f"Error retrieving pending dispatch: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve pending dispatch")
