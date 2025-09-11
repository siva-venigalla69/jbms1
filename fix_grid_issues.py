#!/usr/bin/env python3
"""
Fix Material-UI Grid Issues
Replace problematic Grid components with Box layout
"""

import os
import re

def fix_grid_in_file(file_path):
    """Fix Grid issues in a single file"""
    print(f"🔧 Fixing Grid issues in: {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Remove Grid from imports
        content = re.sub(r'(\s+)Grid,\n', r'', content)
        content = re.sub(r',\s+Grid,', r',', content)
        
        # Replace Grid containers
        content = re.sub(
            r'<Grid container spacing=\{(\d+)\}(.*?)>',
            r'<Box sx={{ display: "flex", gap: \1, flexWrap: "wrap" }}\2>',
            content
        )
        
        # Replace Grid items with different patterns
        patterns = [
            (r'<Grid item xs=\{12\} sm=\{6\} md=\{3\}>', '<Box sx={{ flex: "1 1 300px", minWidth: "250px" }}>'),
            (r'<Grid item xs=\{12\} lg=\{8\}>', '<Box sx={{ flex: "2 1 600px" }}>'),
            (r'<Grid item xs=\{12\} lg=\{4\}>', '<Box sx={{ flex: "1 1 400px" }}>'), 
            (r'<Grid item xs=\{12\} md=\{6\}>', '<Box sx={{ flex: "1 1 400px" }}>'),
            (r'<Grid item xs=\{12\}>', '<Box sx={{ width: "100%" }}>'),
            (r'<Grid item>', '<Box>'),
        ]
        
        for pattern, replacement in patterns:
            content = re.sub(pattern, replacement, content)
        
        # Replace closing Grid tags
        content = re.sub(r'</Grid>', '</Box>', content)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"  ✅ Fixed Grid issues in {file_path}")
        return True
        
    except Exception as e:
        print(f"  ❌ Error fixing {file_path}: {e}")
        return False

def main():
    """Fix Grid issues in all relevant files"""
    files_to_fix = [
        'frontend/src/pages/DesignerDashboard.tsx',
        'frontend/src/pages/DesignLibrary.tsx', 
        'frontend/src/pages/DesignerWorkload.tsx',
        'frontend/src/pages/SchemaAnalysis.tsx'
    ]
    
    print("🚀 Starting Grid Issues Fix...")
    
    success_count = 0
    for file_path in files_to_fix:
        if os.path.exists(file_path):
            if fix_grid_in_file(file_path):
                success_count += 1
        else:
            print(f"⚠️  File not found: {file_path}")
    
    print(f"\n🎉 Fixed Grid issues in {success_count}/{len(files_to_fix)} files")
    print("🔨 You can now run 'npm run build' to test the fixes")

if __name__ == "__main__":
    main()