import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from ..core.database import get_db
from ..core.security import get_current_active_user
from ..models.models import User, Expense
from ..schemas.schemas import ExpenseCreate, ExpenseResponse
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/expenses", tags=["Expense Management"])

@router.get("/")
async def list_expenses(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List expenses with filtering"""
    try:
        query = db.query(Expense).filter(Expense.is_deleted == False)
        
        if category:
            query = query.filter(Expense.category.ilike(f"%{category}%"))
        
        if date_from:
            query = query.filter(Expense.expense_date >= date_from)
        
        if date_to:
            query = query.filter(Expense.expense_date <= date_to)
        
        expenses = query.order_by(Expense.expense_date.desc()).offset(skip).limit(limit).all()
        return expenses
    except Exception as e:
        logger.error(f"Error retrieving expenses: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve expenses")

@router.post("/", status_code=201)
async def create_expense(
    expense_data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Record new expense"""
    try:
        # Handle payment_method enum properly
        payment_method_value = expense_data.payment_method
        if hasattr(payment_method_value, 'value'):
            # If it's already an enum, use its value
            payment_method_db_value = payment_method_value.value
        elif isinstance(payment_method_value, str):
            # If it's a string, use it directly
            payment_method_db_value = payment_method_value.lower()
        else:
            payment_method_db_value = str(payment_method_value).lower()

        # Create expense record
        db_expense = Expense(
            expense_date=expense_data.expense_date or datetime.utcnow(),
            category=expense_data.category,
            description=expense_data.description,
            amount=expense_data.amount,
            payment_method=payment_method_db_value,
            reference_number=expense_data.reference_number,
            notes=expense_data.notes,
            created_by_user_id=current_user.id
        )
        
        db.add(db_expense)
        db.commit()
        db.refresh(db_expense)
        
        logger.info(f"User {current_user.username} recorded expense: {expense_data.category} - {expense_data.amount}")
        return db_expense
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating expense: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create expense")

@router.get("/{expense_id}")
async def get_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get expense by ID"""
    expense = db.query(Expense).filter(
        and_(Expense.id == expense_id, Expense.is_deleted == False)
    ).first()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    return expense

@router.get("/summary/by-category")
async def get_expense_summary_by_category(
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get expense summary grouped by category"""
    try:
        query = db.query(
            Expense.category,
            func.sum(Expense.amount).label('total_amount'),
            func.count(Expense.id).label('expense_count')
        ).filter(Expense.is_deleted == False)
        
        if date_from:
            query = query.filter(Expense.expense_date >= date_from)
        
        if date_to:
            query = query.filter(Expense.expense_date <= date_to)
        
        results = query.group_by(Expense.category).all()
        
        return {
            "period": {
                "from": date_from.isoformat() if date_from else None,
                "to": date_to.isoformat() if date_to else None
            },
            "summary": [
                {
                    "category": row.category,
                    "total_amount": float(row.total_amount),
                    "expense_count": row.expense_count
                }
                for row in results
            ],
            "total_expenses": float(sum(row.total_amount for row in results))
        }
    except Exception as e:
        logger.error(f"Error retrieving expense summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve expense summary")
