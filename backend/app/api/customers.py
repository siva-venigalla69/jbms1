import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from uuid import UUID

from ..core.database import get_db
from ..core.security import get_current_active_user
from ..models.models import User, Customer
from ..schemas.schemas import CustomerCreate, CustomerUpdate, CustomerResponse, CustomerSearchResponse
from ..services.customer_service import customer_service
from datetime import datetime

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/customers", tags=["Customer Management"])

@router.get("/", response_model=List[CustomerResponse])
async def list_customers(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Number of records to return"),
    search: Optional[str] = Query(None, description="Search by name, phone, or email"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve customers with pagination and search
    """
    try:
        if search:
            customers = customer_service.search_customers(db, search, skip, limit)
        else:
            customers = customer_service.get_multi(db, skip=skip, limit=limit)
        
        # Convert to response format
        response_data = []
        for customer in customers:
            customer_dict = {
                "id": str(customer.id),
                "name": customer.name,
                "phone": customer.phone,
                "email": customer.email,
                "address": customer.address,
                "gst_number": customer.gst_number,
                "created_at": customer.created_at,
                "updated_at": customer.updated_at
            }
            response_data.append(customer_dict)
        
        logger.info(f"User {current_user.username} retrieved {len(customers)} customers")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving customers: {str(e)}", exc_info=True)
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
                "id": str(customer.id),  # Ensure UUID is converted to string
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
        logger.error(f"Error searching customers: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)[:100]}"
        )

@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_data: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new customer with validation
    """
    try:
        customer = customer_service.create_customer(db, customer_data, current_user)
        
        # Convert to response format
        customer_response = {
            "id": str(customer.id),
            "name": customer.name,
            "phone": customer.phone,
            "email": customer.email,
            "address": customer.address,
            "gst_number": customer.gst_number,
            "created_at": customer.created_at,
            "updated_at": customer.updated_at
        }
        
        return customer_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating customer: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create customer"
        )

@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,  # UUID as string
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
        
        # Convert to response format manually to avoid Pydantic issues
        customer_data = {
            "id": str(customer.id),
            "name": customer.name,
            "phone": customer.phone,
            "email": customer.email,
            "address": customer.address,
            "gst_number": customer.gst_number,
            "created_at": customer.created_at,
            "updated_at": customer.updated_at
        }
        
        # Add statistics if requested
        if include_stats and hasattr(customer, 'orders'):
            try:
                order_count = len([o for o in customer.orders if not o.is_deleted])
                total_order_value = sum(
                    o.total_amount for o in customer.orders 
                    if not o.is_deleted and o.total_amount
                )
                customer_data["order_count"] = order_count
                customer_data["total_order_value"] = float(total_order_value)
            except Exception as stats_error:
                logger.warning(f"Error calculating customer stats: {stats_error}")
                # Continue without stats rather than failing
        
        logger.info(f"User {current_user.username} viewed customer {customer_id}")
        return customer_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving customer {customer_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve customer: {str(e)[:100]}"
        )

@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: str,  # UUID as string
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
        
        customer.updated_by_user_id = current_user.id
        # updated_at will be automatically updated by the database trigger
        
        db.commit()
        db.refresh(customer)
        
        # Convert to response format manually to avoid Pydantic issues
        customer_data = {
            "id": str(customer.id),
            "name": customer.name,
            "phone": customer.phone,
            "email": customer.email,
            "address": customer.address,
            "gst_number": customer.gst_number,
            "created_at": customer.created_at,
            "updated_at": customer.updated_at
        }
        
        logger.info(f"User {current_user.username} updated customer {customer_id}")
        return customer_data
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating customer {customer_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update customer: {str(e)[:100]}"
        )

@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: str,  # UUID as string
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
        customer.updated_by_user_id = current_user.id
        # updated_at will be automatically updated by the database trigger
        
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
        logger.error(f"Error deleting customer {customer_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete customer: {str(e)[:100]}"
        )

@router.get("/{customer_id}/orders")
async def get_customer_orders(
    customer_id: str,  # UUID as string
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