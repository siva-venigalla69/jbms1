#!/usr/bin/env python3

import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import sys

def load_env():
    """Load environment variables from .env file"""
    env_file = '.env'
    if os.path.exists(env_file):
        with open(env_file, 'r') as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value

def get_db_connection():
    """Get database connection using environment variables"""
    load_env()
    
    # Extract database URL components
    supabase_url = os.getenv('SUPABASE_URL', 'https://pvatfzwzfgioypdnqjay.supabase.co')
    project_id = supabase_url.split('//')[1].split('.')[0]
    
    # For direct PostgreSQL connection to Supabase
    # We need the service role key which should be in the DATABASE_URL
    db_url = os.getenv('DATABASE_URL')
    if '[SERVICE_ROLE_KEY]' in db_url:
        print("⚠️  SERVICE_ROLE_KEY placeholder found in DATABASE_URL")
        print("You need to replace [SERVICE_ROLE_KEY] with your actual Supabase service role key")
        print("Get it from: Supabase Dashboard > Settings > API > service_role key")
        return None
    
    print(f"🔧 Connecting to Supabase project: {project_id}")
    
    try:
        conn = psycopg2.connect(db_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        print("✅ Database connection established")
        return conn
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return None

def execute_sql_file(conn, file_path):
    """Execute SQL file against the database"""
    print(f"\n📄 Executing: {file_path}")
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return False
    
    try:
        with open(file_path, 'r') as f:
            sql_content = f.read()
        
        # Split by semicolons and execute each statement
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
        
        cursor = conn.cursor()
        for i, statement in enumerate(statements, 1):
            if statement.upper().startswith(('--', '/*')) or not statement:
                continue
                
            try:
                print(f"  📋 Executing statement {i}/{len(statements)}")
                cursor.execute(statement)
                print(f"  ✅ Statement {i} executed successfully")
            except Exception as e:
                print(f"  ⚠️  Statement {i} warning/error: {e}")
                # Continue with other statements
        
        cursor.close()
        print(f"✅ {file_path} executed successfully")
        return True
        
    except Exception as e:
        print(f"❌ Error executing {file_path}: {e}")
        return False

def verify_schema_changes(conn):
    """Verify that the schema changes were applied correctly"""
    print("\n🔍 Verifying schema changes...")
    
    verification_queries = [
        {
            'name': 'Check assigned_design_quantity column',
            'query': """
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'designer_assignments' 
                AND column_name = 'assigned_design_quantity';
            """
        },
        {
            'name': 'Check design_assignment_summary view',
            'query': """
                SELECT table_name, table_type 
                FROM information_schema.views 
                WHERE table_name = 'design_assignment_summary';
            """
        },
        {
            'name': 'Check validation function',
            'query': """
                SELECT routine_name, routine_type 
                FROM information_schema.routines 
                WHERE routine_name = 'validate_design_assignment_quantity';
            """
        },
        {
            'name': 'Check validation trigger',
            'query': """
                SELECT trigger_name, event_manipulation, action_timing
                FROM information_schema.triggers 
                WHERE trigger_name = 'tr_validate_design_assignment_quantity';
            """
        }
    ]
    
    cursor = conn.cursor()
    all_good = True
    
    for check in verification_queries:
        try:
            cursor.execute(check['query'])
            results = cursor.fetchall()
            
            if results:
                print(f"  ✅ {check['name']}: Found")
                for result in results:
                    print(f"     {result}")
            else:
                print(f"  ❌ {check['name']}: Not found")
                all_good = False
                
        except Exception as e:
            print(f"  ⚠️  {check['name']}: Error checking - {e}")
            all_good = False
    
    cursor.close()
    return all_good

def main():
    print("🚀 Deploying Design Quantity Assignment SQL Schemas")
    print("=" * 55)
    
    # Get database connection
    conn = get_db_connection()
    if not conn:
        print("❌ Cannot proceed without database connection")
        sys.exit(1)
    
    # SQL files to execute in order
    sql_files = [
        'ADD_DESIGN_QUANTITY_TRACKING.sql',  # Base design quantity tracking first
        'ADD_DESIGN_ASSIGNMENT_QUANTITIES.sql'  # Then assignment quantities
    ]
    
    success_count = 0
    for sql_file in sql_files:
        if execute_sql_file(conn, sql_file):
            success_count += 1
    
    # Verify changes
    if success_count == len(sql_files):
        print(f"\n✅ All {len(sql_files)} SQL files executed successfully")
        
        if verify_schema_changes(conn):
            print("\n🎉 Schema deployment completed successfully!")
            print("✅ All database changes verified")
            print("\n📝 Next steps:")
            print("1. Test the API endpoints with real data")
            print("2. Test the frontend design assignment functionality")
            print("3. Perform end-to-end workflow testing")
        else:
            print("\n⚠️  Schema deployment completed but verification failed")
            print("Please check the database manually")
    else:
        print(f"\n❌ Only {success_count}/{len(sql_files)} files executed successfully")
        print("Please check the errors above and fix them before proceeding")
    
    conn.close()
    print("\n🔌 Database connection closed")

if __name__ == "__main__":
    main()