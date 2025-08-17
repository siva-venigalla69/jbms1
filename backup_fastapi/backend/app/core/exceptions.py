"""
Custom exception classes and error handling
"""
import logging
from typing import Any, Dict, Optional, Union
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from starlette.exceptions import HTTPException as StarletteHTTPException
import traceback

logger = logging.getLogger(__name__)

class TextilePrintingException(Exception):
    """Base exception for Textile Printing System"""
    
    def __init__(
        self,
        message: str,
        error_code: str = "GENERAL_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)

class BusinessLogicError(TextilePrintingException):
    """Raised when business logic validation fails"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "BUSINESS_LOGIC_ERROR", details)

class ValidationError(TextilePrintingException):
    """Raised when data validation fails"""
    
    def __init__(self, message: str, field: str = None, details: Optional[Dict[str, Any]] = None):
        error_details = details or {}
        if field:
            error_details["field"] = field
        super().__init__(message, "VALIDATION_ERROR", error_details)

class AuthenticationError(TextilePrintingException):
    """Raised when authentication fails"""
    
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, "AUTHENTICATION_ERROR")

class AuthorizationError(TextilePrintingException):
    """Raised when authorization fails"""
    
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message, "AUTHORIZATION_ERROR")

class ResourceNotFoundError(TextilePrintingException):
    """Raised when a requested resource is not found"""
    
    def __init__(self, resource_type: str, resource_id: str = None):
        message = f"{resource_type} not found"
        if resource_id:
            message += f" (ID: {resource_id})"
        super().__init__(message, "RESOURCE_NOT_FOUND", {"resource_type": resource_type, "resource_id": resource_id})

class DuplicateResourceError(TextilePrintingException):
    """Raised when attempting to create a duplicate resource"""
    
    def __init__(self, resource_type: str, field: str, value: str):
        message = f"{resource_type} with {field} '{value}' already exists"
        super().__init__(message, "DUPLICATE_RESOURCE", {
            "resource_type": resource_type,
            "field": field,
            "value": value
        })

class DatabaseError(TextilePrintingException):
    """Raised when database operations fail"""
    
    def __init__(self, message: str = "Database operation failed", original_error: Exception = None):
        details = {}
        if original_error:
            details["original_error"] = str(original_error)
            details["error_type"] = type(original_error).__name__
        super().__init__(message, "DATABASE_ERROR", details)

class ServiceUnavailableError(TextilePrintingException):
    """Raised when a service is temporarily unavailable"""
    
    def __init__(self, service_name: str, message: str = None):
        default_message = f"{service_name} service is temporarily unavailable"
        super().__init__(message or default_message, "SERVICE_UNAVAILABLE", {"service": service_name})

def create_error_response(
    request_id: str,
    error_code: str,
    message: str,
    details: Optional[Dict[str, Any]] = None,
    status_code: int = 500
) -> Dict[str, Any]:
    """Create a standardized error response"""
    
    response = {
        "error": {
            "code": error_code,
            "message": message,
            "request_id": request_id,
            "timestamp": "NOW()"  # Will be replaced with actual timestamp
        }
    }
    
    if details:
        response["error"]["details"] = details
    
    # Add debug info in development
    from .config import settings
    if settings.DEBUG and details:
        response["debug"] = details
    
    return response

def get_request_id(request: Request) -> str:
    """Get or generate request ID for tracing"""
    return getattr(request.state, 'request_id', str(id(request)))

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with detailed messages"""
    request_id = get_request_id(request)
    
    errors = []
    for error in exc.errors():
        field_path = " -> ".join(str(loc) for loc in error["loc"])
        error_msg = error["msg"]
        error_type = error.get("type", "validation_error")
        
        errors.append({
            "field": field_path,
            "message": error_msg,
            "type": error_type,
            "input": error.get("input")
        })
    
    logger.warning(f"Validation error on {request.url.path}: {errors}", extra={"request_id": request_id})
    
    response_data = create_error_response(
        request_id=request_id,
        error_code="VALIDATION_ERROR",
        message="Request validation failed",
        details={"validation_errors": errors},
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=response_data
    )

async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions with consistent format"""
    request_id = get_request_id(request)
    
    logger.warning(
        f"HTTP {exc.status_code} on {request.url.path}: {exc.detail}",
        extra={"request_id": request_id, "status_code": exc.status_code}
    )
    
    # Map common HTTP status codes to user-friendly messages
    user_messages = {
        400: "Bad request. Please check your input.",
        401: "Authentication required. Please log in.",
        403: "Access denied. You don't have permission for this action.",
        404: "The requested resource was not found.",
        405: "Method not allowed for this endpoint.",
        409: "Conflict. The resource already exists or is in use.",
        422: "Invalid data provided. Please check your input.",
        429: "Too many requests. Please slow down.",
        500: "Internal server error. Please try again later.",
        502: "Service temporarily unavailable. Please try again later.",
        503: "Service temporarily unavailable. Please try again later."
    }
    
    user_message = user_messages.get(exc.status_code, str(exc.detail))
    
    response_data = create_error_response(
        request_id=request_id,
        error_code=f"HTTP_{exc.status_code}",
        message=user_message,
        status_code=exc.status_code
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=response_data
    )

async def database_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle database errors"""
    request_id = get_request_id(request)
    
    # Log detailed error for debugging
    logger.error(
        f"Database error on {request.url.path}: {str(exc)}",
        extra={"request_id": request_id},
        exc_info=True
    )
    
    # Determine error type and message
    if isinstance(exc, IntegrityError):
        error_code = "DATABASE_CONSTRAINT_ERROR"
        user_message = "Data constraint violation. Please check for duplicate or invalid data."
        status_code = status.HTTP_409_CONFLICT
    else:
        error_code = "DATABASE_ERROR"
        user_message = "Database operation failed. Please try again."
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    
    response_data = create_error_response(
        request_id=request_id,
        error_code=error_code,
        message=user_message,
        status_code=status_code
    )
    
    return JSONResponse(
        status_code=status_code,
        content=response_data
    )

async def textile_printing_exception_handler(request: Request, exc: TextilePrintingException):
    """Handle custom application exceptions"""
    request_id = get_request_id(request)
    
    # Map error codes to HTTP status codes
    status_code_map = {
        "BUSINESS_LOGIC_ERROR": status.HTTP_400_BAD_REQUEST,
        "VALIDATION_ERROR": status.HTTP_422_UNPROCESSABLE_ENTITY,
        "AUTHENTICATION_ERROR": status.HTTP_401_UNAUTHORIZED,
        "AUTHORIZATION_ERROR": status.HTTP_403_FORBIDDEN,
        "RESOURCE_NOT_FOUND": status.HTTP_404_NOT_FOUND,
        "DUPLICATE_RESOURCE": status.HTTP_409_CONFLICT,
        "DATABASE_ERROR": status.HTTP_500_INTERNAL_SERVER_ERROR,
        "SERVICE_UNAVAILABLE": status.HTTP_503_SERVICE_UNAVAILABLE,
        "GENERAL_ERROR": status.HTTP_500_INTERNAL_SERVER_ERROR
    }
    
    status_code = status_code_map.get(exc.error_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Log based on severity
    if status_code >= 500:
        logger.error(
            f"Application error on {request.url.path}: {exc.message}",
            extra={"request_id": request_id, "error_code": exc.error_code},
            exc_info=True
        )
    else:
        logger.warning(
            f"Application error on {request.url.path}: {exc.message}",
            extra={"request_id": request_id, "error_code": exc.error_code}
        )
    
    response_data = create_error_response(
        request_id=request_id,
        error_code=exc.error_code,
        message=exc.message,
        details=exc.details,
        status_code=status_code
    )
    
    return JSONResponse(
        status_code=status_code,
        content=response_data
    )

async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected errors"""
    request_id = get_request_id(request)
    
    # Log full traceback for debugging
    logger.error(
        f"Unexpected error on {request.url.path}: {str(exc)}",
        extra={"request_id": request_id, "error_type": type(exc).__name__},
        exc_info=True
    )
    
    # Show detailed error in debug mode only
    from .config import settings
    if settings.DEBUG:
        details = {
            "error_type": type(exc).__name__,
            "error_message": str(exc),
            "traceback": traceback.format_exc()
        }
        user_message = f"Unexpected error: {str(exc)}"
    else:
        details = None
        user_message = "An unexpected error occurred. Please contact support if the problem persists."
    
    response_data = create_error_response(
        request_id=request_id,
        error_code="UNEXPECTED_ERROR",
        message=user_message,
        details=details,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=response_data
    )

def setup_exception_handlers(app):
    """Setup all exception handlers for the FastAPI app"""
    
    # Custom application exceptions
    app.add_exception_handler(TextilePrintingException, textile_printing_exception_handler)
    
    # Validation errors
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    
    # HTTP exceptions
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    
    # Database errors
    app.add_exception_handler(SQLAlchemyError, database_exception_handler)
    
    # General exceptions (must be last)
    app.add_exception_handler(Exception, general_exception_handler)