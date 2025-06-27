#!/usr/bin/env python3
"""
Deployment helper script for JBMS
Validates changes and provides deployment instructions
"""

import os
import subprocess
import sys
from pathlib import Path

def check_git_status():
    """Check git status for uncommitted changes"""
    try:
        result = subprocess.run(['git', 'status', '--porcelain'], 
                              capture_output=True, text=True)
        if result.stdout.strip():
            print("📝 Uncommitted changes found:")
            print(result.stdout)
            return False
        else:
            print("✅ All changes committed")
            return True
    except Exception as e:
        print(f"❌ Error checking git status: {e}")
        return False

def validate_files():
    """Validate that all required files exist and are properly formatted"""
    required_files = [
        'backend/app/services/numbering.py',
        'backend/app/api/expenses.py',
        'backend/app/models/models.py',
        'backend/app/schemas/schemas.py',
        'backend/app/main.py'
    ]
    
    missing_files = []
    for file_path in required_files:
        if not Path(file_path).exists():
            missing_files.append(file_path)
        else:
            print(f"✅ {file_path}")
    
    if missing_files:
        print(f"❌ Missing files: {missing_files}")
        return False
    
    return True

def check_api_imports():
    """Check that all API modules are properly imported in main.py"""
    try:
        with open('backend/app/main.py', 'r') as f:
            content = f.read()
            
        required_imports = [
            'expenses',
            'app.include_router(expenses.router'
        ]
        
        missing_imports = []
        for imp in required_imports:
            if imp not in content:
                missing_imports.append(imp)
        
        if missing_imports:
            print(f"❌ Missing imports in main.py: {missing_imports}")
            return False
        else:
            print("✅ All API modules properly imported")
            return True
            
    except Exception as e:
        print(f"❌ Error checking imports: {e}")
        return False

def generate_migration_script():
    """Generate the database migration script"""
    migration_sql = """
-- JBMS Database Migration Script
-- Run this on the production database after deployment

-- Add customer_id to material_in table
ALTER TABLE material_in ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Add customer_id to material_out table  
ALTER TABLE material_out ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Update existing material_in records to link customer_id from orders
UPDATE material_in 
SET customer_id = orders.customer_id 
FROM orders 
WHERE material_in.order_id = orders.id 
AND material_in.customer_id IS NULL;

-- Update existing material_out records to link customer_id from challans
UPDATE material_out 
SET customer_id = delivery_challans.customer_id 
FROM delivery_challans 
WHERE material_out.challan_id = delivery_challans.id 
AND material_out.customer_id IS NULL;

-- Verify the changes
SELECT 'material_in' as table_name, COUNT(*) as records_with_customer_id 
FROM material_in WHERE customer_id IS NOT NULL
UNION ALL
SELECT 'material_out' as table_name, COUNT(*) as records_with_customer_id 
FROM material_out WHERE customer_id IS NOT NULL;
"""
    
    with open('database_migration.sql', 'w') as f:
        f.write(migration_sql)
    
    print("✅ Generated database_migration.sql")

def main():
    print("JBMS Deployment Validation")
    print("=" * 40)
    
    # Validate files
    if not validate_files():
        print("❌ File validation failed")
        return False
    
    # Check imports
    if not check_api_imports():
        print("❌ Import validation failed")  
        return False
    
    # Generate migration script
    generate_migration_script()
    
    # Check git status
    git_clean = check_git_status()
    
    print("\n" + "=" * 40)
    print("DEPLOYMENT READY CHECKLIST")
    print("=" * 40)
    
    checklist = [
        ("✅" if validate_files() else "❌", "All required files exist"),
        ("✅" if check_api_imports() else "❌", "API imports are correct"),
        ("✅", "Database migration script generated"),
        ("✅" if git_clean else "⏳", "All changes committed"),
    ]
    
    for status, item in checklist:
        print(f"{status} {item}")
    
    if not git_clean:
        print(f"\n📋 Next steps:")
        print(f"1. Review and commit any remaining changes:")
        print(f"   git add .")
        print(f"   git commit -m 'feat: implement complete functional requirements'")
        print(f"2. Push to trigger deployment:")
        print(f"   git push origin main")
        print(f"3. Run database_migration.sql on production database")
        print(f"4. Test API functionality")
    else:
        print(f"\n🚀 Ready to deploy!")
        print(f"1. Push to trigger deployment: git push origin main")
        print(f"2. Run database_migration.sql on production database")
        print(f"3. Test API functionality with: python test_api_functionality.py")
    
    return True

if __name__ == "__main__":
    main() 