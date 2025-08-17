#!/usr/bin/env python3
"""
Remote Environment Setup Script
Sets up environment for using Render database without local PostgreSQL installation.
"""
import os
import secrets
import string
from pathlib import Path
import json
import subprocess
import sys

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

def check_prerequisites():
    """Check if required tools are available"""
    print("🔍 Checking prerequisites...")
    
    # Check Python version
    if sys.version_info < (3, 9):
        print("❌ Python 3.9+ is required")
        return False
    print("✅ Python version is compatible")
    
    # Check if we can install packages
    try:
        import psycopg2
        print("✅ psycopg2 is available")
    except ImportError:
        print("📦 Installing psycopg2-binary for database connectivity...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
            print("✅ psycopg2-binary installed successfully")
        except subprocess.CalledProcessError:
            print("❌ Failed to install psycopg2-binary. Please install manually:")
            print("   pip install psycopg2-binary")
            return False
    
    return True

def test_database_connection(database_url):
    """Test connection to remote database"""
    print("🔌 Testing database connection...")
    
    try:
        import psycopg2
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        print(f"✅ Database connection successful!")
        print(f"   Database version: {version.split(',')[0]}")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {str(e)}")
        print("   Please check your database URL and network connection")
        return False

def get_render_database_info():
    """Guide user to get Render database information"""
    print("\n📋 Getting Render Database Information")
    print("=" * 50)
    print("1. Go to your Render Dashboard: https://dashboard.render.com")
    print("2. Find your PostgreSQL database service")
    print("3. Click on it to view details")
    print("4. Copy the 'External Database URL' (starts with postgresql://)")
    print("5. It should look like: postgresql://user:password@host:port/database")
    print("\n⚠️  Use the EXTERNAL database URL, not the internal one!")
    print("⚠️  The external URL allows connections from outside Render")
    
    while True:
        database_url = input("\n📝 Paste your Render External Database URL here: ").strip()
        
        if not database_url:
            print("❌ Database URL cannot be empty")
            continue
        
        if not database_url.startswith('postgresql://'):
            print("❌ Database URL should start with 'postgresql://'")
            continue
        
        if 'localhost' in database_url or '127.0.0.1' in database_url:
            print("❌ This looks like a local database URL. Please use the Render external URL")
            continue
        
        # Test connection
        if test_database_connection(database_url):
            return database_url
        else:
            retry = input("❓ Connection failed. Try again? (y/n): ").strip().lower()
            if retry != 'y':
                return None

def setup_environment_type():
    """Choose environment type"""
    print("\n🌍 Environment Setup")
    print("=" * 30)
    print("1. Development (local development with remote database)")
    print("2. Production (for deployment to Render)")
    
    while True:
        choice = input("\nChoose environment type (1 or 2): ").strip()
        if choice == "1":
            return "development"
        elif choice == "2":
            return "production"
        else:
            print("❌ Please enter 1 or 2")

def create_env_file(environment, database_url):
    """Create environment file with remote database"""
    print(f"\n🔐 Creating {environment} environment configuration...")
    
    # Generate secure values
    secret_key = generate_secret_key()
    admin_password = generate_secure_password()
    
    # Get additional configuration
    if environment == "development":
        frontend_url = input("Frontend URL [http://localhost:3000]: ").strip()
        if not frontend_url:
            frontend_url = "http://localhost:3000"
        cors_origins = frontend_url + ",http://127.0.0.1:3000"
    else:
        print("\n📝 Production Configuration:")
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
    env_content = f"""# Generated for {environment.upper()} with Render Database
# ⚠️  NEVER commit this file to version control!

# Database Configuration (Render External URL)
DATABASE_URL={database_url}

# Security Configuration
SECRET_KEY={secret_key}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Application Configuration
APP_NAME=Digital Textile Printing Management System
APP_VERSION=2.0.0
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

# Database Connection Pool (for remote connection)
DB_POOL_SIZE=3
DB_POOL_OVERFLOW=5
DB_POOL_TIMEOUT=30

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
    env_file.parent.mkdir(exist_ok=True)
    
    with open(env_file, "w") as f:
        f.write(env_content)
    
    # Set secure permissions
    env_file.chmod(0o600)
    
    print(f"✅ Created {env_file}")
    print(f"🔑 Generated admin password: {admin_password}")
    print(f"🔐 Generated secret key (first 16 chars): {secret_key[:16]}...")
    
    # Create summary file
    summary = {
        "environment": environment,
        "database_type": "render_external",
        "admin_password": admin_password,
        "secret_key_preview": secret_key[:16] + "...",
        "database_url_host": database_url.split('@')[1].split('/')[0] if '@' in database_url else "hidden",
        "frontend_url": frontend_url,
        "admin_email": admin_email,
        "created_at": secrets.token_hex(8)
    }
    
    with open(f"remote_setup_summary_{environment}.json", "w") as f:
        json.dump(summary, f, indent=2)
    
    print(f"📋 Setup summary saved to remote_setup_summary_{environment}.json")
    
    return True

def apply_database_migration(database_url):
    """Apply database migration to remote database"""
    print("\n🗄️ Database Migration")
    print("=" * 30)
    
    migration_file = Path("backend/app/migrations/schema_fix_v2.sql")
    if not migration_file.exists():
        print("❌ Migration file not found at backend/app/migrations/schema_fix_v2.sql")
        return False
    
    apply_migration = input("Apply database migration to remote database? (y/n): ").strip().lower()
    if apply_migration != 'y':
        print("⚠️  Migration skipped. You can apply it later using:")
        print(f"   psql '{database_url}' -f {migration_file}")
        return True
    
    try:
        import psycopg2
        print("🔄 Applying database migration...")
        
        conn = psycopg2.connect(database_url)
        conn.autocommit = True
        cursor = conn.cursor()
        
        with open(migration_file, 'r') as f:
            migration_sql = f.read()
        
        # Execute migration in chunks (split by semicolon)
        statements = [stmt.strip() for stmt in migration_sql.split(';') if stmt.strip()]
        
        for i, statement in enumerate(statements):
            try:
                cursor.execute(statement)
                print(f"   ✅ Executed statement {i+1}/{len(statements)}")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(f"   ⚠️  Statement {i+1} skipped (already exists)")
                else:
                    print(f"   ❌ Error in statement {i+1}: {str(e)}")
        
        cursor.close()
        conn.close()
        print("✅ Database migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        print("   You can apply it manually using psql later")
        return False

def create_admin_user(database_url, admin_email, admin_full_name, admin_password):
    """Create admin user in remote database"""
    print("\n👤 Creating Admin User")
    print("=" * 25)
    
    create_admin = input("Create admin user in database? (y/n): ").strip().lower()
    if create_admin != 'y':
        print("⚠️  Admin user creation skipped")
        return True
    
    try:
        import psycopg2
        from app.core.security import get_password_hash
        print("🔄 Creating admin user...")
        
        # Add the backend directory to Python path temporarily
        backend_path = Path("backend").resolve()
        if str(backend_path) not in sys.path:
            sys.path.insert(0, str(backend_path))
        
        # Hash the password
        password_hash = get_password_hash(admin_password)
        
        conn = psycopg2.connect(database_url)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Create admin user
        cursor.execute("""
            INSERT INTO users (id, username, email, full_name, password_hash, role, is_active, created_at, updated_at)
            VALUES (gen_random_uuid(), 'admin', %s, %s, %s, 'admin', true, NOW(), NOW())
            ON CONFLICT (username) DO UPDATE SET
                email = EXCLUDED.email,
                full_name = EXCLUDED.full_name,
                password_hash = EXCLUDED.password_hash,
                updated_at = NOW()
        """, (admin_email, admin_full_name, password_hash))
        
        cursor.close()
        conn.close()
        print("✅ Admin user created/updated successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Admin user creation failed: {str(e)}")
        print("   You can create it manually later using the backend scripts")
        return False

def run_tests():
    """Run basic tests to verify setup"""
    print("\n🧪 Running Setup Verification Tests")
    print("=" * 40)
    
    run_tests_choice = input("Run verification tests? (y/n): ").strip().lower()
    if run_tests_choice != 'y':
        print("⚠️  Tests skipped")
        return True
    
    try:
        print("🔄 Testing backend startup...")
        
        # Change to backend directory
        os.chdir("backend")
        
        # Test if the app can start
        result = subprocess.run(
            [sys.executable, "-c", "from app.main import app; print('✅ Backend imports successfully')"],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print("✅ Backend configuration is valid")
        else:
            print(f"❌ Backend configuration error: {result.stderr}")
            return False
        
        # Change back to project root
        os.chdir("..")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        return False

def main():
    """Main setup function"""
    print("🚀 Remote Environment Setup for Digital Textile Printing System")
    print("=" * 70)
    print("This script sets up your environment to use Render database without local PostgreSQL")
    print()
    
    # Check prerequisites
    if not check_prerequisites():
        print("❌ Prerequisites check failed. Please fix the issues and try again.")
        return False
    
    # Get database information
    database_url = get_render_database_info()
    if not database_url:
        print("❌ Cannot proceed without database URL")
        return False
    
    # Choose environment
    environment = setup_environment_type()
    
    # Create environment file
    if not create_env_file(environment, database_url):
        print("❌ Environment file creation failed")
        return False
    
    # Apply database migration
    migration_success = apply_database_migration(database_url)
    
    # Create admin user if migration was successful
    if migration_success:
        # Read the password from the created env file
        env_file = Path("backend/.env")
        admin_password = ""
        admin_email = ""
        admin_full_name = ""
        
        if env_file.exists():
            with open(env_file, 'r') as f:
                for line in f:
                    if line.startswith('ADMIN_PASSWORD='):
                        admin_password = line.split('=', 1)[1].strip()
                    elif line.startswith('ADMIN_EMAIL='):
                        admin_email = line.split('=', 1)[1].strip()
                    elif line.startswith('ADMIN_FULL_NAME='):
                        admin_full_name = line.split('=', 1)[1].strip()
        
        if admin_password and admin_email and admin_full_name:
            create_admin_user(database_url, admin_email, admin_full_name, admin_password)
    
    # Run verification tests
    run_tests()
    
    print(f"\n🎉 Remote environment setup completed for {environment}!")
    
    # Next steps
    print(f"\n📋 NEXT STEPS:")
    if environment == "development":
        print("1. Start the backend server:")
        print("   cd backend")
        print("   python -m uvicorn app.main:app --reload")
        print("2. In another terminal, start the frontend:")
        print("   cd frontend")
        print("   npm install && npm start")
        print("3. Access the application at http://localhost:3000")
        print("4. Login with:")
        print("   Username: admin")
        with open("backend/.env", 'r') as f:
            for line in f:
                if line.startswith('ADMIN_PASSWORD='):
                    password = line.split('=', 1)[1].strip()
                    print(f"   Password: {password}")
                    break
    else:
        print("1. Copy environment variables to your Render dashboard")
        print("2. Deploy your application to Render")
        print("3. Update CORS_ORIGINS with your actual frontend URL")
        print("4. Test the production deployment")
    
    print(f"\n🔒 SECURITY REMINDERS:")
    print("- Your admin password has been generated and saved in backend/.env")
    print("- Change the admin password after first login")
    print("- Never commit .env files to version control")
    print("- Keep your database credentials secure")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        if success:
            print("\n✅ Setup completed successfully!")
        else:
            print("\n❌ Setup failed. Please check the errors above.")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        sys.exit(1)