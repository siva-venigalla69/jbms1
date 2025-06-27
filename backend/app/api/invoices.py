import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from decimal import Decimal
from ..core.database import get_db
from ..core.security import get_current_active_user
from ..models.models import User, GSTInvoice, InvoiceChallan, DeliveryChallan, Customer
from ..schemas.schemas import GSTInvoiceCreate, GSTInvoiceResponse
from ..services.numbering import generate_invoice_number
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/invoices", tags=["GST Invoices"])

@router.get("/", response_model=List[GSTInvoiceResponse])
async def list_invoices(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    customer_id: Optional[str] = Query(None),
    outstanding_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List GST invoices"""
    try:
        query = db.query(GSTInvoice).filter(GSTInvoice.is_deleted == False)
        
        if customer_id:
            query = query.filter(GSTInvoice.customer_id == customer_id)
        
        if outstanding_only:
            query = query.filter(GSTInvoice.outstanding_amount > 0)
        
        invoices = query.order_by(GSTInvoice.invoice_date.desc()).offset(skip).limit(limit).all()
        return invoices
    except Exception as e:
        logger.error(f"Error retrieving invoices: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve invoices")

@router.post("/", response_model=GSTInvoiceResponse, status_code=201)
async def create_invoice(
    invoice_data: GSTInvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create GST invoice from challans"""
    try:
        # Validate customer
        customer = db.query(Customer).filter(
            and_(Customer.id == invoice_data.customer_id, Customer.is_deleted == False)
        ).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Validate challans
        if not invoice_data.challan_ids:
            raise HTTPException(status_code=400, detail="Invoice must include challans")
        
        challans = db.query(DeliveryChallan).filter(
            and_(
                DeliveryChallan.id.in_(invoice_data.challan_ids),
                DeliveryChallan.is_deleted == False,
                DeliveryChallan.customer_id == invoice_data.customer_id
            )
        ).all()
        
        if len(challans) != len(invoice_data.challan_ids):
            raise HTTPException(status_code=400, detail="Some challans not found or belong to different customer")
        
        # Calculate totals from challan items
        subtotal = Decimal('0')
        for challan in challans:
            for item in challan.challan_items:
                subtotal += item.quantity * item.order_item.unit_price
        
        # Calculate taxes
        cgst_amount = subtotal * invoice_data.cgst_rate / 100
        sgst_amount = subtotal * invoice_data.sgst_rate / 100
        igst_amount = subtotal * invoice_data.igst_rate / 100
        
        total_amount = subtotal + cgst_amount + sgst_amount + igst_amount
        
        # Generate invoice number
        invoice_number = generate_invoice_number(db)
        
        # Create invoice
        db_invoice = GSTInvoice(
            invoice_number=invoice_number,
            customer_id=invoice_data.customer_id,
            invoice_date=invoice_data.invoice_date or datetime.utcnow(),
            subtotal=subtotal,
            cgst_rate=invoice_data.cgst_rate,
            sgst_rate=invoice_data.sgst_rate,
            igst_rate=invoice_data.igst_rate,
            cgst_amount=cgst_amount,
            sgst_amount=sgst_amount,
            igst_amount=igst_amount,
            total_amount=total_amount,
            outstanding_amount=total_amount,
            created_by_user_id=current_user.id
        )
        db.add(db_invoice)
        db.flush()
        
        # Link challans to invoice
        for challan_id in invoice_data.challan_ids:
            invoice_challan = InvoiceChallan(
                invoice_id=db_invoice.id,
                challan_id=challan_id,
                challan_amount=Decimal('0')  # Will be calculated based on items
            )
            db.add(invoice_challan)
        
        db.commit()
        db.refresh(db_invoice)
        return db_invoice
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating invoice: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create invoice")

@router.get("/{invoice_id}", response_model=GSTInvoiceResponse)
async def get_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get invoice by ID"""
    invoice = db.query(GSTInvoice).filter(
        and_(GSTInvoice.id == invoice_id, GSTInvoice.is_deleted == False)
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return invoice

@router.get("/outstanding/summary")
async def get_outstanding_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get outstanding receivables summary"""
    try:
        from sqlalchemy import func
        
        # Get outstanding by customer
        outstanding_by_customer = db.query(
            Customer.name,
            func.sum(GSTInvoice.outstanding_amount).label('total_outstanding'),
            func.count(GSTInvoice.id).label('invoice_count')
        ).join(GSTInvoice).filter(
            and_(
                GSTInvoice.outstanding_amount > 0,
                GSTInvoice.is_deleted == False,
                Customer.is_deleted == False
            )
        ).group_by(Customer.id, Customer.name).all()
        
        # Total outstanding
        total_outstanding = db.query(func.sum(GSTInvoice.outstanding_amount)).filter(
            and_(
                GSTInvoice.outstanding_amount > 0,
                GSTInvoice.is_deleted == False
            )
        ).scalar() or 0
        
        return {
            "total_outstanding": float(total_outstanding),
            "outstanding_by_customer": [
                {
                    "customer_name": row.name,
                    "outstanding_amount": float(row.total_outstanding),
                    "invoice_count": row.invoice_count
                }
                for row in outstanding_by_customer
            ]
        }
    except Exception as e:
        logger.error(f"Error retrieving outstanding summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve outstanding summary")
