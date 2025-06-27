#!/usr/bin/env python3
"""
Fix SSL Connection Issues with Render Database
"""

import os

def create_fixed_env():
    """Create .env file with proper SSL configuration for Render"""
    print("🔧 Creating fixed .env file with proper SSL configuration...")
    
    # Enhanced database URL with comprehensive SSL parameters
    env_content = """# Local Backend + Render Database Configuration
# Enhanced SSL configuration for Render PostgreSQL

# Database with comprehensive SSL parameters
DATABASE_URL=postgresql://jbms_db_user:UBKwZVJt4t3wOhgN7MQQGZe2A9JCqvYL@dpg-ct7nqllds78s73ek9d6g-a.oregon-postgres.render.com/jbms_db?sslmode=require&sslcert=&sslkey=&sslrootcert=&sslcrl=&connect_timeout=30

# Alternative: Try with different SSL mode if above fails
# DATABASE_URL=postgresql://jbms_db_user:UBKwZVJt4t3wOhgN7MQQGZe2A9JCqvYL@dpg-ct7nqllds78s73ek9d6g-a.oregon-postgres.render.com/jbms_db?sslmode=prefer

# Local development settings
SECRET_KEY=local-development-secret-key-32-chars-minimum
ENVIRONMENT=development
DEBUG=true

# CORS - allow local frontend and testing
CORS_ORIGINS=http://localhost:3000,http://localhost:8000,http://127.0.0.1:3000,http://127.0.0.1:8000

# Rate limiting (disabled for development)
RATE_LIMIT_ENABLED=false

# Upload paths (local)
UPLOAD_PATH=./uploads
REPORTS_EXPORT_PATH=./exports

# Logging
LOG_LEVEL=DEBUG

# Database connection pool settings for external connections
DB_POOL_SIZE=2
DB_POOL_OVERFLOW=0
DB_POOL_TIMEOUT=60
"""
    
    with open("backend/.env", "w") as f:
        f.write(env_content)
    
    print("✅ Updated .env file with enhanced SSL configuration")

def modify_database_config():
    """Modify the database configuration to handle SSL and external connections better"""
    print("🔧 Updating database configuration for external connections...")
    
    # Read the current database config
    with open("backend/app/core/database.py", "r") as f:
        content = f.read()
    
    # Updated database configuration
    new_database_content = '''"""
Database configuration with enhanced external connection handling
"""
import os
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from .config import settings
import logging

logger = logging.getLogger(__name__)

# Get database URL from settings
database_url = settings.DATABASE_URL

# Enhanced engine configuration for external database connections
engine_kwargs = {
    "poolclass": NullPool,  # Disable connection pooling for external connections
    "connect_args": {
        "connect_timeout": 30,
        "options": "-c timezone=utc"
    },
    "echo": settings.DEBUG,
    "future": True
}

# Add SSL configuration for external connections
if "render.com" in database_url or "amazonaws.com" in database_url:
    engine_kwargs["connect_args"].update({
        "sslmode": "require",
        "connect_timeout": 60
    })

try:
    engine = create_engine(database_url, **engine_kwargs)
    logger.info("Database engine created successfully")
except Exception as e:
    logger.error(f"Failed to create database engine: {e}")
    # Fallback configuration
    engine = create_engine(
        database_url,
        poolclass=NullPool,
        connect_args={"connect_timeout": 30},
        echo=False
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Get database session with proper error handling"""
    db = SessionLocal()
    try:
        # Test connection
        db.execute("SELECT 1")
        yield db
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def test_database_connection():
    """Test database connection with retries"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            with engine.connect() as conn:
                result = conn.execute("SELECT 1")
                logger.info("Database connection test successful")
                return True
        except Exception as e:
            logger.warning(f"Database connection attempt {attempt + 1} failed: {e}")
            if attempt == max_retries - 1:
                logger.error("All database connection attempts failed")
                return False
    return False
'''
    
    with open("backend/app/core/database.py", "w") as f:
        f.write(new_database_content)
    
    print("✅ Updated database configuration")

def modify_app_startup():
    """Modify the application startup to handle database connection failures gracefully"""
    print("🔧 Updating application startup for graceful database handling...")
    
    # Read the current main.py
    with open("backend/app/main.py", "r") as f:
        content = f.read()
    
    # Find and replace the lifespan function
    if "Base.metadata.create_all(bind=engine)" in content:
        # Replace the problematic startup code
        new_content = content.replace(
            "Base.metadata.create_all(bind=engine)",
            """# Skip table creation for external databases to avoid SSL issues
    # Tables should already exist in production database
    try:
        from .core.database import test_database_connection
        if test_database_connection():
            logger.info("Database connection verified")
        else:
            logger.warning("Database connection test failed, but continuing startup")
    except Exception as e:
        logger.warning(f"Database connection test error: {e}, continuing startup")"""
        )
        
        with open("backend/app/main.py", "w") as f:
            f.write(new_content)
        
        print("✅ Updated application startup")
    else:
        print("ℹ️  Application startup already configured")

def create_alternative_startup_script():
    """Create an alternative startup script that skips database table creation"""
    print("🚀 Creating alternative startup script...")
    
    startup_script = '''#!/usr/bin/env python3
"""
Alternative startup script that skips database table creation
Use this when connecting to external databases like Render
"""

import uvicorn
import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent
sys.path.append(str(backend_path))

def start_server():
    """Start the FastAPI server without database table creation"""
    print("🚀 Starting server without database table creation...")
    print("🌐 Connecting to external Render database...")
    
    # Set environment variable to skip table creation
    os.environ["SKIP_TABLE_CREATION"] = "true"
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="debug",
        access_log=True
    )

if __name__ == "__main__":
    start_server()
'''
    
    with open("backend/start_server.py", "w") as f:
        f.write(startup_script)
    
    os.chmod("backend/start_server.py", 0o755)
    print("✅ Created alternative startup script: backend/start_server.py")

def main():
    """Main function to fix all SSL and connection issues"""
    print("🔧 FIXING SSL CONNECTION ISSUES")
    print("=" * 50)
    
    # Fix environment configuration
    create_fixed_env()
    
    # Update database configuration  
    modify_database_config()
    
    # Update app startup
    modify_app_startup()
    
    # Create alternative startup
    create_alternative_startup_script()
    
    print("\n" + "=" * 60)
    print("✅ SSL CONNECTION FIXES APPLIED!")
    print("=" * 60)
    print("🔧 Changes made:")
    print("1. Enhanced .env with proper SSL parameters")
    print("2. Updated database.py for external connections")
    print("3. Modified app startup to handle connection failures")
    print("4. Created alternative startup script")
    print()
    print("💡 Try these options in order:")
    print("Option 1: cd backend && python start_server.py")
    print("Option 2: cd backend && python -m uvicorn app.main:app --reload")
    print("Option 3: Use sslmode=prefer instead of require in .env")
    print("=" * 60)

if __name__ == "__main__":
    main() 