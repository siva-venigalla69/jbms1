#!/usr/bin/env python3
"""
Automated deployment script for Textile Printing Management System
"""
import os
import sys
import subprocess
import json
import time
import requests
from pathlib import Path

def run_command(command, description, check=True):
    """Run a shell command with logging"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=check, capture_output=True, text=True)
        if result.stdout:
            print(f"✅ {result.stdout.strip()}")
        return result
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {e}")
        if e.stderr:
            print(f"Error details: {e.stderr}")
        if check:
            sys.exit(1)
        return e

def check_prerequisites():
    """Check if all prerequisites are met"""
    print("🔍 Checking prerequisites...")
    
    # Check if git is available
    try:
        subprocess.run(["git", "--version"], check=True, capture_output=True)
        print("✅ Git is available")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Git is not available. Please install Git.")
        sys.exit(1)
    
    # Check if we're in a git repository
    try:
        subprocess.run(["git", "rev-parse", "--git-dir"], check=True, capture_output=True)
        print("✅ In a Git repository")
    except subprocess.CalledProcessError:
        print("❌ Not in a Git repository. Please run from the project root.")
        sys.exit(1)
    
    # Check if backend directory exists
    if not Path("backend").exists():
        print("❌ Backend directory not found. Please run from the project root.")
        sys.exit(1)
    
    print("✅ All prerequisites met")

def run_security_cleanup():
    """Run security cleanup script"""
    print("🔒 Running security cleanup...")
    
    if Path("remove_hardcoded_credentials.py").exists():
        run_command("python3 remove_hardcoded_credentials.py", "Removing hardcoded credentials")
    else:
        print("⚠️  Security cleanup script not found, skipping...")

def setup_environment():
    """Setup secure environment configuration"""
    print("🌍 Setting up environment configuration...")
    
    if Path("setup_secure_environment.py").exists():
        print("📝 Please run setup_secure_environment.py manually to configure your environment:")
        print("   python3 setup_secure_environment.py")
        print("   This will generate secure credentials and environment files.")
        
        # Wait for user confirmation
        input("Press Enter when you have completed the environment setup...")
    else:
        print("⚠️  Environment setup script not found, skipping...")

def run_database_migration():
    """Apply database migrations"""
    print("🗄️ Applying database migrations...")
    
    migration_file = Path("backend/app/migrations/schema_fix_v2.sql")
    if migration_file.exists():
        print("📋 Database migration file found. Please apply it to your production database:")
        print(f"   psql -d $DATABASE_URL -f {migration_file}")
        print("   Or use your database management tool to execute the SQL commands.")
        
        # Wait for user confirmation
        input("Press Enter when you have applied the database migration...")
    else:
        print("⚠️  Database migration file not found, skipping...")

def run_tests():
    """Run tests before deployment"""
    print("🧪 Running tests...")
    
    # Backend tests
    backend_test_files = list(Path("backend/tests").glob("*.py")) if Path("backend/tests").exists() else []
    if backend_test_files:
        run_command(
            "cd backend && python -m pytest tests/ -v",
            "Running backend tests",
            check=False
        )
    else:
        print("⚠️  No backend tests found, skipping...")
    
    # Frontend tests
    if Path("frontend/package.json").exists():
        run_command(
            "cd frontend && npm test -- --watchAll=false",
            "Running frontend tests",
            check=False
        )
    else:
        print("⚠️  Frontend package.json not found, skipping frontend tests...")

def build_frontend():
    """Build frontend for production"""
    print("🏗️ Building frontend...")
    
    if Path("frontend/package.json").exists():
        run_command("cd frontend && npm install", "Installing frontend dependencies")
        run_command("cd frontend && npm run build", "Building frontend")
        print("✅ Frontend built successfully")
    else:
        print("⚠️  Frontend not found, skipping frontend build...")

def commit_and_push():
    """Commit changes and push to repository"""
    print("📤 Preparing to commit and push changes...")
    
    # Check if there are uncommitted changes
    result = run_command("git status --porcelain", "Checking for uncommitted changes", check=False)
    
    if result.stdout.strip():
        print("📝 Found uncommitted changes:")
        run_command("git status", "Showing git status")
        
        commit_message = input("Enter commit message (or press Enter for default): ").strip()
        if not commit_message:
            commit_message = "Security fixes and production deployment updates"
        
        run_command("git add .", "Staging changes")
        run_command(f'git commit -m "{commit_message}"', "Committing changes")
        
        # Ask if user wants to push
        should_push = input("Push changes to remote repository? (y/N): ").strip().lower()
        if should_push in ['y', 'yes']:
            run_command("git push", "Pushing changes to remote")
        else:
            print("⚠️  Changes committed locally but not pushed to remote.")
    else:
        print("✅ No uncommitted changes found")

def check_deployment_status(url):
    """Check if the deployed application is responding"""
    print(f"🔍 Checking deployment status at {url}...")
    
    max_attempts = 10
    for attempt in range(max_attempts):
        try:
            response = requests.get(f"{url}/health", timeout=10)
            if response.status_code == 200:
                print("✅ Deployment is healthy!")
                return True
        except requests.RequestException:
            pass
        
        if attempt < max_attempts - 1:
            print(f"⏳ Attempt {attempt + 1}/{max_attempts} failed, retrying in 30 seconds...")
            time.sleep(30)
    
    print("❌ Deployment health check failed")
    return False

def main():
    """Main deployment function"""
    print("🚀 Textile Printing Management System - Deployment Script")
    print("=" * 60)
    
    # Check prerequisites
    check_prerequisites()
    
    # Run security cleanup
    run_security_cleanup()
    
    # Setup environment
    setup_environment()
    
    # Run database migration
    run_database_migration()
    
    # Run tests
    run_tests()
    
    # Build frontend
    build_frontend()
    
    # Commit and push changes
    commit_and_push()
    
    print("\n🎉 Pre-deployment tasks completed!")
    print("\nNext steps:")
    print("1. 🌐 Deploy backend to Render.com using the updated render.yaml")
    print("2. 🎨 Deploy frontend to Netlify")
    print("3. 🔐 Change admin password after deployment")
    print("4. 🧪 Run production tests")
    
    # Optional: Check deployment status
    backend_url = input("\nEnter your backend URL to check deployment status (optional): ").strip()
    if backend_url:
        if not backend_url.startswith("http"):
            backend_url = f"https://{backend_url}"
        check_deployment_status(backend_url)
    
    print("\n✅ Deployment script completed!")

if __name__ == "__main__":
    main()