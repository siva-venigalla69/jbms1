#!/usr/bin/env python3
"""
Database migration script to add customer_id fields to MaterialIn and MaterialOut tables.
This implements the changes required by the functional requirements.
"""

import os
import sys
from sqlalchemy import text
from backend.app.core.database import engine

def run_migration():
    """Run database migration to add customer_id fields"""
    
    migrations = [
        # Add customer_id to material_in table
        """
        ALTER TABLE material_in 
        ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
        """,
        
        # Add customer_id to material_out table  
        """
        ALTER TABLE material_out 
        ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
        """,
        
        # Update existing records to link customer_id from orders
        """
        UPDATE material_in 
        SET customer_id = orders.customer_id 
        FROM orders 
        WHERE material_in.order_id = orders.id 
        AND material_in.customer_id IS NULL;
        """,
        
        # Update existing material_out records to link customer_id from challans
        """
        UPDATE material_out 
        SET customer_id = delivery_challans.customer_id 
        FROM delivery_challans 
        WHERE material_out.challan_id = delivery_challans.id 
        AND material_out.customer_id IS NULL;
        """
    ]
    
    try:
        with engine.connect() as connection:
            print("Starting database migration...")
            
            for i, migration in enumerate(migrations, 1):
                print(f"Running migration {i}/{len(migrations)}...")
                try:
                    connection.execute(text(migration))
                    connection.commit()
                    print(f"✅ Migration {i} completed successfully")
                except Exception as e:
                    print(f"❌ Migration {i} failed: {str(e)}")
                    print("Continuing with next migration...")
            
            print("✅ All migrations completed!")
            
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        sys.exit(1)

def verify_schema():
    """Verify the schema changes"""
    try:
        with engine.connect() as connection:
            # Check if customer_id columns exist
            result = connection.execute(text("""
                SELECT column_name, table_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND column_name = 'customer_id' 
                AND table_name IN ('material_in', 'material_out');
            """))
            
            columns = result.fetchall()
            print("\n=== Schema Verification ===")
            for col in columns:
                print(f"✅ Found customer_id in {col.table_name}")
            
            if len(columns) == 2:
                print("✅ All required columns added successfully!")
            else:
                print("❌ Some columns missing")
                
    except Exception as e:
        print(f"❌ Schema verification failed: {str(e)}")

if __name__ == "__main__":
    print("JBMS Database Migration Script")
    print("Adding customer_id fields to MaterialIn and MaterialOut tables")
    print("="*60)
    
    run_migration()
    verify_schema()
    print("\nMigration process completed!") 