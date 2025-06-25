"""
Minimal test to verify backend works
"""
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    logger.info("Testing basic imports...")
    
    # Test pydantic
    from pydantic import BaseModel
    logger.info("✅ Pydantic import successful")
    
    # Test FastAPI
    from fastapi import FastAPI
    logger.info("✅ FastAPI import successful")
    
    # Test SQLAlchemy
    from sqlalchemy import create_engine
    logger.info("✅ SQLAlchemy import successful")
    
    # Test our app modules
    from app.core.config import settings
    logger.info("✅ Config import successful")
    
    from app.core.database import Base, engine
    logger.info("✅ Database import successful")
    
    # Create minimal app
    app = FastAPI(title="Test App")
    
    @app.get("/")
    def root():
        return {"message": "Test successful"}
    
    @app.get("/health")
    def health():
        return {"status": "healthy"}
    
    logger.info("✅ FastAPI app created successfully")
    logger.info("🎉 All tests passed!")
    
except Exception as e:
    logger.error(f"❌ Test failed: {str(e)}")
    raise 