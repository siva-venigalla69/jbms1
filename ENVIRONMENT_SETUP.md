# Environment Setup Guide - Digital Textile Printing System

This guide provides step-by-step instructions for setting up the complete development environment for the Digital Textile Printing System.

## 📋 Prerequisites Checklist

### System Requirements
- **Operating System**: Windows 10/11, macOS 10.15+, or Linux Ubuntu 18.04+
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: 10GB free space for development tools and project
- **Internet**: Stable internet connection for package downloads

### Required Software Versions
- **Python**: 3.9 or higher
- **Node.js**: 16.x or higher  
- **PostgreSQL**: 14.x or higher
- **Git**: Latest version
- **VS Code** (recommended) or any code editor

---

## 🐍 Python Development Environment

### Step 1: Install Python

#### Windows
1. **Download Python** from [python.org](https://python.org)
2. **Run installer** with these options:
   - ✅ Add Python to PATH
   - ✅ Install pip
   - ✅ Install for all users
3. **Verify installation**:
   ```cmd
   python --version
   pip --version
   ```

#### macOS
```bash
# Using Homebrew (recommended)
brew install python@3.9

# Verify installation
python3 --version
pip3 --version
```

#### Linux (Ubuntu/Debian)
```bash
# Update package list
sudo apt update

# Install Python and pip
sudo apt install python3.9 python3.9-pip python3.9-venv python3.9-dev

# Verify installation
python3.9 --version
pip3 --version
```

### Step 2: Set Up Virtual Environment

#### Create Project Directory
```bash
mkdir textile-printing-system
cd textile-printing-system
mkdir backend frontend database docs
```

#### Create Virtual Environment
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Verify activation (should show (venv) in prompt)
which python
```

#### Install Backend Dependencies
```bash
# Create requirements.txt file
cat > requirements.txt << EOF
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
python-jose[cryptography]==3.3.0
python-multipart==0.0.6
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0
pydantic[email]==2.5.0
pydantic-settings==2.1.0
alembic==1.12.1
reportlab==4.0.4
pandas==2.1.3
openpyxl==3.1.2
email-validator==2.1.0
pytest==7.4.3
pytest-asyncio==0.21.1
httpx==0.25.2
faker==20.1.0
EOF

# Install all dependencies
pip install -r requirements.txt

# Verify installation
pip list
```

### Step 3: Python Environment Validation
```bash
# Test critical imports
python -c "
import fastapi
import sqlalchemy
import psycopg2
import uvicorn
print('✅ All Python packages installed successfully')
"
```

---

## 🌐 Node.js and Frontend Environment

### Step 1: Install Node.js

#### Windows
1. **Download** from [nodejs.org](https://nodejs.org)
2. **Install LTS version** (16.x or higher)
3. **Verify installation**:
   ```cmd
   node --version
   npm --version
   ```

#### macOS
```bash
# Using Homebrew
brew install node@16

# Verify installation
node --version
npm --version
```

#### Linux (Ubuntu/Debian)
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 2: Set Up Frontend Project

#### Create React Application
```bash
cd ../frontend

# Create React app with TypeScript
npx create-react-app . --template typescript

# Install additional dependencies
npm install axios react-router-dom @types/react-router-dom
npm install @mui/material @emotion/react @emotion/styled
npm install @mui/icons-material @mui/x-data-grid
npm install @mui/lab @mui/x-date-pickers
npm install date-fns

# Install development dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

#### Verify Frontend Setup
```bash
# Test build process
npm run build

# Start development server (test)
npm start &
sleep 5
curl http://localhost:3000
killall node

echo "✅ Frontend environment ready"
```

---

## 🗄️ PostgreSQL Database Setup

### Step 1: Install PostgreSQL

#### Windows
1. **Download** from [postgresql.org](https://postgresql.org)
2. **Run installer** with these settings:
   - Port: 5432
   - Username: postgres
   - Remember the password you set
3. **Add to PATH**: Add PostgreSQL bin directory to system PATH

#### macOS
```bash
# Using Homebrew
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Create database user (optional)
createuser -s postgres
```

#### Linux (Ubuntu/Debian)
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql-14 postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Switch to postgres user
sudo -u postgres psql
\password postgres
\q
```

### Step 2: Database Configuration

#### Create Development Database
```bash
# Connect to PostgreSQL
psql -U postgres -h localhost

# Create database and user
CREATE DATABASE textile_printing_db;
CREATE USER textile_user WITH PASSWORD 'textile_pass_2024';
GRANT ALL PRIVILEGES ON DATABASE textile_printing_db TO textile_user;

# For development, grant additional permissions
ALTER USER textile_user CREATEDB;

# Exit psql
\q
```

#### Test Database Connection
```bash
# Test connection with new user
psql -U textile_user -d textile_printing_db -h localhost

# Should connect successfully
\l
\q

echo "✅ Database setup complete"
```

### Step 3: Load Database Schema

#### Execute Schema Creation
```bash
cd ../database

# Download and execute schema
psql -U textile_user -d textile_printing_db -h localhost -f schema.sql

# Verify tables creation
psql -U textile_user -d textile_printing_db -h localhost -c "\dt"

# Should show all system tables
echo "✅ Database schema loaded"
```

---

## 📝 Code Editor Setup (VS Code Recommended)

### Step 1: Install VS Code
1. **Download** from [code.visualstudio.com](https://code.visualstudio.com)
2. **Install** with default settings
3. **Launch** VS Code

### Step 2: Install Essential Extensions

#### Python Extensions
```bash
# Open VS Code
code .

# Install extensions via command palette (Ctrl+Shift+P)
# Or install via extensions marketplace
```

**Required Extensions**:
- **Python** (Microsoft)
- **Python Docstring Generator**
- **autoDocstring**
- **SQLTools**
- **SQLTools PostgreSQL/Cockroach Driver**

#### Frontend Extensions
- **ES7+ React/Redux/React-Native snippets**
- **TypeScript Importer**
- **Auto Rename Tag**
- **Bracket Pair Colorizer**
- **Prettier - Code formatter**
- **ESLint**

#### General Extensions
- **GitLens**
- **Thunder Client** (for API testing)
- **Material Icon Theme**
- **One Dark Pro** (theme)

### Step 3: VS Code Configuration

#### Create Workspace Settings
```json
// .vscode/settings.json
{
    "python.defaultInterpreterPath": "./backend/venv/bin/python",
    "python.terminal.activateEnvironment": true,
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.organizeImports": true
    },
    "python.linting.enabled": true,
    "python.linting.pylintEnabled": true,
    "typescript.preferences.importModuleSpecifier": "relative",
    "emmet.includeLanguages": {
        "typescript": "html",
        "typescriptreact": "html"
    }
}
```

#### Create Debug Configuration
```json
// .vscode/launch.json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "FastAPI Debug",
            "type": "python",
            "request": "launch",
            "program": "${workspaceFolder}/backend/venv/bin/uvicorn",
            "args": ["app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
            "cwd": "${workspaceFolder}/backend",
            "env": {
                "PYTHONPATH": "${workspaceFolder}/backend"
            },
            "console": "integratedTerminal"
        }
    ]
}
```

---

## 🔧 Git Version Control Setup

### Step 1: Install Git

#### Windows
1. **Download** from [git-scm.com](https://git-scm.com)
2. **Install** with recommended settings
3. **Configure Git Bash** as default terminal

#### macOS/Linux
```bash
# macOS (if not already installed)
brew install git

# Linux
sudo apt install git

# Verify installation
git --version
```

### Step 2: Git Configuration

#### Global Configuration
```bash
# Set user information
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set default branch name
git config --global init.defaultBranch main

# Set default editor
git config --global core.editor "code --wait"

# Verify configuration
git config --list
```

#### Initialize Repository
```bash
# In project root directory
cd textile-printing-system

# Initialize git repository
git init

# Create .gitignore file
cat > .gitignore << EOF
# Backend
backend/venv/
backend/.env
backend/__pycache__/
backend/*.pyc
backend/.pytest_cache/
backend/htmlcov/

# Frontend
frontend/node_modules/
frontend/build/
frontend/.env.local
frontend/.env.production

# Database
database/*.backup
database/test_data/

# IDE
.vscode/settings.json
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
EOF

# Stage initial files
git add .
git commit -m "Initial project setup"
```

---

## 🌍 Environment Variables Configuration

### Backend Environment Variables

#### Create Environment File
```bash
cd backend

# Create .env file
cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://textile_user:textile_pass_2024@localhost:5432/textile_printing_db

# Security Configuration
SECRET_KEY=your-super-secret-key-change-in-production-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Application Configuration
ENVIRONMENT=development
DEBUG=true

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Report Configuration
REPORTS_EXPORT_PATH=./exports
MAX_REPORT_RECORDS=10000
EOF

# Create example file for version control
cp .env .env.example
```

### Frontend Environment Variables

#### Create Environment File
```bash
cd ../frontend

# Create .env file
cat > .env << EOF
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development
EOF

# Create example file
cp .env .env.example
```

---

## 🧪 Development Tools Setup

### Backend Development Tools

#### Install Development Dependencies
```bash
cd backend

# Install testing and development tools
pip install pytest-cov black flake8 mypy

# Create pytest configuration
cat > pytest.ini << EOF
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short
EOF

# Create mypy configuration
cat > mypy.ini << EOF
[mypy]
python_version = 3.9
warn_return_any = True
warn_unused_configs = True
disallow_untyped_defs = True
EOF
```

#### Create Development Scripts
```bash
# Create startup script
cat > start_dev.sh << EOF
#!/bin/bash
source venv/bin/activate
export PYTHONPATH="${PWD}:${PYTHONPATH}"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
EOF

chmod +x start_dev.sh
```

### Frontend Development Tools

#### Configure Package Scripts
```json
// Add to package.json scripts section
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build", 
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write src/**/*.{ts,tsx}",
    "analyze": "npm run build && npx bundle-analyzer build/static/js/*.js"
  }
}
```

---

## 🔍 Environment Validation

### Complete Environment Test

#### Create Validation Script
```bash
# Create validation script in project root
cat > validate_environment.sh << EOF
#!/bin/bash

echo "🔍 Validating Development Environment..."
echo "==========================================="

# Check Python
echo "📝 Checking Python..."
cd backend
source venv/bin/activate
python --version || exit 1
echo "✅ Python OK"

# Check Python packages
echo "📦 Checking Python packages..."
python -c "
import fastapi
import sqlalchemy
import psycopg2
print('✅ Python packages OK')
" || exit 1

# Check Node.js
echo "📝 Checking Node.js..."
cd ../frontend
node --version || exit 1
npm --version || exit 1
echo "✅ Node.js OK"

# Check React dependencies
echo "📦 Checking React dependencies..."
npm list react > /dev/null || exit 1
echo "✅ React dependencies OK"

# Check PostgreSQL
echo "🗄️ Checking PostgreSQL..."
psql -U textile_user -d textile_printing_db -h localhost -c "SELECT 1;" > /dev/null || exit 1
echo "✅ PostgreSQL OK"

# Check database schema
echo "📊 Checking database schema..."
TABLES=$(psql -U textile_user -d textile_printing_db -h localhost -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
if [ "$TABLES" -gt 10 ]; then
    echo "✅ Database schema OK ($TABLES tables found)"
else
    echo "❌ Database schema incomplete ($TABLES tables found)"
    exit 1
fi

# Test backend startup
echo "🚀 Testing backend startup..."
cd ../backend
timeout 10s uvicorn app.main:app --host 0.0.0.0 --port 8001 > /dev/null 2>&1 &
PID=$!
sleep 5
curl -f http://localhost:8001/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Backend startup OK"
    kill $PID 2>/dev/null
else
    echo "❌ Backend startup failed"
    kill $PID 2>/dev/null
    exit 1
fi

# Test frontend build
echo "🏗️ Testing frontend build..."
cd ../frontend
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Frontend build OK"
else
    echo "❌ Frontend build failed"
    exit 1
fi

echo ""
echo "🎉 Environment validation completed successfully!"
echo "✅ All components are working correctly"
echo ""
echo "Next steps:"
echo "1. Start backend: cd backend && ./start_dev.sh"
echo "2. Start frontend: cd frontend && npm start"
echo "3. Open browser: http://localhost:3000"
EOF

chmod +x validate_environment.sh
```

#### Run Validation
```bash
# Run the validation script
./validate_environment.sh
```

---

## 🚀 Quick Start Commands

### Daily Development Workflow

#### Start Development Servers
```bash
# Terminal 1: Start Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2: Start Frontend  
cd frontend
npm start

# Terminal 3: Database operations (if needed)
psql -U textile_user -d textile_printing_db -h localhost
```

#### Common Development Commands
```bash
# Backend commands
cd backend
source venv/bin/activate
pip install package_name              # Install new package
pytest tests/                         # Run tests
black .                              # Format code
flake8 .                             # Check code quality

# Frontend commands
cd frontend
npm install package_name             # Install new package
npm test                            # Run tests
npm run lint                        # Check code quality
npm run build                       # Build for production

# Database commands
psql -U textile_user -d textile_printing_db -h localhost    # Connect to DB
pg_dump -U textile_user textile_printing_db > backup.sql    # Backup
psql -U textile_user -d textile_printing_db < backup.sql    # Restore
```

---

## 🔧 Troubleshooting Common Issues

### Python Environment Issues

#### Virtual Environment Not Activating
```bash
# Windows
backend\venv\Scripts\activate.bat

# If using PowerShell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
backend\venv\Scripts\Activate.ps1
```

#### Package Installation Fails
```bash
# Upgrade pip
python -m pip install --upgrade pip

# Install with specific index
pip install --index-url https://pypi.org/simple/ package_name

# Clear pip cache
pip cache purge
```

### Node.js Issues

#### npm Install Fails
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Use different registry
npm install --registry https://registry.npmjs.org/
```

#### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
PORT=3001 npm start
```

### Database Issues

#### Connection Refused
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL if stopped
sudo systemctl start postgresql

# Check port availability
netstat -an | grep 5432
```

#### Permission Denied
```bash
# Reset PostgreSQL user password
sudo -u postgres psql
ALTER USER textile_user WITH PASSWORD 'new_password';
\q

# Update .env file with new password
```

### General Issues

#### Port Conflicts
```bash
# Check what's using a port
lsof -i :8000
netstat -tulpn | grep :8000

# Kill process using port
kill -9 $(lsof -t -i:8000)
```

#### File Permission Issues
```bash
# Fix file permissions (Unix/Linux/macOS)
chmod +x script_name.sh
chown -R $USER:$USER project_directory

# Windows - Run as Administrator if needed
```

---

## 📋 Environment Setup Checklist

### Pre-Development Checklist
- [ ] Python 3.9+ installed and verified
- [ ] Node.js 16+ installed and verified
- [ ] PostgreSQL 14+ installed and running
- [ ] Git installed and configured
- [ ] VS Code installed with extensions
- [ ] Project directory structure created

### Backend Setup Checklist
- [ ] Virtual environment created and activated
- [ ] All Python packages installed
- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] FastAPI server starts successfully

### Frontend Setup Checklist
- [ ] React application created
- [ ] All npm packages installed
- [ ] Development server starts successfully
- [ ] Build process works without errors
- [ ] TypeScript configuration valid

### Database Setup Checklist
- [ ] PostgreSQL service running
- [ ] Development database created
- [ ] Database user created with permissions
- [ ] Schema loaded successfully
- [ ] Test data inserted (if applicable)
- [ ] Connection from application verified

### Development Tools Checklist
- [ ] Code editor configured with extensions
- [ ] Linting and formatting tools installed
- [ ] Testing frameworks configured
- [ ] Git repository initialized
- [ ] Environment validation script passes

### Final Validation Checklist
- [ ] Backend API accessible at http://localhost:8000
- [ ] Frontend application loads at http://localhost:3000
- [ ] Database operations work correctly
- [ ] All tests pass (unit and integration)
- [ ] Development workflow documented

---

## 🎯 Next Steps

After completing the environment setup:

1. **Review Project Structure**: Familiarize yourself with the codebase organization
2. **Read Functional Requirements**: Understand the business requirements
3. **Follow Implementation Timeline**: Start with Phase 1 development
4. **Set Up Testing**: Implement unit tests as you develop features
5. **Regular Commits**: Commit code changes frequently with meaningful messages

### Recommended Development Sequence
1. **Week 1**: Environment setup and basic project structure
2. **Week 2-3**: Core entities (customers, orders)
3. **Week 4-5**: Business workflow implementation
4. **Week 6-7**: Advanced features and reports
5. **Week 8-9**: Testing and optimization
6. **Week 10**: Deployment preparation

Your development environment is now ready for building the Digital Textile Printing System! 🎉 