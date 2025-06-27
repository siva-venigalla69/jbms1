#!/usr/bin/env python3
"""
Create .env file for local development with Render database
"""

env_content = """# Local Backend + Render Database Configuration
# This connects your local backend to the production Render database

# Database with SSL parameters for Render
DATABASE_URL=postgresql://jbms_db_user:UBKwZVJt4t3wOhgN7MQQGZe2A9JCqvYL@dpg-ct7nqllds78s73ek9d6g-a.oregon-postgres.render.com/jbms_db?sslmode=require

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
"""

with open("backend/.env", "w") as f:
    f.write(env_content)

print("✅ .env file created with SSL parameters for Render database")
print("🌐 Database URL includes ?sslmode=require for secure connection")
print("🔧 Ready to start local backend server") 