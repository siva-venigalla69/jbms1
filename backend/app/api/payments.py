import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from decimal import Decimal
from ..core.database import get_db
from ..core.security import get_current_active_user
from ..models.models import User, Payment, GSTInvoice, Customer
from ..schemas.schemas import PaymentCreate, PaymentResponse
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["Payment Management"])

@router.get("/", response_model=List[PaymentResponse])
async def list_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    invoice_id: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List payments with filtering"""
    try:
        query = db.query(Payment).filter(Payment.is_deleted == False)
        
        if invoice_id:
            query = query.filter(Payment.invoice_id == invoice_id)
        
        if customer_id:
            query = query.join(GSTInvoice).filter(GSTInvoice.customer_id == customer_id)
        
        if start_date:
            query = query.filter(Payment.payment_date >= start_date)
        
        if end_date:
            query = query.filter(Payment.payment_date <= end_date)
        
        payments = query.order_by(Payment.payment_date.desc()).offset(skip).limit(limit).all()
        return payments
    except Exception as e:
        logger.error(f"Error retrieving payments: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve payments")

@router.post("/", response_model=PaymentResponse, status_code=201)
async def record_payment(
    payment_data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Record customer payment"""
    try:
        # Validate invoice
        invoice = db.query(GSTInvoice).filter(
            and_(GSTInvoice.id == payment_data.invoice_id, GSTInvoice.is_deleted == False)
        ).first()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Check payment amount doesn't exceed outstanding
        if payment_data.amount > invoice.outstanding_amount:
            raise HTTPException(
                status_code=400, 
                detail=f"Payment amount {payment_data.amount} exceeds outstanding amount {invoice.outstanding_amount}"
            )
        
        # Create payment record
        db_payment = Payment(
            invoice_id=payment_data.invoice_id,
            payment_date=payment_data.payment_date or datetime.utcnow(),
            amount=payment_data.amount,
            payment_method=payment_data.payment_method,
            reference_number=payment_data.reference_number,
            notes=payment_data.notes,
            created_by_user_id=current_user.id
        )
        
        db.add(db_payment)
        
        # Update invoice outstanding amount
        invoice.outstanding_amount -= payment_data.amount
        
        db.commit()
        db.refresh(db_payment)
        
        logger.info(f"User {current_user.username} recorded payment of {payment_data.amount} for invoice {invoice.invoice_number}")
        return db_payment
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error recording payment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to record payment")

@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get payment by ID"""
    payment = db.query(Payment).filter(
        and_(Payment.id == payment_id, Payment.is_deleted == False)
    ).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return payment

@router.get("/reports/summary")
async def get_payment_summary(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get payment summary report"""
    try:
        # Set default date range
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            from datetime import timedelta
            start_date = end_date - timedelta(days=30)
        
        # Total payments in period
        total_payments = db.query(func.sum(Payment.amount)).filter(
            and_(
                Payment.is_deleted == False,
                Payment.payment_date >= start_date,
                Payment.payment_date <= end_date
            )
        ).scalar() or 0
        
        # Payments by method
        payments_by_method = db.query(
            Payment.payment_method,
            func.sum(Payment.amount).label('total'),
            func.count(Payment.id).label('count')
        ).filter(
            and_(
                Payment.is_deleted == False,
                Payment.payment_date >= start_date,
                Payment.payment_date <= end_date
            )
        ).group_by(Payment.payment_method).all()
        
        # Payments by customer
        payments_by_customer = db.query(
            Customer.name,
            func.sum(Payment.amount).label('total')
        ).join(GSTInvoice).join(Customer).filter(
            and_(
                Payment.is_deleted == False,
                Payment.payment_date >= start_date,
                Payment.payment_date <= end_date,
                Customer.is_deleted == False
            )
        ).group_by(Customer.id, Customer.name).order_by(func.sum(Payment.amount).desc()).limit(10).all()
        
        return {
            "period": {
                "start_date": start_date,
                "end_date": end_date
            },
            "total_payments": float(total_payments),
            "payments_by_method": [
                {
                    "method": row.payment_method.value,
                    "total": float(row.total),
                    "count": row.count
                }
                for row in payments_by_method
            ],
            "top_paying_customers": [
                {
                    "customer_name": row.name,
                    "total_paid": float(row.total)
                }
                for row in payments_by_customer
            ]
        }
    except Exception as e:
        logger.error(f"Error generating payment summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate payment summary")
