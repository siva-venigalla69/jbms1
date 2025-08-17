#!/usr/bin/env python3
"""
Supabase Migration Setup Script
Migrates Digital Textile Printing System from FastAPI + PostgreSQL to Supabase + Vercel
"""
import os
import json
import subprocess
import sys
from pathlib import Path
import secrets
import string

def generate_secret_key(length=64):
    """Generate a cryptographically secure secret key"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def check_prerequisites():
    """Check if required tools are available"""
    print("🔍 Checking prerequisites...")
    
    # Check Node.js version
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        node_version = result.stdout.strip()
        print(f"✅ Node.js version: {node_version}")
        
        # Check if version is 16+
        version_num = int(node_version.replace('v', '').split('.')[0])
        if version_num < 16:
            print("❌ Node.js 16+ is required")
            return False
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Node.js is not installed")
        print("   Install from: https://nodejs.org/")
        return False
    
    # Check npm
    try:
        result = subprocess.run(['npm', '--version'], capture_output=True, text=True)
        npm_version = result.stdout.strip()
        print(f"✅ npm version: {npm_version}")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ npm is not available")
        return False
    
    return True

def get_supabase_info():
    """Guide user to get Supabase project information"""
    print("\n📋 Supabase Project Setup")
    print("=" * 50)
    print("1. Go to https://supabase.com")
    print("2. Create a new account or sign in")
    print("3. Click 'New Project'")
    print("4. Fill in project details:")
    print("   - Name: [ANY NAME YOU WANT] (e.g., my-textile-business)")
    print("   - Database Password: (generate a strong password)")
    print("   - Region: Choose closest to your location")
    print("\n💡 You can use ANY project name - it doesn't have to match our examples!")
    print("5. Wait for project to be created (2-3 minutes)")
    print("\n6. After creation, go to Settings > API")
    print("7. Copy the following information:")
    
    while True:
        print("\n📝 Please provide your Supabase project details:")
        
        project_url = input("Project URL (https://xxx.supabase.co): ").strip()
        if not project_url:
            print("❌ Project URL is required")
            continue
        
        if not project_url.startswith('https://') or '.supabase.co' not in project_url:
            print("❌ Invalid Supabase URL format")
            continue
        
        anon_key = input("Anon/Public Key (starts with 'eyJhbGci...'): ").strip()
        if not anon_key:
            print("❌ Anon key is required")
            continue
        
        service_role_key = input("Service Role Key (starts with 'eyJhbGci...'): ").strip()
        if not service_role_key:
            print("❌ Service role key is required")
            continue
        
        database_password = input("Database Password (you created during setup): ").strip()
        if not database_password:
            print("❌ Database password is required")
            continue
        
        # Extract project ID from URL
        project_id = project_url.replace('https://', '').replace('.supabase.co', '')
        
        return {
            'project_url': project_url,
            'project_id': project_id,
            'anon_key': anon_key,
            'service_role_key': service_role_key,
            'database_password': database_password
        }

def create_supabase_sql_schema():
    """Create SQL schema file for Supabase"""
    print("\n🗄️ Creating Supabase SQL Schema...")
    
    schema_sql = """-- Digital Textile Printing System - Supabase Schema
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types (enums)
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'employee');
CREATE TYPE order_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE material_type AS ENUM ('saree', 'dupatta', 'voni', 'running_material', 'blouse_material');
CREATE TYPE production_stage AS ENUM ('pre_treatment', 'printing', 'post_process');
CREATE TYPE payment_method AS ENUM ('cash', 'upi', 'bank_transfer', 'cheque');
CREATE TYPE return_reason AS ENUM ('damaged', 'defective', 'wrong_design', 'customer_request');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'employee',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(255),
    address TEXT,
    gst_number VARCHAR(15),
    is_deleted BOOLEAN DEFAULT false,
    created_by_user_id UUID REFERENCES users(id),
    updated_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status order_status NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_by_user_id UUID REFERENCES users(id),
    updated_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Items table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    material_type material_type NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    customization_details TEXT,
    production_stage production_stage DEFAULT 'pre_treatment',
    stage_completed_at TIMESTAMP WITH TIME ZONE,
    stage_completed_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Material In table
CREATE TABLE material_in (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    order_id UUID REFERENCES orders(id),
    material_type material_type NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50),
    received_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delivery Challans table
CREATE TABLE delivery_challans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challan_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    challan_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_quantity INTEGER DEFAULT 0,
    delivery_status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challan Items table
CREATE TABLE challan_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challan_id UUID NOT NULL REFERENCES delivery_challans(id),
    order_item_id UUID NOT NULL REFERENCES order_items(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Material Out table
CREATE TABLE material_out (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challan_id UUID NOT NULL REFERENCES delivery_challans(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    material_type material_type NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    dispatch_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GST Invoices table
CREATE TABLE gst_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    invoice_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    cgst_rate DECIMAL(5,2) DEFAULT 9.00,
    sgst_rate DECIMAL(5,2) DEFAULT 9.00,
    igst_rate DECIMAL(5,2) DEFAULT 18.00,
    cgst_amount DECIMAL(10,2) DEFAULT 0,
    sgst_amount DECIMAL(10,2) DEFAULT 0,
    igst_amount DECIMAL(10,2) DEFAULT 0,
    outstanding_amount DECIMAL(10,2) DEFAULT 0,
    is_deleted BOOLEAN DEFAULT false,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice Challans table (many-to-many)
CREATE TABLE invoice_challans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES gst_invoices(id),
    challan_id UUID NOT NULL REFERENCES delivery_challans(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES gst_invoices(id),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_amount DECIMAL(10,2) NOT NULL CHECK (payment_amount > 0),
    payment_method payment_method NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Returns table
CREATE TABLE returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID NOT NULL REFERENCES order_items(id),
    return_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    returned_quantity INTEGER NOT NULL CHECK (returned_quantity > 0),
    return_reason return_reason NOT NULL,
    refund_amount DECIMAL(10,2) DEFAULT 0,
    is_adjustment BOOLEAN DEFAULT false,
    notes TEXT,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory table
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    reorder_level DECIMAL(10,2) DEFAULT 0,
    cost_per_unit DECIMAL(10,2) DEFAULT 0,
    supplier_info TEXT,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method payment_method NOT NULL,
    receipt_number VARCHAR(100),
    notes TEXT,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_material_in_customer ON material_in(customer_id);
CREATE INDEX idx_material_in_order ON material_in(order_id);
CREATE INDEX idx_challans_customer ON delivery_challans(customer_id);
CREATE INDEX idx_invoices_customer ON gst_invoices(customer_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_challans_updated_at BEFORE UPDATE ON delivery_challans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON gst_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_in ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_out ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (authenticated users can access)
CREATE POLICY "Enable read access for authenticated users" ON customers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for authenticated users" ON customers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for authenticated users" ON customers FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for authenticated users" ON orders FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for authenticated users" ON orders FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON order_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for authenticated users" ON order_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for authenticated users" ON order_items FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON material_in FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for authenticated users" ON material_in FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for authenticated users" ON material_in FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON delivery_challans FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for authenticated users" ON delivery_challans FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for authenticated users" ON delivery_challans FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON material_out FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for authenticated users" ON material_out FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON gst_invoices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for authenticated users" ON gst_invoices FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for authenticated users" ON gst_invoices FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON payments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for authenticated users" ON payments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON returns FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for authenticated users" ON returns FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON inventory FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for authenticated users" ON inventory FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for authenticated users" ON inventory FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON expenses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for authenticated users" ON expenses FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Insert default admin user (password: Admin@123!)
INSERT INTO users (username, email, full_name, password_hash, role) VALUES 
('admin', 'admin@textile-printing.com', 'System Administrator', '$2b$12$rQVHE5zxXKfkF8oy2CxcaOV3K8ZJGJjl5fY4oI5P9mq8DzQFJx7jO', 'admin');

-- Sample data for testing
INSERT INTO customers (name, phone, email, address) VALUES 
('Test Customer 1', '9876543210', 'test1@example.com', '123 Test Street'),
('Test Customer 2', '9876543211', 'test2@example.com', '456 Sample Road');
"""
    
    schema_file = Path("supabase/schema.sql")
    schema_file.parent.mkdir(exist_ok=True)
    
    with open(schema_file, "w") as f:
        f.write(schema_sql)
    
    print(f"✅ Created {schema_file}")
    return str(schema_file)

def create_environment_files(supabase_info):
    """Create environment files for Supabase + Vercel"""
    print("\n🔐 Creating environment configuration...")
    
    # Frontend .env.local
    frontend_env = f"""# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL={supabase_info['project_url']}
NEXT_PUBLIC_SUPABASE_ANON_KEY={supabase_info['anon_key']}

# Application Configuration
NEXT_PUBLIC_APP_NAME=Digital Textile Printing System
NEXT_PUBLIC_APP_VERSION=3.0.0
NEXT_PUBLIC_ENVIRONMENT=development
"""
    
    frontend_env_file = Path("frontend/.env.local")
    frontend_env_file.parent.mkdir(exist_ok=True)
    
    with open(frontend_env_file, "w") as f:
        f.write(frontend_env)
    
    print(f"✅ Created {frontend_env_file}")
    
    # Supabase Edge Functions .env
    edge_env = f"""# Supabase Service Role Key (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY={supabase_info['service_role_key']}
SUPABASE_URL={supabase_info['project_url']}
"""
    
    edge_env_file = Path("supabase/.env")
    edge_env_file.parent.mkdir(exist_ok=True)
    
    with open(edge_env_file, "w") as f:
        f.write(edge_env)
    
    print(f"✅ Created {edge_env_file}")
    
    # Vercel environment variables (for deployment)
    vercel_env = {
        "NEXT_PUBLIC_SUPABASE_URL": supabase_info['project_url'],
        "NEXT_PUBLIC_SUPABASE_ANON_KEY": supabase_info['anon_key'],
        "NEXT_PUBLIC_APP_NAME": "Digital Textile Printing System",
        "NEXT_PUBLIC_APP_VERSION": "3.0.0",
        "NEXT_PUBLIC_ENVIRONMENT": "production"
    }
    
    vercel_env_file = Path("vercel.env.json")
    with open(vercel_env_file, "w") as f:
        json.dump(vercel_env, f, indent=2)
    
    print(f"✅ Created {vercel_env_file}")
    
    return True

def create_supabase_config():
    """Create Supabase configuration files"""
    print("\n⚙️ Creating Supabase configuration...")
    
    # Supabase config.toml
    config_toml = """[api]
enabled = true
port = 54321
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = ["https://localhost:3000"]
jwt_expiry = 3600
enable_signup = false
enable_confirmations = false

[auth.email]
enable_signup = false
double_confirm_changes = false
enable_confirmations = false

[db]
port = 54322
major_version = 15

[realtime]
enabled = true
ip_version = "ipv4"

[studio]
enabled = true
port = 54323
api_url = "http://localhost:54321"

[inbucket]
enabled = true
port = 54324
smtp_port = 54325
pop3_port = 54326

[storage]
enabled = true
file_size_limit = "50MiB"
"""
    
    config_file = Path("supabase/config.toml")
    config_file.parent.mkdir(exist_ok=True)
    
    with open(config_file, "w") as f:
        f.write(config_toml)
    
    print(f"✅ Created {config_file}")
    
    # Supabase migrations folder
    migrations_dir = Path("supabase/migrations")
    migrations_dir.mkdir(exist_ok=True)
    
    # Create initial migration
    migration_file = migrations_dir / "20250101000000_initial_schema.sql"
    with open("supabase/schema.sql", "r") as schema:
        migration_content = schema.read()
    
    with open(migration_file, "w") as f:
        f.write(migration_content)
    
    print(f"✅ Created {migration_file}")
    
    return True

def install_dependencies():
    """Install required dependencies"""
    print("\n📦 Installing dependencies...")
    
    # Check if Supabase CLI is available via npx
    try:
        print("Checking Supabase CLI availability...")
        result = subprocess.run(['npx', 'supabase', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Supabase CLI available via npx")
        else:
            print("⚠️  Supabase CLI not available via npx, will use official installer")
            print("💡 Alternative: Install manually with: curl -fsSL https://supabase.com/install.sh | sh")
            print("💡 Or use npx commands: npx supabase [command]")
    except subprocess.CalledProcessError:
        print("⚠️  Supabase CLI not available, but you can use npx commands")
        print("💡 Use: npx supabase [command] (no installation needed)")
    
    # Install Vercel CLI
    try:
        print("Installing Vercel CLI...")
        subprocess.run(['npm', 'install', '-g', 'vercel'], check=True)
        print("✅ Vercel CLI installed")
    except subprocess.CalledProcessError:
        print("❌ Failed to install Vercel CLI")
        print("   Try: npm install -g vercel")
        return False
    
    # Install frontend dependencies
    frontend_dir = Path("frontend")
    if frontend_dir.exists():
        try:
            print("Installing frontend dependencies...")
            subprocess.run(['npm', 'install', '@supabase/supabase-js'], cwd=frontend_dir, check=True)
            print("✅ Frontend Supabase client installed")
        except subprocess.CalledProcessError:
            print("❌ Failed to install frontend dependencies")
            return False
    
    return True

def create_summary_file(supabase_info):
    """Create migration summary file"""
    summary = {
        "migration_type": "supabase_vercel",
        "timestamp": secrets.token_hex(8),
        "supabase_project_id": supabase_info['project_id'],
        "supabase_url": supabase_info['project_url'],
        "files_created": [
            "supabase/schema.sql",
            "supabase/config.toml",
            "supabase/migrations/20250101000000_initial_schema.sql",
            "frontend/.env.local",
            "supabase/.env",
            "vercel.env.json"
        ],
        "next_steps": [
            "Run: npx supabase db push",
            "Run: cd frontend && npm run dev",
            "Run: vercel --prod (for deployment)",
            "Update frontend API calls to use Supabase client"
        ]
    }
    
    with open("supabase_migration_summary.json", "w") as f:
        json.dump(summary, f, indent=2)
    
    print("📋 Migration summary saved to supabase_migration_summary.json")

def main():
    """Main migration function"""
    print("🚀 Supabase + Vercel Migration for Digital Textile Printing System")
    print("=" * 70)
    print("This script migrates your FastAPI backend to Supabase + Vercel")
    print()
    
    # Check prerequisites
    if not check_prerequisites():
        print("❌ Prerequisites check failed. Please fix the issues and try again.")
        return False
    
    # Get Supabase information
    supabase_info = get_supabase_info()
    
    # Install dependencies
    if not install_dependencies():
        print("❌ Dependency installation failed")
        return False
    
    # Create SQL schema
    create_supabase_sql_schema()
    
    # Create Supabase config
    create_supabase_config()
    
    # Create environment files
    create_environment_files(supabase_info)
    
    # Create summary
    create_summary_file(supabase_info)
    
    print(f"\n🎉 Supabase migration setup completed!")
    
    # Next steps
    print(f"\n📋 NEXT STEPS:")
    print("1. Apply database schema to Supabase:")
    print("   npx supabase db push")
    print()
    print("2. Start local development:")
    print("   cd frontend")
    print("   npm run dev")
    print()
    print("3. For production deployment:")
    print("   vercel --prod")
    print()
    print("4. Update your React components to use Supabase client instead of axios")
    print("   (Detailed guide will be provided)")
    
    print(f"\n🔒 IMPORTANT NOTES:")
    print("- Your Supabase credentials are saved in environment files")
    print("- Never commit .env files to version control")
    print("- The database schema includes all your existing tables")
    print("- Row Level Security (RLS) is enabled for data protection")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        if success:
            print("\n✅ Migration setup completed successfully!")
        else:
            print("\n❌ Migration setup failed. Please check the errors above.")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Migration setup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        sys.exit(1)