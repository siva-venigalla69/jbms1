#!/usr/bin/env python3
"""
Database Schema Extraction and Analysis Tool
Extracts current schema from Supabase and compares with proposed changes
"""

import os
import json
import sys
from datetime import datetime
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_supabase_client():
    """Get authenticated Supabase client"""
    url = os.getenv('REACT_APP_SUPABASE_URL')
    key = os.getenv('REACT_APP_SUPABASE_ANON_KEY')

    if not url or not key:
        print("❌ Error: Supabase credentials not found")
        return None

    return create_client(url, key)

def extract_tables_schema(supabase):
    """Extract all tables and their schemas"""
    print("📊 Extracting table schemas...")

    # Get all tables in public schema
    tables_query = """
    SELECT
        table_name,
        table_type
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
    """

    try:
        result = supabase.rpc('exec_sql', {'query': tables_query}).execute()
        if result.data:
            return [row['table_name'] for row in result.data]
    except Exception as e:
        print(f"⚠️  Using fallback method: {str(e)}")

    # Fallback: Try to query known tables
    known_tables = [
        'customers', 'orders', 'order_items', 'delivery_challans',
        'delivery_challan_items', 'gst_invoices', 'payments',
        'material_in', 'employees', 'expenses', 'purchases',
        'production_batches'  # Check if this already exists
    ]

    existing_tables = []
    for table in known_tables:
        try:
            supabase.table(table).select('*').limit(0).execute()
            existing_tables.append(table)
            print(f"✅ Found table: {table}")
        except Exception:
            print(f"❌ Table not found: {table}")

    return existing_tables

def extract_table_columns(supabase, table_name):
    """Extract column details for a specific table"""
    print(f"🔍 Analyzing table: {table_name}")

    columns_query = f"""
    SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = '{table_name}'
    ORDER BY ordinal_position;
    """

    try:
        result = supabase.rpc('exec_sql', {'query': columns_query}).execute()
        if result.data:
            return result.data
    except Exception as e:
        print(f"⚠️  Could not get columns for {table_name}: {str(e)}")

    # Fallback: Try to infer from sample data
    try:
        sample = supabase.table(table_name).select('*').limit(1).execute()
        if sample.data and len(sample.data) > 0:
            columns = []
            for col, value in sample.data[0].items():
                columns.append({
                    'column_name': col,
                    'data_type': type(value).__name__ if value else 'unknown',
                    'sample_value': str(value)[:50] if value else None
                })
            return columns
    except Exception as e:
        print(f"⚠️  Could not infer columns for {table_name}: {str(e)}")

    return []

def extract_foreign_keys(supabase):
    """Extract foreign key relationships"""
    print("🔗 Extracting foreign key relationships...")

    fk_query = """
    SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public';
    """

    try:
        result = supabase.rpc('exec_sql', {'query': fk_query}).execute()
        return result.data if result.data else []
    except Exception as e:
        print(f"⚠️  Could not extract foreign keys: {str(e)}")
        return []

def check_functions_and_triggers(supabase):
    """Check for existing functions and triggers"""
    print("⚙️  Checking functions and triggers...")

    functions_query = """
    SELECT routine_name, routine_type
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    ORDER BY routine_name;
    """

    triggers_query = """
    SELECT trigger_name, event_object_table, action_timing, event_manipulation
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY trigger_name;
    """

    functions = []
    triggers = []

    try:
        func_result = supabase.rpc('exec_sql', {'query': functions_query}).execute()
        functions = func_result.data if func_result.data else []
    except Exception as e:
        print(f"⚠️  Could not get functions: {str(e)}")

    try:
        trig_result = supabase.rpc('exec_sql', {'query': triggers_query}).execute()
        triggers = trig_result.data if trig_result.data else []
    except Exception as e:
        print(f"⚠️  Could not get triggers: {str(e)}")

    return functions, triggers

def generate_schema_report(schema_data):
    """Generate a comprehensive schema report"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_file = f'CURRENT_SCHEMA_REPORT_{timestamp}.md'

    with open(report_file, 'w') as f:
        f.write(f"# Database Schema Report\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

        # Tables overview
        f.write("## 📋 Tables Overview\n\n")
        f.write(f"Total tables found: {len(schema_data['tables'])}\n\n")

        for table in schema_data['tables']:
            f.write(f"- ✅ `{table}`\n")
        f.write("\n")

        # Detailed table schemas
        f.write("## 🗂️ Table Schemas\n\n")
        for table, columns in schema_data['table_details'].items():
            f.write(f"### `{table}`\n\n")
            if columns:
                f.write("| Column | Type | Nullable | Default |\n")
                f.write("|--------|------|----------|----------|\n")
                for col in columns:
                    nullable = "✅" if col.get('is_nullable') == 'YES' else "❌"
                    default = col.get('column_default', '') or ''
                    f.write(f"| `{col['column_name']}` | `{col['data_type']}` | {nullable} | `{default}` |\n")
            else:
                f.write("*Could not extract column details*\n")
            f.write("\n")

        # Foreign keys
        if schema_data['foreign_keys']:
            f.write("## 🔗 Foreign Key Relationships\n\n")
            for fk in schema_data['foreign_keys']:
                f.write(f"- `{fk['table_name']}.{fk['column_name']}` → `{fk['foreign_table_name']}.{fk['foreign_column_name']}`\n")
            f.write("\n")

        # Functions
        if schema_data['functions']:
            f.write("## ⚙️ Database Functions\n\n")
            for func in schema_data['functions']:
                f.write(f"- `{func['routine_name']}` ({func['routine_type']})\n")
            f.write("\n")

        # Triggers
        if schema_data['triggers']:
            f.write("## 🔄 Database Triggers\n\n")
            for trig in schema_data['triggers']:
                f.write(f"- `{trig['trigger_name']}` on `{trig['event_object_table']}` ({trig['action_timing']} {trig['event_manipulation']})\n")
            f.write("\n")

        # Production batch analysis
        f.write("## 🏭 Production Batch Analysis\n\n")
        if 'production_batches' in schema_data['tables']:
            f.write("✅ **production_batches table EXISTS**\n")
            f.write("- Schema is already deployed\n")
            f.write("- Ready for frontend integration\n")
        else:
            f.write("❌ **production_batches table MISSING**\n")
            f.write("- Need to deploy PRODUCTION_BATCH_SCHEMA.sql\n")
            f.write("- Required for multi-batch functionality\n")
        f.write("\n")

        # Next steps
        f.write("## 🚀 Recommended Next Steps\n\n")
        if 'production_batches' not in schema_data['tables']:
            f.write("1. Deploy `PRODUCTION_BATCH_SCHEMA.sql` to add production batch functionality\n")
            f.write("2. Verify deployment with this tool\n")
            f.write("3. Test frontend integration\n")
        else:
            f.write("1. ✅ Schema is ready for frontend development\n")
            f.write("2. Implement frontend components\n")
            f.write("3. Test end-to-end workflow\n")

    print(f"📄 Schema report generated: {report_file}")
    return report_file

def main():
    print("🔍 Database Schema Extraction Tool")
    print("=" * 50)

    # Connect to Supabase
    supabase = get_supabase_client()
    if not supabase:
        return

    print("✅ Connected to Supabase")

    # Extract schema data
    schema_data = {
        'timestamp': datetime.now().isoformat(),
        'tables': [],
        'table_details': {},
        'foreign_keys': [],
        'functions': [],
        'triggers': []
    }

    # Get tables
    schema_data['tables'] = extract_tables_schema(supabase)

    # Get table details
    for table in schema_data['tables']:
        schema_data['table_details'][table] = extract_table_columns(supabase, table)

    # Get foreign keys
    schema_data['foreign_keys'] = extract_foreign_keys(supabase)

    # Get functions and triggers
    schema_data['functions'], schema_data['triggers'] = check_functions_and_triggers(supabase)

    # Generate report
    report_file = generate_schema_report(schema_data)

    # Save raw data
    json_file = f"schema_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(json_file, 'w') as f:
        json.dump(schema_data, f, indent=2)

    print(f"📊 Raw data saved: {json_file}")
    print("\n🎯 Summary:")
    print(f"- Found {len(schema_data['tables'])} tables")
    print(f"- Found {len(schema_data['foreign_keys'])} foreign keys")
    print(f"- Found {len(schema_data['functions'])} functions")
    print(f"- Found {len(schema_data['triggers'])} triggers")

    # Key finding
    if 'production_batches' in schema_data['tables']:
        print("✅ production_batches table EXISTS - Ready for frontend work!")
    else:
        print("❌ production_batches table MISSING - Deploy schema first!")

if __name__ == "__main__":
    main()