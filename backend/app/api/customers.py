import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from ..core.database import get_db
from ..core.security import get_current_active_user
from ..models.models import User, Customer
from ..schemas.schemas import CustomerCreate, CustomerUpdate, CustomerResponse, CustomerSearchResponse
from datetime import datetime

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/customers", tags=["Customer Management"])

@router.get("/", response_model=List[CustomerResponse])
async def list_customers(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Number of records to return"),
    search: Optional[str] = Query(None, description="Search by name, phone, or email"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    sort_by: Optional[str] = Query("created_at", description="Sort field"),
    sort_order: Optional[str] = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve customers with pagination, search, and filtering
    
    - **skip**: Number of records to skip for pagination
    - **limit**: Maximum number of records to return (1-100)
    - **search**: Search term for name, phone, or email
    - **is_active**: Filter by active/inactive status
    - **sort_by**: Field to sort by (name, created_at, etc.)
    - **sort_order**: Sort direction (asc/desc)
    """
    try:
        # Build base query
        query = db.query(Customer).filter(Customer.is_deleted == False)
        
        # Apply search filter
        if search:
            search_term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Customer.name.ilike(search_term),
                    Customer.phone.ilike(search_term),
                    Customer.email.ilike(search_term)
                )
            )
        
        # Apply active status filter
        if is_active is not None:
            # Assuming active status is determined by recent activity or explicit field
            if hasattr(Customer, 'is_active'):
                query = query.filter(Customer.is_active == is_active)
        
        # Apply sorting
        if hasattr(Customer, sort_by):
            if sort_order == "desc":
                query = query.order_by(getattr(Customer, sort_by).desc())
            else:
                query = query.order_by(getattr(Customer, sort_by).asc())
        else:
            # Default sorting
            query = query.order_by(Customer.created_at.desc())
        
        # Apply pagination
        customers = query.offset(skip).limit(limit).all()
        
        logger.info(f"User {current_user.username} retrieved {len(customers)} customers")
        return customers
        
    except Exception as e:
        logger.error(f"Error retrieving customers: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve customers"
        )

@router.get("/search", response_model=CustomerSearchResponse)
async def search_customers(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Maximum results"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Fast search for customers with minimal data for autocomplete/suggestions
    """
    try:
        search_term = f"%{q.strip()}%"
        
        customers = db.query(Customer).filter(
            and_(
                Customer.is_deleted == False,
                or_(
                    Customer.name.ilike(search_term),
                    Customer.phone.ilike(search_term),
                    Customer.email.ilike(search_term)
                )
            )
        ).limit(limit).all()
        
        results = [
            {
                "id": customer.id,
                "name": customer.name,
                "phone": customer.phone,
                "email": customer.email
            }
            for customer in customers
        ]
        
        return {
            "query": q,
            "count": len(results),
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error searching customers: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search failed"
        )

@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_data: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new customer with validation
    
    - **name**: Customer name (required, 2-255 characters)
    - **phone**: Phone number (unique, validated format)
    - **email**: Email address (optional, validated format)
    - **address**: Customer address (optional)
    - **gst_number**: GST number (optional, validated format)
    """
    try:
        # Check for duplicate phone number
        if customer_data.phone:
            existing_phone = db.query(Customer).filter(
                and_(
                    Customer.phone == customer_data.phone,
                    Customer.is_deleted == False
                )
            ).first()
            
            if existing_phone:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Customer with phone number {customer_data.phone} already exists"
                )
        
        # Check for duplicate email
        if customer_data.email:
            existing_email = db.query(Customer).filter(
                and_(
                    Customer.email == customer_data.email,
                    Customer.is_deleted == False
                )
            ).first()
            
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Customer with email {customer_data.email} already exists"
                )
        
        # Create customer
        db_customer = Customer(
            name=customer_data.name.strip(),
            phone=customer_data.phone,
            email=customer_data.email.strip().lower() if customer_data.email else None,
            address=customer_data.address.strip() if customer_data.address else None,
            gst_number=customer_data.gst_number.strip().upper() if customer_data.gst_number else None,
            created_by=current_user.id,
            updated_by=current_user.id
        )
        
        db.add(db_customer)
        db.commit()
        db.refresh(db_customer)
        
        logger.info(f"User {current_user.username} created customer {db_customer.id}: {db_customer.name}")
        
        return db_customer
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating customer: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create customer"
        )

@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: int,
    include_stats: bool = Query(False, description="Include order statistics"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get customer details by ID with optional statistics
    """
    try:
        customer = db.query(Customer).filter(
            and_(
                Customer.id == customer_id,
                Customer.is_deleted == False
            )
        ).first()
        
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        # Add statistics if requested
        if include_stats and hasattr(customer, 'orders'):
            customer.order_count = len([o for o in customer.orders if not o.is_deleted])
            customer.total_order_value = sum(
                o.total_amount for o in customer.orders 
                if not o.is_deleted and o.total_amount
            )
        
        logger.info(f"User {current_user.username} viewed customer {customer_id}")
        return customer
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving customer {customer_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve customer"
        )

@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: int,
    customer_update: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update customer information with validation
    """
    try:
        customer = db.query(Customer).filter(
            and_(
                Customer.id == customer_id,
                Customer.is_deleted == False
            )
        ).first()
        
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        # Check for duplicate phone (excluding current customer)
        if customer_update.phone and customer_update.phone != customer.phone:
            existing_phone = db.query(Customer).filter(
                and_(
                    Customer.phone == customer_update.phone,
                    Customer.id != customer_id,
                    Customer.is_deleted == False
                )
            ).first()
            
            if existing_phone:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Phone number {customer_update.phone} is already in use"
                )
        
        # Check for duplicate email (excluding current customer)
        if customer_update.email and customer_update.email != customer.email:
            existing_email = db.query(Customer).filter(
                and_(
                    Customer.email == customer_update.email,
                    Customer.id != customer_id,
                    Customer.is_deleted == False
                )
            ).first()
            
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Email {customer_update.email} is already in use"
                )
        
        # Update fields
        update_data = customer_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                if field in ['name', 'address'] and isinstance(value, str):
                    value = value.strip()
                elif field == 'email' and isinstance(value, str):
                    value = value.strip().lower()
                elif field == 'gst_number' and isinstance(value, str):
                    value = value.strip().upper()
                
                setattr(customer, field, value)
        
        customer.updated_by = current_user.id
        customer.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(customer)
        
        logger.info(f"User {current_user.username} updated customer {customer_id}")
        return customer
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating customer {customer_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update customer"
        )

@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: int,
    force: bool = Query(False, description="Force delete even with existing orders"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Soft delete a customer (mark as deleted)
    """
    try:
        customer = db.query(Customer).filter(
            and_(
                Customer.id == customer_id,
                Customer.is_deleted == False
            )
        ).first()
        
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        # Check if customer has active orders
        if hasattr(customer, 'orders') and not force:
            active_orders = [o for o in customer.orders if not o.is_deleted]
            if active_orders:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot delete customer with {len(active_orders)} active orders. Use force=true to override."
                )
        
        # Soft delete
        customer.is_deleted = True
        customer.updated_by = current_user.id
        customer.updated_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"User {current_user.username} deleted customer {customer_id}")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Customer deleted successfully"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting customer {customer_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete customer"
        )

@router.get("/{customer_id}/orders")
async def get_customer_orders(
    customer_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get orders for a specific customer
    """
    try:
        customer = db.query(Customer).filter(
            and_(
                Customer.id == customer_id,
                Customer.is_deleted == False
            )
        ).first()
        
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        # This would be implemented when Order model is available
        # For now, return empty list
        return {
            "customer_id": customer_id,
            "orders": [],
            "total_count": 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving orders for customer {customer_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve customer orders"
        ) 