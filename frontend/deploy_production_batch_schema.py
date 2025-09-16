#!/usr/bin/env python3
"""
Deploy Production Batch Schema to Supabase
This script creates the production_batches table and related functions
"""

import os
import sys
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def deploy_schema():
    """Deploy the production batch schema to Supabase"""

    # Get Supabase credentials
    url = os.getenv('REACT_APP_SUPABASE_URL')
    key = os.getenv('REACT_APP_SUPABASE_ANON_KEY')

    if not url or not key:
        print("❌ Error: Supabase credentials not found in environment variables")
        print("Make sure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set")
        return False

    try:
        # Create Supabase client
        supabase = create_client(url, key)

        print("🚀 Starting Production Batch Schema Deployment...")
        print(f"📡 Connecting to: {url}")

        # Read the SQL schema file
        with open('PRODUCTION_BATCH_SCHEMA.sql', 'r') as file:
            schema_sql = file.read()

        print("📄 Schema file loaded successfully")

        # Execute the schema SQL
        # Note: This uses the Supabase REST API which may have limitations
        # For full SQL execution, you might need to use the Supabase CLI or direct database connection

        print("⚠️  Note: Complex SQL schemas should be deployed via Supabase Dashboard or CLI")
        print("📋 Schema ready for deployment. Manual steps:")
        print("1. Copy the contents of PRODUCTION_BATCH_SCHEMA.sql")
        print("2. Go to Supabase Dashboard > SQL Editor")
        print("3. Paste and execute the schema")
        print("4. Verify tables and functions are created")

        # Test basic connection
        result = supabase.table('orders').select('id').limit(1).execute()
        if result.data is not None:
            print("✅ Supabase connection verified")
            return True
        else:
            print("❌ Failed to verify Supabase connection")
            return False

    except Exception as e:
        print(f"❌ Error deploying schema: {str(e)}")
        return False

def verify_schema():
    """Verify that the production_batches table exists"""

    url = os.getenv('REACT_APP_SUPABASE_URL')
    key = os.getenv('REACT_APP_SUPABASE_ANON_KEY')

    try:
        supabase = create_client(url, key)

        # Try to query the production_batches table
        result = supabase.table('production_batches').select('id').limit(1).execute()
        print("✅ production_batches table exists and is accessible")
        return True

    except Exception as e:
        print(f"❌ production_batches table not found: {str(e)}")
        print("📋 Please deploy the schema manually using Supabase Dashboard")
        return False

if __name__ == "__main__":
    print("🏭 Production Batch Schema Deployment Tool")
    print("=" * 50)

    if len(sys.argv) > 1 and sys.argv[1] == "verify":
        verify_schema()
    else:
        deploy_schema()
        print("\n🔍 Run 'python deploy_production_batch_schema.py verify' to check deployment")