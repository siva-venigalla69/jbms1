#!/usr/bin/env python3
"""
Remove Hardcoded Passwords Script
Finds and helps remove hardcoded passwords from codebase
"""
import os
import re
import glob
from pathlib import Path

def find_hardcoded_passwords():
    """Find files containing hardcoded passwords"""
    password_patterns = [
        r'"Siri@\d+"',
        r"'Siri@\d+'",
        r'password.*=.*["\']Siri@\d+["\']',
        r'PASSWORD.*=.*["\']Siri@\d+["\']',
    ]
    
    dangerous_files = []
    
    # Files to check
    python_files = glob.glob("**/*.py", recursive=True)
    js_files = glob.glob("**/*.js", recursive=True)
    ts_files = glob.glob("**/*.ts", recursive=True)
    tsx_files = glob.glob("**/*.tsx", recursive=True)
    html_files = glob.glob("**/*.html", recursive=True)
    
    all_files = python_files + js_files + ts_files + tsx_files + html_files
    
    for file_path in all_files:
        # Skip binary files and node_modules
        if any(skip in file_path for skip in ['node_modules', '.git', '__pycache__', '.pyc']):
            continue
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
                for pattern in password_patterns:
                    matches = re.findall(pattern, content, re.IGNORECASE)
                    if matches:
                        line_numbers = []
                        for i, line in enumerate(content.split('\n'), 1):
                            if re.search(pattern, line, re.IGNORECASE):
                                line_numbers.append(i)
                        
                        dangerous_files.append({
                            'file': file_path,
                            'matches': matches,
                            'lines': line_numbers,
                            'pattern': pattern
                        })
                        
        except (UnicodeDecodeError, PermissionError):
            # Skip binary files or files we can't read
            continue
    
    return dangerous_files

def create_secure_test_config():
    """Create secure test configuration"""
    config_content = '''# Test Configuration
# Use environment variables for sensitive data

import os

# Test credentials - should be set via environment variables
TEST_USERNAME = os.getenv("TEST_USERNAME", "admin")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "change-this-password")
TEST_BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")

# Production URLs
PRODUCTION_BASE_URL = os.getenv("PRODUCTION_BASE_URL", "https://jbms1.onrender.com")

# Security notice
if TEST_PASSWORD == "change-this-password":
    print("⚠️  WARNING: Using default test password. Set TEST_PASSWORD environment variable.")

def get_test_credentials():
    """Get test credentials from environment"""
    return {
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD,
        "base_url": TEST_BASE_URL
    }
'''
    
    with open('test_config.py', 'w') as f:
        f.write(config_content)
    
    print("✅ Created secure test configuration: test_config.py")

def create_env_template():
    """Create .env template for testing"""
    env_template = '''# Test Environment Variables
# Copy this to .env.local for local testing

TEST_USERNAME=admin
TEST_PASSWORD=your-secure-password-here
TEST_BASE_URL=http://localhost:8000
PRODUCTION_BASE_URL=https://jbms1.onrender.com

# Database (for local testing)
DATABASE_URL=postgresql://user:password@localhost:5432/textile_printing_local
SECRET_KEY=local-development-secret-key-32-chars-minimum
'''
    
    with open('.env.template', 'w') as f:
        f.write(env_template)
    
    print("✅ Created environment template: .env.template")

def suggest_fixes(dangerous_files):
    """Suggest how to fix each file"""
    print("\n🔧 SUGGESTED FIXES:")
    print("=" * 50)
    
    for item in dangerous_files:
        print(f"\n📄 File: {item['file']}")
        print(f"🔍 Lines: {', '.join(map(str, item['lines']))}")
        print(f"⚠️  Found: {item['matches']}")
        
        # Suggest fix based on file type
        if item['file'].endswith('.py'):
            print("💡 Python Fix:")
            print("   Replace hardcoded password with:")
            print("   import os")
            print("   password = os.getenv('TEST_PASSWORD', 'default-password')")
            
        elif item['file'].endswith(('.js', '.ts', '.tsx')):
            print("💡 JavaScript/TypeScript Fix:")
            print("   Replace hardcoded password with:")
            print("   const password = process.env.REACT_APP_TEST_PASSWORD || 'default-password'")
            
        elif item['file'].endswith('.html'):
            print("💡 HTML Fix:")
            print("   Replace hardcoded password with prompt or config")
            
        print("   📝 Consider using environment variables or config files")

def main():
    """Main function"""
    print("🔍 Scanning for hardcoded passwords...")
    
    dangerous_files = find_hardcoded_passwords()
    
    if not dangerous_files:
        print("✅ No hardcoded passwords found!")
        return
    
    print(f"\n❌ Found {len(dangerous_files)} files with hardcoded passwords:")
    
    for item in dangerous_files:
        print(f"  • {item['file']} (lines: {', '.join(map(str, item['lines']))})")
    
    suggest_fixes(dangerous_files)
    
    # Create secure alternatives
    print("\n📁 Creating secure configuration files...")
    create_secure_test_config()
    create_env_template()
    
    print("\n📋 NEXT STEPS:")
    print("1. Review each flagged file")
    print("2. Replace hardcoded passwords with environment variables")
    print("3. Use test_config.py for test files")
    print("4. Set TEST_PASSWORD environment variable")
    print("5. Test that everything still works")
    print("6. Commit changes to version control")
    
    print("\n⚠️  SECURITY REMINDER:")
    print("• Never commit real passwords to version control")
    print("• Use different passwords for development/testing/production")
    print("• Rotate passwords regularly")
    print("• Use strong, unique passwords")

if __name__ == "__main__":
    main() 