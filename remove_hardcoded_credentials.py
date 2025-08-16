#!/usr/bin/env python3
"""
Security Fix Script: Remove all hardcoded passwords and sensitive data
This script will clean up hardcoded credentials from the codebase.
"""
import os
import re
import glob
from pathlib import Path

# Patterns to identify hardcoded credentials
SENSITIVE_PATTERNS = [
    r'"Siri@2299"',
    r"'Siri@2299'",
    r'password\s*=\s*["\'][^"\']+["\']',
    r'PASSWORD\s*=\s*["\'][^"\']+["\']',
    r'admin_password\s*=\s*["\'][^"\']+["\']',
    r'database_url\s*=\s*["\']postgresql://[^"\']+["\']',
    r'DATABASE_URL\s*=\s*["\']postgresql://[^"\']+["\']',
]

# Files to exclude from cleaning (documentation, etc.)
EXCLUDE_PATTERNS = [
    '*.md',
    '*.json',
    '*.backup',
    'node_modules/*',
    '.git/*',
    '__pycache__/*',
    '*.pyc',
    'remove_hardcoded_credentials.py'
]

def should_exclude_file(file_path):
    """Check if file should be excluded from cleaning"""
    for pattern in EXCLUDE_PATTERNS:
        if file_path.match(pattern) or any(part.startswith('.') for part in file_path.parts):
            return True
    return False

def clean_file(file_path):
    """Clean hardcoded credentials from a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        changes_made = []
        
        # Replace hardcoded password
        if '"Siri@2299"' in content or "'Siri@2299'" in content:
            content = content.replace('"Siri@2299"', 'os.getenv("ADMIN_PASSWORD", "change_me")')
            content = content.replace("'Siri@2299'", 'os.getenv("ADMIN_PASSWORD", "change_me")')
            changes_made.append("Replaced hardcoded admin password")
        
        # Replace password assignments
        for pattern in SENSITIVE_PATTERNS[2:]:  # Skip the Siri@2299 patterns already handled
            if re.search(pattern, content, re.IGNORECASE):
                if 'password' in pattern.lower():
                    content = re.sub(pattern, 'password=os.getenv("ADMIN_PASSWORD", "change_me")', content, flags=re.IGNORECASE)
                    changes_made.append(f"Replaced password assignment matching {pattern}")
                elif 'database_url' in pattern.lower():
                    content = re.sub(pattern, 'database_url=os.getenv("DATABASE_URL")', content, flags=re.IGNORECASE)
                    changes_made.append(f"Replaced database URL matching {pattern}")
        
        # Add import os if needed and changes were made
        if changes_made and 'import os' not in content and 'from os import' not in content:
            if content.startswith('#!/usr/bin/env python3'):
                lines = content.split('\n')
                # Insert after shebang and docstring
                insert_index = 1
                while insert_index < len(lines) and (lines[insert_index].startswith('"""') or lines[insert_index].startswith("'''")):
                    # Find end of docstring
                    if lines[insert_index].count('"""') == 2 or lines[insert_index].count("'''") == 2:
                        insert_index += 1
                        break
                    insert_index += 1
                    while insert_index < len(lines) and not (lines[insert_index].endswith('"""') or lines[insert_index].endswith("'''")):
                        insert_index += 1
                    insert_index += 1
                    break
                lines.insert(insert_index, 'import os')
                content = '\n'.join(lines)
            else:
                content = 'import os\n' + content
            changes_made.append("Added 'import os'")
        
        # Write back if changes were made
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Cleaned {file_path}")
            for change in changes_made:
                print(f"   - {change}")
            return True
        
    except Exception as e:
        print(f"❌ Error cleaning {file_path}: {e}")
        return False
    
    return False

def main():
    """Main function to clean all files"""
    print("🔒 Starting security cleanup - removing hardcoded credentials...")
    
    cleaned_files = 0
    total_files = 0
    
    # Find all Python files
    for file_path in Path('.').rglob('*.py'):
        if should_exclude_file(file_path):
            continue
            
        total_files += 1
        if clean_file(file_path):
            cleaned_files += 1
    
    print(f"\n📊 Summary:")
    print(f"   Total Python files processed: {total_files}")
    print(f"   Files cleaned: {cleaned_files}")
    
    if cleaned_files > 0:
        print(f"\n⚠️  Important: Update your environment variables:")
        print(f"   ADMIN_PASSWORD=<your_secure_password>")
        print(f"   DATABASE_URL=<your_database_url>")
        print(f"\n🔄 Files modified. Please review changes before committing.")
    else:
        print(f"\n✅ No hardcoded credentials found.")

if __name__ == "__main__":
    main()