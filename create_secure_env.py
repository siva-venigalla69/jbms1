#!/usr/bin/env python3
"""
Secure Environment Setup Script
Generates secure credentials and removes hardcoded passwords
"""
import secrets
import os
from pathlib import Path

def generate_secure_credentials():
    """Generate secure credentials for production"""
    # Generate secure random secret key (64 characters)
    secret_key = secrets.token_urlsafe(48)
    
    # Generate secure admin password
    admin_password = secrets.token_urlsafe(16)
    
    return {
        'SECRET_KEY': secret_key,
        'ADMIN_PASSWORD': admin_password
    }

def create_production_env():
    """Create production environment file"""
    creds = generate_secure_credentials()
    
    env_content = f"""# Production Environment Variables
# Generated on: {os.getenv('DATE', 'Unknown')}

# Database (set by Render automatically)
DATABASE_URL=<WILL_BE_SET_BY_RENDER>

# Security
SECRET_KEY={creds['SECRET_KEY']}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Environment
ENVIRONMENT=production
DEBUG=false

# CORS (update with your actual frontend URL)
CORS_ORIGINS=https://your-frontend-domain.com,https://www.your-frontend-domain.com
FRONTEND_URL=https://your-frontend-domain.com

# Admin Credentials (CHANGE THESE IMMEDIATELY)
ADMIN_USERNAME=admin
ADMIN_PASSWORD={creds['ADMIN_PASSWORD']}
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_FULL_NAME=System Administrator

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Logging
LOG_LEVEL=WARNING
"""
    
    with open('.env.production.template', 'w') as f:
        f.write(env_content)
    
    print("✅ Production environment template created: .env.production.template")
    print(f"🔑 Generated secure admin password: {creds['ADMIN_PASSWORD']}")
    print("⚠️  IMPORTANT: Change the admin password immediately after deployment!")
    print("⚠️  Update CORS_ORIGINS and FRONTEND_URL with your actual domains!")
    
    return creds

if __name__ == "__main__":
    create_production_env() 