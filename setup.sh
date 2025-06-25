#!/bin/bash

# 🚀 Digital Textile Printing System - Quick Setup Script
# This script sets up the development environment quickly

set -e  # Exit on any error

echo "🧵 Digital Textile Printing System - Quick Setup"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_step() {
    echo -e "${BLUE}🔧 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "NEXT_STEPS.md" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_step "Step 1: Checking system requirements..."

# Check for required tools
check_tool() {
    if command -v $1 &> /dev/null; then
        print_success "$1 is installed"
        return 0
    else
        print_error "$1 is not installed"
        return 1
    fi
}

MISSING_TOOLS=0

if ! check_tool python3; then
    echo "  Install: sudo apt-get install python3 python3-pip python3-venv"
    MISSING_TOOLS=1
fi

if ! check_tool node; then
    echo "  Install: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
    MISSING_TOOLS=1
fi

if ! check_tool psql; then
    echo "  Install: sudo apt-get install postgresql postgresql-contrib"
    MISSING_TOOLS=1
fi

if ! check_tool git; then
    echo "  Install: sudo apt-get install git"
    MISSING_TOOLS=1
fi

if [ $MISSING_TOOLS -eq 1 ]; then
    print_error "Please install missing tools and run this script again"
    exit 1
fi

print_step "Step 2: Setting up database..."

# Check if PostgreSQL is running
if ! sudo systemctl is-active --quiet postgresql; then
    print_warning "Starting PostgreSQL service..."
    sudo systemctl start postgresql
fi

# Create database if it doesn't exist
DB_EXISTS=$(sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -w textile_printing_db | wc -l)
if [ $DB_EXISTS -eq 0 ]; then
    print_step "Creating database..."
    sudo -u postgres createdb textile_printing_db
    print_success "Database created"
else
    print_success "Database already exists"
fi

# Create database user if it doesn't exist
USER_EXISTS=$(sudo -u postgres psql -c "SELECT 1 FROM pg_user WHERE usename = 'textile_user';" | grep -c "1 row" || true)
if [ $USER_EXISTS -eq 0 ]; then
    print_step "Creating database user..."
    sudo -u postgres psql -c "CREATE USER textile_user WITH PASSWORD 'textile_password';"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE textile_printing_db TO textile_user;"
    print_success "Database user created"
else
    print_success "Database user already exists"
fi

# Initialize database schema
if [ -f "database/schema.sql" ]; then
    print_step "Initializing database schema..."
    sudo -u postgres psql -d textile_printing_db -f database/schema.sql
    print_success "Database schema initialized"
else
    print_warning "Database schema file not found, skipping initialization"
fi

print_step "Step 3: Setting up backend..."

cd backend

# Create virtual environment
if [ ! -d "venv" ]; then
    print_step "Creating Python virtual environment..."
    python3 -m venv venv
    print_success "Virtual environment created"
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
print_step "Installing Python dependencies..."
pip install -r requirements.txt
print_success "Python dependencies installed"

# Create environment file
if [ ! -f ".env" ]; then
    print_step "Creating backend environment file..."
    SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
    cat > .env << EOF
# Database
DATABASE_URL=postgresql://textile_user:textile_password@localhost:5432/textile_printing_db

# Security
SECRET_KEY=$SECRET_KEY
ENVIRONMENT=development
DEBUG=true

# CORS
FRONTEND_URL=http://localhost:3000
EOF
    print_success "Backend environment file created"
else
    print_success "Backend environment file already exists"
fi

# Create admin user
print_step "Creating admin user..."
if python init_admin.py; then
    print_success "Admin user created/verified"
else
    print_warning "Admin user creation failed or already exists"
fi

cd ..

print_step "Step 4: Setting up frontend..."

cd frontend

# Install dependencies
if [ ! -d "node_modules" ]; then
    print_step "Installing Node.js dependencies..."
    npm install
    print_success "Node.js dependencies installed"
else
    print_success "Node.js dependencies already installed"
fi

# Create environment file
if [ ! -f ".env" ]; then
    print_step "Creating frontend environment file..."
    cat > .env << EOF
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development
EOF
    print_success "Frontend environment file created"
else
    print_success "Frontend environment file already exists"
fi

cd ..

print_step "Step 5: Running initial tests..."

# Test backend
cd backend
source venv/bin/activate

print_step "Running backend tests..."
if pytest --tb=short -q; then
    print_success "Backend tests passed"
else
    print_warning "Some backend tests failed (this might be normal for initial setup)"
fi

cd ../frontend

# Test frontend
print_step "Running frontend tests..."
if npm test -- --coverage --watchAll=false --passWithNoTests; then
    print_success "Frontend tests passed"
else
    print_warning "Some frontend tests failed (this might be normal for initial setup)"
fi

cd ..

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Your development environment is ready! Here's how to start:"
echo ""
echo "📱 Start Backend (Terminal 1):"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   uvicorn app.main:app --reload"
echo "   Backend will be available at: http://localhost:8000"
echo ""
echo "🌐 Start Frontend (Terminal 2):"
echo "   cd frontend"
echo "   npm start"
echo "   Frontend will be available at: http://localhost:3000"
echo ""
echo "🔑 Admin Login Credentials:"
echo "   Username: admin"
echo "   Password: (check the output above or run 'cd backend && python init_admin.py')"
echo ""
echo "📚 Next Steps:"
echo "   1. Read NEXT_STEPS.md for deployment instructions"
echo "   2. Check TESTING_GUIDE.md for comprehensive testing"
echo "   3. Review DEPLOYMENT.md for production deployment"
echo ""
echo "🆘 Need Help?"
echo "   - Check the logs above for any errors"
echo "   - Review the troubleshooting section in NEXT_STEPS.md"
echo "   - Ensure all required tools are installed"
echo ""
print_success "Happy coding! 🚀" 