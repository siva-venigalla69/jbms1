#!/usr/bin/env python3
"""
Fix remaining Grid issues in React components
"""

import re
import os

def fix_remaining_grids(file_path):
    """Fix remaining Grid components"""
    print(f"🔧 Fixing remaining Grids in: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace specific Grid patterns that weren't caught
    replacements = [
        # Remove Grid from imports completely
        (r'(\s+)Grid,\n', ''),
        (r',\s+Grid,', ','),
        
        # Replace Grid item patterns
        (r'<Grid item xs=\{12\} md=\{4\}>', '<Box sx={{ flex: "1 1 300px" }}>'),
        (r'<Grid item xs=\{12\} sm=\{6\} md=\{4\} key=\{([^}]+)\}>', r'<Box key={\1} sx={{ flex: "1 1 300px" }}>'),
        (r'<Grid item xs=\{6\}>', '<Box sx={{ flex: "1 1 150px" }}>'),
        (r'<Grid item xs=\{12\} sm=\{6\} md=\{2\.4\}>', '<Box sx={{ flex: "1 1 200px" }}>'),
        
        # Close Grid tags
        (r'</Grid>', '</Box>'),
        
        # Fix any duplicate sx props
        (r'sx=\{[^}]+\}\s+sx=\{([^}]+)\}', r'sx={\1}'),
    ]
    
    for pattern, replacement in replacements:
        content = re.sub(pattern, replacement, content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"  ✅ Fixed remaining Grids in {file_path}")

def main():
    files_to_fix = [
        'frontend/src/pages/DesignLibrary.tsx',
        'frontend/src/pages/DesignerWorkload.tsx', 
        'frontend/src/pages/SchemaAnalysis.tsx'
    ]
    
    for file_path in files_to_fix:
        if os.path.exists(file_path):
            fix_remaining_grids(file_path)
        else:
            print(f"⚠️  File not found: {file_path}")

if __name__ == "__main__":
    main()