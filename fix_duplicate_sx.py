#!/usr/bin/env python3
"""
Fix duplicate sx attributes in React components
"""

import re
import os

def fix_duplicate_sx(file_path):
    """Fix duplicate sx attributes"""
    print(f"🔧 Fixing duplicate sx in: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix duplicate sx patterns - merge them
    patterns = [
        # Pattern: sx={...} sx={...}
        (r'sx=\{\{([^}]+)\}\}\s+sx=\{\{([^}]+)\}\}', r'sx={{ \1, \2 }}'),
        # Pattern: sx={{...}} sx={{...}}
        (r'sx=\{\{\s*([^}]+?)\s*\}\}\s+sx=\{\{\s*([^}]+?)\s*\}\}', r'sx={{ \1, \2 }}'),
    ]
    
    for pattern, replacement in patterns:
        content = re.sub(pattern, replacement, content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"  ✅ Fixed duplicate sx in {file_path}")

def main():
    files_to_fix = [
        'frontend/src/pages/DesignLibrary.tsx',
        'frontend/src/pages/DesignerWorkload.tsx', 
        'frontend/src/pages/SchemaAnalysis.tsx',
        'frontend/src/pages/DesignerDashboard.tsx'
    ]
    
    for file_path in files_to_fix:
        if os.path.exists(file_path):
            fix_duplicate_sx(file_path)
        else:
            print(f"⚠️  File not found: {file_path}")

if __name__ == "__main__":
    main()