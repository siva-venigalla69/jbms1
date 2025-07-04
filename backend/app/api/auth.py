from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.security import verify_password, create_access_token, verify_token, get_password_hash
from ..core.config import settings
from ..models.models import User
from ..schemas.schemas import Token, UserResponse, UserCreate, LoginRequest
import logging
import traceback

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        logger.info(f"Getting current user from token: {token[:20]}...")
        
        payload = verify_token(token)
        logger.info(f"Token payload: {payload}")
        
        if payload is None:
            logger.warning("Token verification returned None")
            raise credentials_exception
        
        username: str = payload.get("sub")
        if username is None:
            logger.warning("No username in token payload")
            raise credentials_exception
        
        logger.info(f"Looking up user: {username}")
        user = db.query(User).filter(User.username == username).first()
        logger.info(f"User lookup result: {'Found' if user else 'Not found'}")
        
        if user is None:
            logger.warning(f"User {username} not found in database")
            raise credentials_exception
        
        logger.info(f"Successfully retrieved user: {user.username}, active: {user.is_active}")
        return user
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_current_user: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        # Return 500 error instead of 401 for debugging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication error: {str(e)}"
        )

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

@router.post("/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Authenticate user and return access token"""
    try:
        logger.info(f"Login attempt for username: {form_data.username}")
        
        # Query user
        user = db.query(User).filter(User.username == form_data.username).first()
        logger.info(f"User query result: {'Found' if user else 'Not found'}")
        
        if not user:
            logger.info(f"User {form_data.username} not found in database")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Log user details (safely)
        logger.info(f"User found - ID: {user.id}, Active: {user.is_active}, Role: {user.role}")
        logger.info(f"Password hash exists: {bool(user.password_hash)}")
        logger.info(f"Password hash length: {len(user.password_hash) if user.password_hash else 0}")
        
        # Verify password
        logger.info("Starting password verification")
        password_valid = verify_password(form_data.password, user.password_hash)
        logger.info(f"Password verification result: {password_valid}")
        
        if not password_valid:
            logger.info(f"Password verification failed for user: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if user is active
        if not user.is_active:
            logger.info(f"User {form_data.username} is inactive")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        
        # Create access token
        logger.info("Creating access token")
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        logger.info("Access token created successfully")
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except HTTPException:
        # Re-raise HTTP exceptions (401, 400) 
        raise
    except Exception as e:
        # Log and handle unexpected errors
        logger.error(f"Unexpected error during login: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during authentication: {str(e)}"
        )

@router.post("/register", response_model=UserResponse)
async def register_user(user_data: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Register a new user (Admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can create new users"
        )
    
    # Check if username already exists
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
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
    
    return db_user

@router.get("/me")  # Removed response_model=UserResponse temporarily
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    # Return raw data to avoid Pydantic serialization issues temporarily
    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,  # Raw string value
        "is_active": current_user.is_active,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "updated_at": current_user.updated_at.isoformat() if current_user.updated_at else None
    }

@router.get("/users", response_model=list[UserResponse])
async def list_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """List all users (Admin and Manager only)"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    users = db.query(User).all()
    return users 

@router.get("/debug/token")
async def debug_token(token: str = Depends(oauth2_scheme)):
    """Debug endpoint to test token verification"""
    try:
        logger.info(f"Debug token endpoint called with token: {token[:20]}...")
        
        payload = verify_token(token)
        logger.info(f"Token verification result: {payload}")
        
        return {
            "token_valid": payload is not None,
            "payload": payload,
            "username": payload.get("sub") if payload else None
        }
    except Exception as e:
        logger.error(f"Debug token error: {str(e)}")
        return {
            "error": str(e),
            "token_valid": False
        }

@router.get("/debug/user")
async def debug_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Debug endpoint to test user lookup and serialization"""
    try:
        logger.info(f"Debug user endpoint called with token: {token[:20]}...")
        
        payload = verify_token(token)
        if payload is None:
            return {"error": "Invalid token"}
        
        username: str = payload.get("sub")
        logger.info(f"Looking up user: {username}")
        
        user = db.query(User).filter(User.username == username).first()
        if user is None:
            return {"error": "User not found"}
        
        # Return raw user data without pydantic serialization
        return {
            "user_found": True,
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,  # This might be causing the issue
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None
        }
    except Exception as e:
        logger.error(f"Debug user error: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {
            "error": str(e),
            "traceback": traceback.format_exc()
        }

@router.get("/debug/simple-test")
async def simple_test():
    """Simple test endpoint with no dependencies"""
    return {"message": "Simple test works", "status": "ok"}

@router.get("/debug/auth-test")
async def auth_test(token: str = Depends(oauth2_scheme)):
    """Test endpoint with only token dependency (no DB or User lookup)"""
    try:
        payload = verify_token(token)
        return {
            "message": "Token verification works",
            "payload": payload,
            "status": "ok"
        }
    except Exception as e:
        return {
            "error": str(e),
            "status": "error"
        } 