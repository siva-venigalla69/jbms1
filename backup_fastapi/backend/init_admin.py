#!/usr/bin/env python3
"""
Initialize the first admin user for the Digital Textile Printing System.
Run this script after deploying the database to create the first admin user.
"""

import os
import sys
from getpass import getpass
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.models.models import User, UserRole
from app.core.security import get_password_hash

def create_admin_user():
    """Create the first admin user"""
    # Get database URL from environment or prompt
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        database_url = input("Enter DATABASE_URL: ")
    
    # Create database connection
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if admin user already exists
        existing_admin = db.query(User).filter(User.role == "admin").first()
        if existing_admin:
            print(f"Admin user already exists: {existing_admin.username}")
            return
        
        # Get admin user details
        print("Creating first admin user...")
        username = input("Enter admin username: ")
        email = input("Enter admin email: ")
        full_name = input("Enter admin full name: ")
        password = getpass("Enter admin password: ")
        
        # Create admin user
        hashed_password = get_password_hash(password)
        admin_user = User(
            username=username,
            email=email,
            full_name=full_name,
            password_hash=hashed_password,
            role="admin",  # Use lowercase enum value to match database
            is_active=True
        )
        
        db.add(admin_user)
        db.commit()
        
        print(f"✅ Admin user '{username}' created successfully!")
        print(f"You can now log in to the system with these credentials.")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user() 