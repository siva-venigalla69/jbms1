#!/usr/bin/env python3
"""
Update .env with correct Render database URL
"""

def update_env_with_correct_db():
    """Update .env file with the correct Render database URL"""
    print("🔧 Updating .env with correct Render database URL...")
    
    # Correct database URL with SSL parameters
    env_content = """# Local Backend + Render Database Configuration
# Updated with CORRECT Render database URL

# Database with correct URL and SSL parameters
DATABASE_URL=postgresql://jbms_db_user:fJF5lnjVGKFVH37RV3JVgcz7IFYq5rTs@dpg-d1dujh6mcj7s73bh6rtg-a.singapore-postgres.render.com/jbms_db?sslmode=require

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
    
    print("✅ Updated .env with correct Render database URL (Singapore region)")
    print("🌐 New URL: postgresql://jbms_db_user:***@dpg-d1dujh6mcj7s73bh6rtg-a.singapore-postgres.render.com/jbms_db")

def main():
    """Main function"""
    print("🔧 UPDATING DATABASE CONNECTION")
    print("=" * 50)
    print("🗄️  Previous: Oregon region database (wrong)")
    print("🗄️  New: Singapore region database (correct)")
    print("=" * 50)
    
    update_env_with_correct_db()
    
    print("\n" + "=" * 60)
    print("✅ DATABASE URL UPDATED!")
    print("=" * 60)
    print("🚀 Now try starting the server:")
    print("   cd backend")
    print("   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    print("=" * 60)

if __name__ == "__main__":
    main() 