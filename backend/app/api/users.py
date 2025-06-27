import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from ..core.database import get_db
from ..core.security import get_current_active_user, get_password_hash
from ..models.models import User, UserRole
from ..schemas.schemas import UserCreate, UserUpdate, UserResponse
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["User Management"])

@router.get("/", response_model=List[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    role: Optional[str] = Query(None),
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List users with filtering"""
    try:
        # Only admin and manager can list users
        if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        query = db.query(User)
        
        if active_only:
            query = query.filter(User.is_active == True)
        
        if role:
            query = query.filter(User.role == role)
        
        users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
        
        logger.info(f"User {current_user.username} retrieved {len(users)} users")
        return users
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving users: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve users")

@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create new user"""
    try:
        # Only admin can create users
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Only admin can create users")
        
        # Check if username or email already exists
        existing_user = db.query(User).filter(
            (User.username == user_data.username) | (User.email == user_data.email)
        ).first()
        
        if existing_user:
            if existing_user.username == user_data.username:
                raise HTTPException(status_code=400, detail="Username already exists")
            else:
                raise HTTPException(status_code=400, detail="Email already exists")
        
        # Create user
        hashed_password = get_password_hash(user_data.password)
        db_user = User(
            username=user_data.username,
            email=user_data.email,
            full_name=user_data.full_name,
            password_hash=hashed_password,
            role=user_data.role,
            is_active=user_data.is_active
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        logger.info(f"Admin {current_user.username} created user {db_user.username}")
        return db_user
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create user")

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get user by ID"""
    try:
        # Users can view their own profile, admin/manager can view any
        if (str(current_user.id) != user_id and 
            current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user")

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update user"""
    try:
        # Users can update their own profile (limited), admin can update any
        is_self_update = str(current_user.id) == user_id
        is_admin = current_user.role == UserRole.ADMIN
        
        if not (is_self_update or is_admin):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Regular users can only update their own profile and limited fields
        if is_self_update and not is_admin:
            # Users can only update their own email and full_name
            if user_update.username is not None or user_update.role is not None:
                raise HTTPException(status_code=403, detail="Cannot modify username or role")
        
        # Update fields
        if user_update.username is not None:
            # Check username uniqueness
            existing = db.query(User).filter(
                and_(User.username == user_update.username, User.id != user_id)
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="Username already exists")
            user.username = user_update.username
        
        if user_update.email is not None:
            # Check email uniqueness
            existing = db.query(User).filter(
                and_(User.email == user_update.email, User.id != user_id)
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="Email already exists")
            user.email = user_update.email
        
        if user_update.full_name is not None:
            user.full_name = user_update.full_name
        
        if user_update.role is not None:
            user.role = user_update.role
        
        if user_update.is_active is not None:
            user.is_active = user_update.is_active
        
        user.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(user)
        
        logger.info(f"User {current_user.username} updated user {user.username}")
        return user
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update user")

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete/deactivate user"""
    try:
        # Only admin can delete users
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Only admin can delete users")
        
        # Prevent self-deletion
        if str(current_user.id) == user_id:
            raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Soft delete - just deactivate
        user.is_active = False
        user.updated_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"Admin {current_user.username} deleted user {user.username}")
        return {"message": "User deactivated successfully"}
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete user")

@router.get("/profile/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's profile"""
    return current_user 