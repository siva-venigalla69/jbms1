#!/bin/bash

echo "🧹 CLEANING UP UNNECESSARY SQL FILES"
echo "======================================"

# Array of files to remove (these are redundant/outdated)
FILES_TO_REMOVE=(
    "./AUDIT_TRAIL_SCHEMA.sql"
    "./COMPLETE_SCHEMA_MIGRATION.sql" 
    "./DEBUG_DATABASE_STRUCTURE.sql"
    "./DELIVERY_CHALLAN_FINAL_FIX.sql"
    "./DELIVERY_CHALLAN_SCHEMA_FIX.sql"
    "./DELIVERY_CHALLAN_SCHEMA_FIX_CORRECTED.sql"
    "./DELIVERY_CHALLAN_SCHEMA_FIX_SIMPLE.sql"
    "./MATERIAL_STOCK_SCHEMA.sql"
    "./PRODUCTION_STAGE_MIGRATION.sql"
    "./QUICK_FIX_MIGRATION.sql"
    "./QUICK_STOCK_DEBUG.sql"
    "./RECALCULATE_STOCK_FIX.sql"
    "./SIMPLE_STOCK_CHECK.sql"
    "./database_fixes.sql"
)

echo "Files to be removed:"
for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -f "$file" ]; then
        echo "  ❌ $file (exists)"
    else
        echo "  ⚪ $file (not found)"
    fi
done

echo ""
read -p "Do you want to proceed with deletion? (y/N): " confirm

if [[ $confirm =~ ^[Yy]$ ]]; then
    echo ""
    echo "Removing files..."
    
    removed_count=0
    for file in "${FILES_TO_REMOVE[@]}"; do
        if [ -f "$file" ]; then
            rm "$file"
            echo "  ✅ Removed: $file"
            ((removed_count++))
        else
            echo "  ⚪ Not found: $file"
        fi
    done
    
    echo ""
    echo "🎉 CLEANUP COMPLETED!"
    echo "📊 Removed $removed_count files"
    echo ""
    echo "REMAINING SQL FILES (these are needed):"
    echo "├── CLEAN_2_COLUMN_MIGRATION.sql (for existing deployments)" 
    echo "├── CLEAN_2_COLUMN_MIGRATION_WITH_DEPENDENCIES.sql (dependency cleanup)"
    echo "└── ../db/migrations/ (production deployment scripts)"
    echo "    ├── 01_COMPLETE_SCHEMA_CREATION.sql"
    echo "    ├── 02_INDEXES_AND_CONSTRAINTS.sql"
    echo "    ├── 03_VIEWS_AND_FUNCTIONS.sql"
    echo "    ├── 04_REFERENCE_DATA.sql"
    echo "    ├── 05_TRIGGERS_AND_POLICIES.sql"
    echo "    ├── 06_MIGRATION_VALIDATION.sql"
    echo "    └── 07_DELIVERY_TRACKING_ENHANCEMENTS.sql"
    
else
    echo ""
    echo "❌ Cleanup cancelled. No files were removed."
fi

echo ""
echo "📋 NEXT STEPS:"
echo "1. Run the cleanup script if you haven't: ./cleanup_unnecessary_sqls.sh"
echo "2. For existing deployments with dependency errors:"
echo "   → Run: CLEAN_2_COLUMN_MIGRATION_WITH_DEPENDENCIES.sql"
echo "3. For new deployments:"
echo "   → Run scripts 01-07 from ../db/migrations/ in order"