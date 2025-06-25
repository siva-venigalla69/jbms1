import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from .config import settings

# Configure logging
logger = logging.getLogger(__name__)

# Password hashing context with improved configuration
pwd_context = CryptContext(
    schemes=["bcrypt"], 
    deprecated="auto",
    bcrypt__rounds=12  # Increased rounds for better security
)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash with input validation
    
    Args:
        plain_password: The plain text password
        hashed_password: The hashed password to verify against
        
    Returns:
        bool: True if password matches, False otherwise
        
    Raises:
        ValueError: If inputs are invalid
    """
    if not plain_password or not hashed_password:
        logger.warning("Password verification attempted with empty values")
        return False
    
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Password verification error: {str(e)}")
        return False

def get_password_hash(password: str) -> str:
    """
    Hash a password with input validation
    
    Args:
        password: The password to hash
        
    Returns:
        str: The hashed password
        
    Raises:
        ValueError: If password is invalid
    """
    if not password:
        raise ValueError("Password cannot be empty")
    
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    
    try:
        return pwd_context.hash(password)
    except Exception as e:
        logger.error(f"Password hashing error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password hashing failed"
        )

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT access token with enhanced security
    
    Args:
        data: The data to encode in the token
        expires_delta: Optional custom expiration time
        
    Returns:
        str: The encoded JWT token
        
    Raises:
        HTTPException: If token creation fails
    """
    if not data.get("sub"):
        raise ValueError("Token data must contain 'sub' field")
    
    to_encode = data.copy()
    
    # Set expiration
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Add additional security claims
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),  # Issued at
        "iss": "textile-printing-system",  # Issuer
        "type": "access_token"  # Token type
    })
    
    try:
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        logger.info(f"Access token created for user: {data.get('sub')}")
        return encoded_jwt
    except Exception as e:
        logger.error(f"Token creation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token creation failed"
        )

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify and decode JWT token with enhanced validation
    
    Args:
        token: The JWT token to verify
        
    Returns:
        Optional[Dict[str, Any]]: The decoded payload or None if invalid
    """
    if not token:
        logger.warning("Token verification attempted with empty token")
        return None
    
    try:
        # Decode and verify token
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": True, "verify_iat": True}
        )
        
        # Validate required claims
        username = payload.get("sub")
        token_type = payload.get("type")
        issuer = payload.get("iss")
        
        if not username:
            logger.warning("Token missing 'sub' claim")
            return None
            
        if token_type != "access_token":
            logger.warning(f"Invalid token type: {token_type}")
            return None
            
        if issuer != "textile-printing-system":
            logger.warning(f"Invalid token issuer: {issuer}")
            return None
        
        return payload
        
    except jwt.ExpiredSignatureError:
        logger.info(f"Expired token attempted for verification")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        return None

def validate_password_strength(password: str) -> Dict[str, Any]:
    """
    Validate password strength and return requirements
    
    Args:
        password: The password to validate
        
    Returns:
        Dict containing validation results
    """
    requirements = {
        "min_length": len(password) >= 8,
        "has_uppercase": any(c.isupper() for c in password),
        "has_lowercase": any(c.islower() for c in password),
        "has_digit": any(c.isdigit() for c in password),
        "has_special": any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password),
        "is_valid": False
    }
    
    # Password is valid if it meets minimum requirements
    requirements["is_valid"] = (
        requirements["min_length"] and
        requirements["has_lowercase"] and
        (requirements["has_uppercase"] or requirements["has_digit"])
    )
    
    return requirements 