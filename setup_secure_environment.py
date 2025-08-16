#!/usr/bin/env python3
"""
Secure Environment Setup Script
Generates secure environment variables and configuration files.
"""
import os
import secrets
import string
from pathlib import Path
import getpass
import json

def generate_secret_key(length=64):
    """Generate a cryptographically secure secret key"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def generate_secure_password(length=16):
    """Generate a secure password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    # Ensure it has at least one of each type
    if not any(c.islower() for c in password):
        password = password[:-1] + secrets.choice(string.ascii_lowercase)
    if not any(c.isupper() for c in password):
        password = password[:-1] + secrets.choice(string.ascii_uppercase)
    if not any(c.isdigit() for c in password):
        password = password[:-1] + secrets.choice(string.digits)
    if not any(c in "!@#$%^&*" for c in password):
        password = password[:-1] + secrets.choice("!@#$%^&*")
    return password

def create_env_file(environment="development"):
    """Create a secure .env file"""
    print(f"🔐 Creating secure environment configuration for {environment}...")
    
    # Generate secure values
    secret_key = generate_secret_key()
    admin_password = generate_secure_password()
    
    # Get user input for important settings
    print("\n📝 Please provide the following information:")
    
    if environment == "development":
        database_url = input("Database URL [postgresql://user:pass@localhost:5432/textile_printing_db]: ").strip()
        if not database_url:
            database_url = "postgresql://user:pass@localhost:5432/textile_printing_db"
        
        frontend_url = input("Frontend URL [http://localhost:3000]: ").strip()
        if not frontend_url:
            frontend_url = "http://localhost:3000"
        
        cors_origins = frontend_url + ",http://127.0.0.1:3000"
    else:
        database_url = input("Production Database URL (from Render): ").strip()
        if not database_url:
            print("❌ Database URL is required for production!")
            return False
        
        frontend_url = input("Production Frontend URL (from Netlify): ").strip()
        if not frontend_url:
            print("❌ Frontend URL is required for production!")
            return False
        
        cors_origins = frontend_url

    admin_email = input("Admin Email [admin@example.com]: ").strip()
    if not admin_email:
        admin_email = "admin@example.com"
    
    admin_full_name = input("Admin Full Name [System Administrator]: ").strip()
    if not admin_full_name:
        admin_full_name = "System Administrator"
    
    # Create .env content
    env_content = f"""# Generated on {secrets.token_hex(8)} - {environment.upper()} ENVIRONMENT
# ⚠️  NEVER commit this file to version control!

# Database Configuration
DATABASE_URL={database_url}

# Security Configuration
SECRET_KEY={secret_key}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Application Configuration
APP_NAME=Digital Textile Printing Management System
APP_VERSION=1.0.0
ENVIRONMENT={environment}
DEBUG={'true' if environment == 'development' else 'false'}

# CORS Configuration
CORS_ORIGINS={cors_origins}
FRONTEND_URL={frontend_url}

# Rate Limiting
RATE_LIMIT_ENABLED={'false' if environment == 'development' else 'true'}
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=3600

# Logging Configuration
LOG_LEVEL={'DEBUG' if environment == 'development' else 'INFO'}
LOG_FILE=

# Admin Configuration
ADMIN_USERNAME=admin
ADMIN_EMAIL={admin_email}
ADMIN_PASSWORD={admin_password}
ADMIN_FULL_NAME={admin_full_name}

# Email Configuration (Optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL={admin_email}

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_EXTENSIONS=.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx
"""

    # Write .env file
    env_file = Path("backend/.env")
    with open(env_file, "w") as f:
        f.write(env_content)
    
    # Set secure permissions
    env_file.chmod(0o600)
    
    print(f"✅ Created secure .env file at {env_file}")
    print(f"🔑 Generated admin password: {admin_password}")
    print(f"🔐 Generated secret key (first 16 chars): {secret_key[:16]}...")
    
    # Create summary file for deployment
    summary = {
        "environment": environment,
        "admin_password": admin_password,
        "secret_key_preview": secret_key[:16] + "...",
        "database_url_set": bool(database_url),
        "frontend_url": frontend_url,
        "admin_email": admin_email,
        "created_at": secrets.token_hex(8)
    }
    
    with open(f"secure_setup_summary_{environment}.json", "w") as f:
        json.dump(summary, f, indent=2)
    
    print(f"📋 Setup summary saved to secure_setup_summary_{environment}.json")
    
    # Security reminders
    print("\n🔒 SECURITY REMINDERS:")
    print("1. NEVER commit .env files to version control")
    print("2. Change the admin password after first login")
    print("3. Update .gitignore to exclude .env files")
    print("4. Store production credentials securely")
    print("5. Rotate secrets regularly")
    
    return True

def update_gitignore():
    """Update .gitignore to exclude sensitive files"""
    gitignore_entries = [
        "# Environment files",
        ".env",
        ".env.local",
        ".env.production",
        ".env.development",
        "",
        "# Security files",
        "secure_setup_summary_*.json",
        "backup_credentials.json",
        "",
        "# Logs",
        "*.log",
        "logs/",
        "",
        "# Database",
        "*.db",
        "*.sqlite",
        "",
    ]
    
    gitignore_path = Path(".gitignore")
    existing_content = ""
    
    if gitignore_path.exists():
        with open(gitignore_path, "r") as f:
            existing_content = f.read()
    
    # Add new entries if they don't exist
    new_entries = []
    for entry in gitignore_entries:
        if entry and entry not in existing_content:
            new_entries.append(entry)
    
    if new_entries:
        with open(gitignore_path, "a") as f:
            if existing_content and not existing_content.endswith("\n"):
                f.write("\n")
            f.write("\n".join(new_entries))
        print("✅ Updated .gitignore with security exclusions")
    else:
        print("✅ .gitignore already contains necessary exclusions")

def main():
    """Main setup function"""
    print("🛡️  Secure Environment Setup for Digital Textile Printing System")
    print("=" * 60)
    
    # Update gitignore first
    update_gitignore()
    
    # Choose environment
    print("\n🌍 Choose environment to set up:")
    print("1. Development (local)")
    print("2. Production (Render)")
    
    choice = input("Enter choice (1 or 2): ").strip()
    
    if choice == "1":
        environment = "development"
    elif choice == "2":
        environment = "production"
    else:
        print("❌ Invalid choice. Defaulting to development.")
        environment = "development"
    
    # Create environment configuration
    if create_env_file(environment):
        print(f"\n🎉 Secure environment setup completed for {environment}!")
        
        # Next steps
        print(f"\n📋 NEXT STEPS:")
        if environment == "development":
            print("1. Review the generated .env file")
            print("2. Update database credentials if needed")
            print("3. Run: cd backend && python -m app.main")
            print("4. Test login with generated admin credentials")
        else:
            print("1. Copy environment variables to Render dashboard")
            print("2. Deploy to Render")
            print("3. Run database migration")
            print("4. Test production deployment")
    else:
        print("❌ Setup failed. Please try again.")

if __name__ == "__main__":
    main()