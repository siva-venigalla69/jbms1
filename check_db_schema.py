#!/usr/bin/env python3
"""
Comprehensive database schema checker
Compares current database schema with model definitions
"""

import sys
from sqlalchemy import text, inspect
from backend.app.core.database import engine
from backend.app.models.models import *

def check_current_schema():
    """Check current database schema"""
    try:
        with engine.connect() as connection:
            print("=== CURRENT DATABASE SCHEMA ===")
            
            # Get all tables
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """))
            
            tables = [row[0] for row in result.fetchall()]
            print(f"Tables found: {len(tables)}")
            for table in tables:
                print(f"  - {table}")
            
            print("\n=== TABLE COLUMNS ===")
            for table in tables:
                print(f"\n--- {table.upper()} ---")
                result = connection.execute(text(f"""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = '{table}'
                    ORDER BY ordinal_position;
                """))
                
                columns = result.fetchall()
                for col in columns:
                    nullable = "NULL" if col[2] == "YES" else "NOT NULL"
                    default = f" DEFAULT {col[3]}" if col[3] else ""
                    print(f"  {col[0]:<30} {col[1]:<20} {nullable}{default}")
            
            return tables
            
    except Exception as e:
        print(f"❌ Error checking schema: {str(e)}")
        return []

def check_required_columns():
    """Check for required columns based on our models"""
    
    required_schema = {
        'users': [
            'id', 'username', 'email', 'full_name', 'password_hash', 
            'role', 'is_active', 'created_at', 'updated_at'
        ],
        'customers': [
            'id', 'name', 'phone', 'email', 'address', 'gst_number',
            'is_deleted', 'created_by_user_id', 'updated_by_user_id',
            'created_at', 'updated_at'
        ],
        'orders': [
            'id', 'order_number', 'customer_id', 'order_date', 'status',
            'total_amount', 'notes', 'is_deleted', 'created_by_user_id',
            'updated_by_user_id', 'created_at', 'updated_at'
        ],
        'order_items': [
            'id', 'order_id', 'material_type', 'quantity', 'unit_price',
            'customization_details', 'current_stage', 'pre_treatment_completed_at',
            'pre_treatment_completed_by', 'printing_completed_at', 'printing_completed_by',
            'post_process_completed_at', 'post_process_completed_by',
            'is_deleted', 'created_at', 'updated_at'
        ],
        'material_in': [
            'id', 'order_id', 'customer_id', 'material_type', 'quantity',
            'unit', 'received_date', 'notes', 'created_by_user_id', 'created_at'
        ],
        'material_out': [
            'id', 'challan_id', 'customer_id', 'material_type', 'quantity',
            'dispatch_date', 'created_by_user_id', 'created_at'
        ],
        'delivery_challans': [
            'id', 'challan_number', 'customer_id', 'challan_date', 'total_quantity',
            'delivery_status', 'notes', 'is_deleted', 'created_by_user_id', 'created_at'
        ],
        'challan_items': [
            'id', 'challan_id', 'order_item_id', 'quantity', 'created_at'
        ],
        'gst_invoices': [
            'id', 'invoice_number', 'customer_id', 'invoice_date', 'subtotal',
            'cgst_rate', 'sgst_rate', 'igst_rate', 'cgst_amount', 'sgst_amount',
            'igst_amount', 'total_amount', 'outstanding_amount', 'notes',
            'is_deleted', 'created_by_user_id', 'created_at'
        ],
        'invoice_challans': [
            'id', 'invoice_id', 'challan_id', 'challan_amount', 'created_at'
        ],
        'payments': [
            'id', 'invoice_id', 'payment_date', 'amount', 'payment_method',
            'reference_number', 'notes', 'created_by_user_id', 'created_at'
        ],
        'returns': [
            'id', 'order_item_id', 'return_date', 'quantity', 'reason',
            'refund_amount', 'is_adjustment', 'adjustment_amount', 'notes',
            'is_deleted', 'created_by_user_id', 'created_at'
        ],
        'inventory': [
            'id', 'item_name', 'category', 'current_stock', 'unit',
            'reorder_level', 'cost_per_unit', 'supplier_name', 'supplier_contact',
            'is_active', 'is_deleted', 'last_updated', 'created_at',
            'created_by_user_id', 'updated_by_user_id'
        ],
        'expenses': [
            'id', 'expense_date', 'category', 'description', 'amount',
            'payment_method', 'reference_number', 'notes', 'is_deleted',
            'created_by_user_id', 'created_at'
        ],
        'audit_log': [
            'id', 'user_id', 'action', 'table_name', 'record_id',
            'old_values', 'new_values', 'changed_at'
        ]
    }
    
    return required_schema

def compare_schema():
    """Compare current schema with required schema"""
    try:
        with engine.connect() as connection:
            print("\n=== SCHEMA COMPARISON ===")
            
            required_schema = check_required_columns()
            missing_tables = []
            missing_columns = {}
            
            for table, required_cols in required_schema.items():
                # Check if table exists
                result = connection.execute(text(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = '{table}'
                    );
                """))
                
                table_exists = result.fetchone()[0]
                
                if not table_exists:
                    missing_tables.append(table)
                    print(f"❌ Table '{table}' is missing")
                    continue
                
                # Check columns
                result = connection.execute(text(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = '{table}';
                """))
                
                existing_cols = [row[0] for row in result.fetchall()]
                missing_cols = [col for col in required_cols if col not in existing_cols]
                
                if missing_cols:
                    missing_columns[table] = missing_cols
                    print(f"❌ Table '{table}' missing columns: {missing_cols}")
                else:
                    print(f"✅ Table '{table}' has all required columns")
            
            return missing_tables, missing_columns
            
    except Exception as e:
        print(f"❌ Error comparing schema: {str(e)}")
        return [], {}

def generate_migration_sql(missing_tables, missing_columns):
    """Generate SQL migration scripts"""
    
    migrations = []
    
    # Add missing columns
    column_types = {
        'customer_id': 'UUID REFERENCES customers(id)',
        'order_number': 'VARCHAR(50) UNIQUE NOT NULL',
        'challan_number': 'VARCHAR(50) UNIQUE NOT NULL', 
        'invoice_number': 'VARCHAR(50) UNIQUE NOT NULL',
        'supplier_name': 'VARCHAR(100)',
        'supplier_contact': 'VARCHAR(100)',
        'is_adjustment': 'BOOLEAN DEFAULT FALSE',
        'adjustment_amount': 'NUMERIC(10,2) DEFAULT 0'
    }
    
    for table, cols in missing_columns.items():
        for col in cols:
            if col in column_types:
                migrations.append(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {column_types[col]};")
            else:
                # Generic column addition - you may need to specify the correct type
                print(f"⚠️  Need to specify type for {table}.{col}")
    
    return migrations

def main():
    print("JBMS Database Schema Checker")
    print("="*50)
    
    # Check current schema
    current_tables = check_current_schema()
    
    # Compare with required schema
    missing_tables, missing_columns = compare_schema()
    
    # Generate migrations if needed
    if missing_tables or missing_columns:
        print(f"\n=== REQUIRED MIGRATIONS ===")
        migrations = generate_migration_sql(missing_tables, missing_columns)
        
        if migrations:
            print("SQL Migration Scripts:")
            for i, sql in enumerate(migrations, 1):
                print(f"{i}. {sql}")
        
        print(f"\nSummary:")
        print(f"  Missing tables: {len(missing_tables)}")
        print(f"  Tables with missing columns: {len(missing_columns)}")
        
    else:
        print("\n✅ Database schema is up to date!")

if __name__ == "__main__":
    main() 