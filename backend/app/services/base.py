"""
Base service classes for common operations
"""
from abc import ABC, abstractmethod
from typing import Type, TypeVar, Generic, Optional, List, Any, Dict
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException, status
from ..core.database import Base
from ..models.models import User
import logging

logger = logging.getLogger(__name__)

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")

class BaseService(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """Base service class with common CRUD operations"""
    
    def __init__(self, model: Type[ModelType]):
        self.model = model
    
    def get(self, db: Session, id: Any) -> Optional[ModelType]:
        """Get a single record by ID"""
        try:
            return db.query(self.model).filter(self.model.id == id).first()
        except SQLAlchemyError as e:
            logger.error(f"Database error in get: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error occurred"
            )
    
    def get_multi(
        self, 
        db: Session, 
        *, 
        skip: int = 0, 
        limit: int = 100,
        filters: Dict[str, Any] = None
    ) -> List[ModelType]:
        """Get multiple records with pagination and filters"""
        try:
            query = db.query(self.model)
            
            # Apply filters
            if filters:
                for field, value in filters.items():
                    if hasattr(self.model, field) and value is not None:
                        query = query.filter(getattr(self.model, field) == value)
            
            # Apply soft delete filter if model has is_deleted field
            if hasattr(self.model, 'is_deleted'):
                query = query.filter(self.model.is_deleted == False)
            
            return query.offset(skip).limit(limit).all()
        except SQLAlchemyError as e:
            logger.error(f"Database error in get_multi: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error occurred"
            )
    
    def create(
        self, 
        db: Session, 
        *, 
        obj_in: CreateSchemaType,
        current_user: Optional[User] = None
    ) -> ModelType:
        """Create a new record"""
        try:
            obj_in_data = obj_in.dict() if hasattr(obj_in, 'dict') else obj_in
            
            # Add audit fields if model supports them
            if hasattr(self.model, 'created_by_user_id') and current_user:
                obj_in_data['created_by_user_id'] = current_user.id
            
            db_obj = self.model(**obj_in_data)
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            
            logger.info(f"Created {self.model.__name__} with ID: {db_obj.id}")
            return db_obj
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Database error in create: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create record"
            )
    
    def update(
        self,
        db: Session,
        *,
        db_obj: ModelType,
        obj_in: UpdateSchemaType,
        current_user: Optional[User] = None
    ) -> ModelType:
        """Update an existing record"""
        try:
            obj_data = obj_in.dict(exclude_unset=True) if hasattr(obj_in, 'dict') else obj_in
            
            # Add audit fields if model supports them
            if hasattr(self.model, 'updated_by_user_id') and current_user:
                obj_data['updated_by_user_id'] = current_user.id
            
            for field, value in obj_data.items():
                if hasattr(db_obj, field):
                    setattr(db_obj, field, value)
            
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            
            logger.info(f"Updated {self.model.__name__} with ID: {db_obj.id}")
            return db_obj
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Database error in update: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update record"
            )
    
    def delete(
        self, 
        db: Session, 
        *, 
        id: Any,
        current_user: Optional[User] = None,
        soft_delete: bool = True
    ) -> ModelType:
        """Delete a record (soft delete by default)"""
        try:
            obj = db.query(self.model).filter(self.model.id == id).first()
            if not obj:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"{self.model.__name__} not found"
                )
            
            if soft_delete and hasattr(self.model, 'is_deleted'):
                obj.is_deleted = True
                if hasattr(self.model, 'updated_by_user_id') and current_user:
                    obj.updated_by_user_id = current_user.id
                db.add(obj)
            else:
                db.delete(obj)
            
            db.commit()
            logger.info(f"Deleted {self.model.__name__} with ID: {id}")
            return obj
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Database error in delete: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete record"
            )
    
    def count(self, db: Session, filters: Dict[str, Any] = None) -> int:
        """Count records with optional filters"""
        try:
            query = db.query(self.model)
            
            # Apply filters
            if filters:
                for field, value in filters.items():
                    if hasattr(self.model, field) and value is not None:
                        query = query.filter(getattr(self.model, field) == value)
            
            # Apply soft delete filter if model has is_deleted field
            if hasattr(self.model, 'is_deleted'):
                query = query.filter(self.model.is_deleted == False)
            
            return query.count()
        except SQLAlchemyError as e:
            logger.error(f"Database error in count: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error occurred"
            )
    
    def exists(self, db: Session, id: Any) -> bool:
        """Check if record exists"""
        try:
            query = db.query(self.model).filter(self.model.id == id)
            if hasattr(self.model, 'is_deleted'):
                query = query.filter(self.model.is_deleted == False)
            return query.first() is not None
        except SQLAlchemyError as e:
            logger.error(f"Database error in exists: {str(e)}")
            return False

class BusinessLogicService(ABC):
    """Abstract base class for business logic services"""
    
    @abstractmethod
    def validate_business_rules(self, data: Any) -> bool:
        """Validate business-specific rules"""
        pass
    
    def log_audit_event(
        self,
        db: Session,
        action: str,
        table_name: str,
        record_id: str,
        old_values: Dict = None,
        new_values: Dict = None,
        user: User = None
    ):
        """Log audit events for important business operations"""
        try:
            from ..models.models import AuditLog
            import json
            
            audit_log = AuditLog(
                table_name=table_name,
                record_id=str(record_id),
                action=action,
                old_values=json.dumps(old_values) if old_values else None,
                new_values=json.dumps(new_values) if new_values else None,
                changed_by_user_id=user.id if user else None
            )
            
            db.add(audit_log)
            db.commit()
            logger.info(f"Audit log created: {action} on {table_name}:{record_id}")
        except Exception as e:
            logger.error(f"Failed to create audit log: {str(e)}")

class ValidationMixin:
    """Mixin for common validation operations"""
    
    def validate_uuid(self, value: str) -> UUID:
        """Validate and convert string to UUID"""
        try:
            return UUID(value)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid UUID format"
            )
    
    def validate_positive_number(self, value: float, field_name: str) -> float:
        """Validate that a number is positive"""
        if value <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{field_name} must be positive"
            )
        return value
    
    def validate_email(self, email: str) -> str:
        """Basic email validation"""
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )
        return email.lower()
    
    def validate_phone(self, phone: str) -> str:
        """Basic phone number validation"""
        import re
        # Remove all non-digit characters
        clean_phone = re.sub(r'\D', '', phone)
        if len(clean_phone) < 10 or len(clean_phone) > 15:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid phone number format"
            )
        return clean_phone