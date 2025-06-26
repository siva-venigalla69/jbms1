import os
import secrets
from typing import List, Optional
from pydantic import BaseSettings, Field, validator
import logging

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    """Application settings with enhanced security and validation"""
    
    # Database Configuration
    DATABASE_URL: str = Field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL", 
            "postgresql://user:password@localhost:5432/textile_printing_db"
        ),
        description="Database connection URL"
    )
    
    # Security Configuration
    SECRET_KEY: str = Field(
        default_factory=lambda: os.getenv("SECRET_KEY", secrets.token_urlsafe(32)),
        min_length=32,
        description="Secret key for JWT tokens (minimum 32 characters)"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30,
        ge=5,
        le=1440,  # Max 24 hours
        description="Access token expiration time in minutes"
    )
    
    # Application Configuration
    ENVIRONMENT: str = Field(
        default="development",
        regex="^(development|staging|production)$",
        description="Application environment"
    )
    DEBUG: bool = Field(
        default_factory=lambda: os.getenv("DEBUG", "true").lower() == "true"
    )
    APP_NAME: str = "Digital Textile Printing System"
    APP_VERSION: str = "1.0.2"
    
    # Security Headers
    ENABLE_SECURITY_HEADERS: bool = True
    SECURE_COOKIES: bool = Field(
        default_factory=lambda: os.getenv("ENVIRONMENT", "development") == "production"
    )
    
    # CORS Configuration
    ALLOWED_ORIGINS: List[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            os.getenv("FRONTEND_URL", "https://your-app.netlify.app")
        ]
    )
    ALLOWED_METHODS: List[str] = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    ALLOWED_HEADERS: List[str] = ["*"]
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = Field(
        default_factory=lambda: os.getenv("ENVIRONMENT", "development") == "production"
    )
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds
    
    # Email Configuration (for future use)
    SMTP_HOST: Optional[str] = Field(default=None)
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = Field(default=None)
    SMTP_PASSWORD: Optional[str] = Field(default=None)
    SMTP_TLS: bool = True
    
    # File Upload Configuration
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5MB
    ALLOWED_UPLOAD_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png", ".pdf", ".xlsx"]
    UPLOAD_PATH: str = Field(
        default_factory=lambda: os.getenv("UPLOAD_PATH", "./uploads")
    )
    
    # Report Configuration
    REPORTS_EXPORT_PATH: str = Field(
        default_factory=lambda: os.getenv("REPORTS_EXPORT_PATH", "./exports")
    )
    MAX_REPORT_RECORDS: int = Field(
        default=10000,
        ge=100,
        le=100000,
        description="Maximum records in a single report"
    )
    
    # Pagination Configuration
    DEFAULT_PAGE_SIZE: int = Field(default=20, ge=5, le=100)
    MAX_PAGE_SIZE: int = Field(default=100, ge=10, le=1000)
    
    # Logging Configuration
    LOG_LEVEL: str = Field(
        default="INFO",
        regex="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$"
    )
    LOG_FILE: Optional[str] = Field(default=None)
    
    # Database Connection Pool
    DB_POOL_SIZE: int = Field(default=5, ge=1, le=20)
    DB_POOL_OVERFLOW: int = Field(default=10, ge=0, le=30)
    DB_POOL_TIMEOUT: int = Field(default=30, ge=5, le=300)
    
    @validator('SECRET_KEY')
    def validate_secret_key(cls, v, values):
        if values.get('ENVIRONMENT') == 'production' and len(v) < 32:
            raise ValueError('SECRET_KEY must be at least 32 characters in production')
        return v
    
    @validator('DATABASE_URL')
    def validate_database_url(cls, v, values):
        if values.get('ENVIRONMENT') == 'production':
            if 'localhost' in v or '127.0.0.1' in v:
                raise ValueError('DATABASE_URL cannot use localhost in production')
        return v
    
    @validator('ALLOWED_ORIGINS')
    def validate_cors_origins(cls, v, values):
        if values.get('ENVIRONMENT') == 'production':
            # Remove localhost URLs in production
            v = [url for url in v if 'localhost' not in url and '127.0.0.1' not in url]
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Create settings instance
try:
    settings = Settings()
    
    # Production environment validation
    if settings.ENVIRONMENT == "production":
        if settings.SECRET_KEY == "change-this-secret-key-in-production":
            raise ValueError("SECRET_KEY must be set in production environment")
        
        if not settings.DATABASE_URL or "localhost" in settings.DATABASE_URL:
            raise ValueError("DATABASE_URL must be set to production database")
        
        # Ensure secure configuration in production
        if not settings.SECURE_COOKIES:
            logger.warning("Secure cookies disabled in production")
        
        if settings.DEBUG:
            logger.warning("Debug mode enabled in production")
    
    logger.info(f"Settings loaded for environment: {settings.ENVIRONMENT}")
    
except Exception as e:
    logger.error(f"Settings validation failed: {str(e)}")
    raise

# Environment-specific configurations
def get_database_url() -> str:
    """Get database URL with connection parameters"""
    url = settings.DATABASE_URL
    if not url.startswith(('postgresql://', 'postgresql+psycopg2://')):
        if url.startswith('postgres://'):
            # Fix for Heroku/Render postgres URLs
            url = url.replace('postgres://', 'postgresql://', 1)
    return url

def get_cors_config() -> dict:
    """Get CORS configuration"""
    return {
        "allow_origins": settings.ALLOWED_ORIGINS,
        "allow_credentials": True,
        "allow_methods": settings.ALLOWED_METHODS,
        "allow_headers": settings.ALLOWED_HEADERS,
    }

def get_security_headers() -> dict:
    """Get security headers configuration"""
    if not settings.ENABLE_SECURITY_HEADERS:
        return {}
    
    return {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Referrer-Policy": "strict-origin-when-cross-origin",
    } 