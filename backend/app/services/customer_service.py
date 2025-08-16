"""
Customer service layer with business logic
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from uuid import UUID

from .base import BaseService, BusinessLogicService, ValidationMixin
from ..models.models import Customer, User
from ..schemas.schemas import CustomerCreate, CustomerUpdate
import logging

logger = logging.getLogger(__name__)

class CustomerService(BaseService[Customer, CustomerCreate, CustomerUpdate], 
                     BusinessLogicService, ValidationMixin):
    """Customer service with business logic"""
    
    def __init__(self):
        super().__init__(Customer)
    
    def validate_business_rules(self, data: CustomerCreate) -> bool:
        """Validate customer business rules"""
        # Customer name is required
        if not data.name or not data.name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Customer name is required"
            )
        
        # Validate email if provided
        if data.email:
            self.validate_email(data.email)
        
        # Validate phone if provided
        if data.phone:
            self.validate_phone(data.phone)
        
        # Validate GST number format if provided
        if data.gst_number:
            self.validate_gst_number(data.gst_number)
        
        return True
    
    def validate_gst_number(self, gst_number: str) -> str:
        """Validate GST number format"""
        import re
        # GST format: 15 characters, alphanumeric
        gst_pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
        if not re.match(gst_pattern, gst_number.upper()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid GST number format"
            )
        return gst_number.upper()
    
    def check_duplicate_phone(self, db: Session, phone: str, exclude_id: Optional[UUID] = None) -> bool:
        """Check if phone number already exists"""
        query = db.query(Customer).filter(
            Customer.phone == phone,
            Customer.is_deleted == False
        )
        
        if exclude_id:
            query = query.filter(Customer.id != exclude_id)
        
        return query.first() is not None
    
    def create_customer(
        self, 
        db: Session, 
        customer_data: CustomerCreate,
        current_user: User
    ) -> Customer:
        """Create a new customer with validation"""
        try:
            # Validate business rules
            self.validate_business_rules(customer_data)
            
            # Check for duplicate phone number
            if customer_data.phone and self.check_duplicate_phone(db, customer_data.phone):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone number already exists"
                )
            
            # Create customer
            customer = self.create(db, obj_in=customer_data, current_user=current_user)
            
            # Log audit event
            self.log_audit_event(
                db=db,
                action="CREATE",
                table_name="customers",
                record_id=customer.id,
                new_values=customer_data.dict(),
                user=current_user
            )
            
            logger.info(f"Customer created: {customer.name} (ID: {customer.id})")
            return customer
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating customer: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create customer"
            )
    
    def update_customer(
        self,
        db: Session,
        customer_id: UUID,
        customer_data: CustomerUpdate,
        current_user: User
    ) -> Customer:
        """Update customer with validation"""
        try:
            # Get existing customer
            customer = self.get(db, customer_id)
            if not customer:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Customer not found"
                )
            
            # Validate phone uniqueness if phone is being updated
            if customer_data.phone and customer_data.phone != customer.phone:
                if self.check_duplicate_phone(db, customer_data.phone, exclude_id=customer_id):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Phone number already exists"
                    )
            
            # Validate GST number if provided
            if customer_data.gst_number:
                customer_data.gst_number = self.validate_gst_number(customer_data.gst_number)
            
            # Store old values for audit
            old_values = {
                "name": customer.name,
                "phone": customer.phone,
                "email": customer.email,
                "address": customer.address,
                "gst_number": customer.gst_number
            }
            
            # Update customer
            updated_customer = self.update(
                db, 
                db_obj=customer, 
                obj_in=customer_data, 
                current_user=current_user
            )
            
            # Log audit event
            self.log_audit_event(
                db=db,
                action="UPDATE",
                table_name="customers",
                record_id=customer_id,
                old_values=old_values,
                new_values=customer_data.dict(exclude_unset=True),
                user=current_user
            )
            
            logger.info(f"Customer updated: {updated_customer.name} (ID: {customer_id})")
            return updated_customer
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating customer: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update customer"
            )
    
    def search_customers(
        self,
        db: Session,
        search_term: Optional[str] = None,
        skip: int = 0,
        limit: int = 20
    ) -> List[Customer]:
        """Search customers by name, phone, or email"""
        try:
            query = db.query(Customer).filter(Customer.is_deleted == False)
            
            if search_term:
                search_pattern = f"%{search_term}%"
                query = query.filter(
                    (Customer.name.ilike(search_pattern)) |
                    (Customer.phone.ilike(search_pattern)) |
                    (Customer.email.ilike(search_pattern))
                )
            
            return query.order_by(Customer.name).offset(skip).limit(limit).all()
            
        except Exception as e:
            logger.error(f"Error searching customers: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to search customers"
            )
    
    def get_customer_orders(self, db: Session, customer_id: UUID) -> List[Dict]:
        """Get customer's order summary"""
        try:
            from ..models.models import Order, OrderStatus
            
            # Get order counts by status
            order_summary = db.query(Order).filter(
                Order.customer_id == customer_id,
                Order.is_deleted == False
            ).all()
            
            summary = {
                "total_orders": len(order_summary),
                "pending_orders": len([o for o in order_summary if o.status == OrderStatus.PENDING]),
                "completed_orders": len([o for o in order_summary if o.status == OrderStatus.COMPLETED]),
                "total_value": sum(float(o.total_amount or 0) for o in order_summary),
                "recent_orders": [
                    {
                        "id": str(o.id),
                        "order_number": o.order_number,
                        "order_date": o.order_date.isoformat() if o.order_date else None,
                        "status": o.status,
                        "total_amount": float(o.total_amount or 0)
                    }
                    for o in sorted(order_summary, key=lambda x: x.order_date or '', reverse=True)[:5]
                ]
            }
            
            return summary
            
        except Exception as e:
            logger.error(f"Error getting customer orders: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get customer orders"
            )
    
    def delete_customer(
        self,
        db: Session,
        customer_id: UUID,
        current_user: User
    ) -> Customer:
        """Soft delete customer with validation"""
        try:
            # Check if customer has any orders
            from ..models.models import Order
            
            existing_orders = db.query(Order).filter(
                Order.customer_id == customer_id,
                Order.is_deleted == False
            ).first()
            
            if existing_orders:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot delete customer with existing orders"
                )
            
            # Soft delete customer
            customer = self.delete(db, id=customer_id, current_user=current_user)
            
            # Log audit event
            self.log_audit_event(
                db=db,
                action="DELETE",
                table_name="customers",
                record_id=customer_id,
                user=current_user
            )
            
            logger.info(f"Customer deleted: {customer.name} (ID: {customer_id})")
            return customer
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting customer: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete customer"
            )

# Create service instance
customer_service = CustomerService()