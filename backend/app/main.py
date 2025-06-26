import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.gzip import GZipMiddleware
from sqlalchemy.exc import SQLAlchemyError
from .core.config import settings, get_cors_config, get_security_headers
from .core.database import engine, Base
from .api import auth, customers, challans, invoices, inventory, payments, materials, orders

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(settings.LOG_FILE) if settings.LOG_FILE else logging.NullHandler()
    ]
)

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    
    try:
        # Create database tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {str(e)}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down application")

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="A comprehensive full-stack application for managing digital textile printing operations",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None
)

# Add security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to responses"""
    response = await call_next(request)
    
    security_headers = get_security_headers()
    for header, value in security_headers.items():
        response.headers[header] = value
    
    return response

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests with timing"""
    start_time = time.time()
    
    # Log request
    logger.info(f"{request.method} {request.url.path} - Client: {request.client.host if request.client else 'Unknown'}")
    
    response = await call_next(request)
    
    # Log response with timing
    process_time = time.time() - start_time
    logger.info(f"{request.method} {request.url.path} - Status: {response.status_code} - Time: {process_time:.4f}s")
    
    return response

# Add rate limiting middleware (basic implementation)
request_counts = {}

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Basic rate limiting middleware"""
    if not settings.RATE_LIMIT_ENABLED:
        return await call_next(request)
    
    client_ip = request.client.host if request.client else "unknown"
    current_time = time.time()
    
    # Clean old entries
    request_counts[client_ip] = [
        req_time for req_time in request_counts.get(client_ip, [])
        if current_time - req_time < settings.RATE_LIMIT_WINDOW
    ]
    
    # Check rate limit
    if len(request_counts.get(client_ip, [])) >= settings.RATE_LIMIT_REQUESTS:
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Rate limit exceeded. Please try again later."}
        )
    
    # Add current request
    request_counts.setdefault(client_ip, []).append(current_time)
    
    return await call_next(request)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    **get_cors_config()
)

# Add compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Add trusted host middleware for production
if settings.ENVIRONMENT == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*.onrender.com", "*.netlify.app"]  # Update with your domains
    )

# Custom exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with detailed messages"""
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"])
        message = error["msg"]
        errors.append(f"{field}: {message}")
    
    logger.warning(f"Validation error on {request.url.path}: {errors}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation failed",
            "errors": errors,
            "request_id": id(request)
        }
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions with consistent format"""
    logger.warning(f"HTTP {exc.status_code} on {request.url.path}: {exc.detail}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "status_code": exc.status_code,
            "request_id": id(request)
        }
    )

@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle database errors"""
    logger.error(f"Database error on {request.url.path}: {str(exc)}")
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Database error occurred. Please try again later.",
            "request_id": id(request)
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected errors"""
    logger.error(f"Unexpected error on {request.url.path}: {str(exc)}", exc_info=True)
    
    response = JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected error occurred. Please contact support if the problem persists.",
            "request_id": id(request)
        }
    )
    
    # Ensure CORS headers are added even for 500 errors
    origin = request.headers.get("origin")
    if origin and origin in settings.ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    
    return response

# Health check endpoints
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "environment": settings.ENVIRONMENT,
        "version": settings.APP_VERSION
    }

@app.get("/health/db", tags=["Health"])
async def database_health_check():
    """Database health check"""
    try:
        from .core.database import get_db
        db = next(get_db())
        db.execute("SELECT 1")
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": time.time()
        }
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed"
        )

# API version info
@app.get("/version", tags=["Info"])
async def get_version():
    """Get application version and build info"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "debug": settings.DEBUG,
        "timestamp": time.time()
    }

# Add after the health endpoint
@app.get("/debug/enum-check")
async def debug_enum_check():
    """Debug endpoint to check deployed enum values"""
    from .models.models import UserRole
    import time
    return {
        "app_version": "1.0.2",
        "user_role_values": [role.value for role in UserRole],
        "user_role_admin": UserRole.ADMIN.value,
        "timestamp": time.time(),
        "deployment_status": "string_column_fix_applied",
        "fix_description": "Changed role column from Enum to String to avoid SQLAlchemy metadata cache issues"
    }

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(challans.router, prefix="/api")
app.include_router(invoices.router, prefix="/api")
app.include_router(inventory.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(materials.router, prefix="/api")
app.include_router(orders.router, prefix="/api")

# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information"""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "docs": "/docs" if settings.DEBUG else "Documentation not available in production",
        "health": "/health"
    }

# Catch-all endpoint for unmatched routes
@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def catch_all(request: Request, path: str):
    """Catch-all endpoint for undefined routes"""
    logger.warning(f"Undefined route accessed: {request.method} /{path}")
    
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "detail": f"Endpoint not found: {request.method} /{path}",
            "available_endpoints": [
                "/docs",
                "/health", 
                "/api/auth/login",
                "/api/customers",
                "/api/orders",
                "/api/challans",
                "/api/invoices",
                "/api/payments",
                "/api/inventory",
                "/api/materials"
            ] if settings.DEBUG else "Contact support for available endpoints"
        }
    ) 