#!/usr/bin/env python3
"""
Local Development Environment Setup Script
Sets up PostgreSQL database, installs dependencies, and runs migrations
"""

import os
import sys
import subprocess
import logging
import time
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class LocalEnvironmentSetup:
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.backend_path = self.project_root / "backend"
        self.db_name = "textile_printing_local"
        self.db_user = "textile_user"
        self.db_password = os.getenv("TEST_PASSWORD", "change-me")
        self.db_host = "localhost"
        self.db_port = "5432"
        
    def check_prerequisites(self):
        """Check if required software is installed"""
        logger.info("🔍 Checking prerequisites...")
        
        # Check Python
        try:
            python_version = subprocess.check_output([sys.executable, "--version"], text=True)
            logger.info(f"✅ Python: {python_version.strip()}")
        except Exception as e:
            logger.error(f"❌ Python check failed: {e}")
            return False
        
        # Check PostgreSQL
        try:
            pg_version = subprocess.check_output(["psql", "--version"], text=True)
            logger.info(f"✅ PostgreSQL: {pg_version.strip()}")
        except Exception as e:
            logger.error(f"❌ PostgreSQL not found. Please install PostgreSQL first.")
            logger.error("   Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib")
            logger.error("   macOS: brew install postgresql")
            logger.error("   Windows: Download from https://www.postgresql.org/download/")
            return False
        
        return True
    
    def setup_database(self):
        """Set up local PostgreSQL database"""
        logger.info("🗄️  Setting up local database...")
        
        try:
            # Create database user
            logger.info(f"Creating database user: {self.db_user}")
            create_user_cmd = [
                "sudo", "-u", "postgres", "psql", "-c",
                f"CREATE USER {self.db_user} WITH PASSWORD '{self.db_password}';"
            ]
            
            try:
                subprocess.run(create_user_cmd, check=True, capture_output=True)
                logger.info("✅ Database user created")
            except subprocess.CalledProcessError as e:
                if "already exists" in e.stderr.decode():
                    logger.info("ℹ️  Database user already exists")
                else:
                    logger.warning(f"User creation failed: {e.stderr.decode()}")
            
            # Create database
            logger.info(f"Creating database: {self.db_name}")
            create_db_cmd = [
                "sudo", "-u", "postgres", "psql", "-c",
                f"CREATE DATABASE {self.db_name} OWNER {self.db_user};"
            ]
            
            try:
                subprocess.run(create_db_cmd, check=True, capture_output=True)
                logger.info("✅ Database created")
            except subprocess.CalledProcessError as e:
                if "already exists" in e.stderr.decode():
                    logger.info("ℹ️  Database already exists")
                else:
                    logger.warning(f"Database creation failed: {e.stderr.decode()}")
            
            # Grant privileges
            grant_cmd = [
                "sudo", "-u", "postgres", "psql", "-c",
                f"GRANT ALL PRIVILEGES ON DATABASE {self.db_name} TO {self.db_user};"
            ]
            subprocess.run(grant_cmd, check=True, capture_output=True)
            
            # Test connection
            test_conn = f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
            logger.info("🔗 Testing database connection...")
            
            test_cmd = [
                "psql", test_conn, "-c", "SELECT 1;"
            ]
            subprocess.run(test_cmd, check=True, capture_output=True)
            logger.info("✅ Database connection successful")
            
            return test_conn
            
        except Exception as e:
            logger.error(f"❌ Database setup failed: {e}")
            return None
    
    def create_env_file(self, database_url):
        """Create .env file for local development"""
        logger.info("📝 Creating .env file...")
        
        env_content = f"""# Local Development Environment
DATABASE_URL={database_url}
SECRET_KEY=local-development-secret-key-32-chars-minimum
ENVIRONMENT=development
DEBUG=true
CORS_ORIGINS=http://localhost:3000,http://localhost:8000,http://127.0.0.1:3000,http://127.0.0.1:8000

# Rate limiting (disabled for development)
RATE_LIMIT_ENABLED=false

# Upload paths
UPLOAD_PATH=./uploads
REPORTS_EXPORT_PATH=./exports

# Logging
LOG_LEVEL=DEBUG
"""
        
        env_file = self.backend_path / ".env"
        with open(env_file, "w") as f:
            f.write(env_content)
        
        logger.info(f"✅ Environment file created: {env_file}")
    
    def install_dependencies(self):
        """Install Python dependencies"""
        logger.info("📦 Installing Python dependencies...")
        
        # Create virtual environment if not exists
        venv_path = self.project_root / "venv"
        if not venv_path.exists():
            logger.info("Creating virtual environment...")
            subprocess.run([sys.executable, "-m", "venv", str(venv_path)], check=True)
        
        # Install dependencies
        pip_path = venv_path / "bin" / "pip" if os.name != "nt" else venv_path / "Scripts" / "pip.exe"
        requirements_file = self.backend_path / "requirements.txt"
        
        subprocess.run([str(pip_path), "install", "-r", str(requirements_file)], check=True)
        logger.info("✅ Dependencies installed")
        
        return venv_path
    
    def run_database_migrations(self, database_url):
        """Run database schema and migrations"""
        logger.info("🔄 Setting up database schema...")
        
        # Run the database fix script
        schema_file = self.project_root / "fix_database_issues.sql"
        if schema_file.exists():
            logger.info("Running database schema fixes...")
            subprocess.run([
                "psql", database_url, "-f", str(schema_file)
            ], check=True)
            logger.info("✅ Database schema updated")
        
        # Run any migration scripts in database folder
        db_folder = self.project_root / "database"
        if db_folder.exists():
            for sql_file in db_folder.glob("*.sql"):
                logger.info(f"Running migration: {sql_file.name}")
                try:
                    subprocess.run([
                        "psql", database_url, "-f", str(sql_file)
                    ], check=True, capture_output=True)
                    logger.info(f"✅ {sql_file.name} executed")
                except subprocess.CalledProcessError as e:
                    logger.warning(f"⚠️  {sql_file.name} failed: {e.stderr.decode()}")
    
    def create_admin_user(self, database_url):
        """Create admin user in local database"""
        logger.info("👤 Creating admin user...")
        
        # Create admin user SQL
        admin_sql = """
        -- Create admin user for local development
        INSERT INTO users (id, username, email, password_hash, full_name, role, is_active)
        VALUES (
            gen_random_uuid(),
            'admin',
            'admin@localhost.com',
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewOJhOV/VV7pyE.i', -- password: Siri@2299
            'Local Admin',
            'admin',
            true
        )
        ON CONFLICT (username) DO UPDATE SET
            password = os.getenv("TEST_PASSWORD", "change-me")sh,
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active;
        """
        
        # Write to temp file and execute
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
            f.write(admin_sql)
            temp_file = f.name
        
        try:
            subprocess.run([
                "psql", database_url, "-f", temp_file
            ], check=True, capture_output=True)
            logger.info("✅ Admin user created (username: admin, password: Siri@2299)")
        except subprocess.CalledProcessError as e:
            logger.warning(f"⚠️  Admin user creation failed: {e.stderr.decode()}")
        finally:
            os.unlink(temp_file)
    
    def start_local_server(self, venv_path):
        """Start the local development server"""
        logger.info("🚀 Starting local development server...")
        
        # Use virtual environment python
        python_path = venv_path / "bin" / "python" if os.name != "nt" else venv_path / "Scripts" / "python.exe"
        
        # Change to backend directory
        os.chdir(self.backend_path)
        
        # Start uvicorn server
        cmd = [
            str(python_path), "-m", "uvicorn", 
            "app.main:app", 
            "--host", "0.0.0.0", 
            "--port", "8000", 
            "--reload",
            "--log-level", "debug"
        ]
        
        logger.info("🌐 Server starting at http://localhost:8000")
        logger.info("📚 API docs available at http://localhost:8000/docs")
        logger.info("🔧 To stop the server, press Ctrl+C")
        
        # Start server in foreground
        subprocess.run(cmd)
    
    def setup_local_environment(self):
        """Complete local environment setup"""
        logger.info("🔧 SETTING UP LOCAL DEVELOPMENT ENVIRONMENT")
        logger.info("=" * 60)
        
        try:
            # Check prerequisites
            if not self.check_prerequisites():
                logger.error("❌ Prerequisites check failed")
                return False
            
            # Setup database
            database_url = self.setup_database()
            if not database_url:
                logger.error("❌ Database setup failed")
                return False
            
            # Create .env file
            self.create_env_file(database_url)
            
            # Install dependencies
            venv_path = self.install_dependencies()
            
            # Run migrations
            self.run_database_migrations(database_url)
            
            # Create admin user
            self.create_admin_user(database_url)
            
            logger.info("\n" + "=" * 60)
            logger.info("✅ LOCAL ENVIRONMENT SETUP COMPLETE!")
            logger.info("=" * 60)
            logger.info(f"📊 Database: {database_url}")
            logger.info("👤 Admin Login: username=admin, password = os.getenv("TEST_PASSWORD", "change-me")
            logger.info("🌐 Ready to start server with: python -m uvicorn app.main:app --reload")
            logger.info("=" * 60)
            
            # Ask if user wants to start server now
            response = input("\n🚀 Start the development server now? (y/n): ")
            if response.lower().startswith('y'):
                self.start_local_server(venv_path)
            
            return True
            
        except KeyboardInterrupt:
            logger.info("\n⏹️  Setup interrupted by user")
            return False
        except Exception as e:
            logger.error(f"❌ Setup failed: {e}")
            return False

def main():
    """Main function"""
    setup = LocalEnvironmentSetup()
    success = setup.setup_local_environment()
    
    if not success:
        sys.exit(1)
    
    logger.info("🎉 Local development environment is ready!")

if __name__ == "__main__":
    main() 