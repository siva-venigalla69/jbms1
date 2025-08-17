# 🧵 Digital Textile Printing Management System

[![Security](https://img.shields.io/badge/Security-Enhanced-green)](docs/TESTING_GUIDE.md)
[![Tests](https://img.shields.io/badge/Tests-Comprehensive-brightgreen)](docs/TESTING_GUIDE.md)
[![Architecture](https://img.shields.io/badge/Architecture-Modular-blue)](docs/DEPLOYMENT_GUIDE.md)
[![Frontend](https://img.shields.io/badge/Frontend-Live-brightgreen)](https://your-site.netlify.app)
[![API](https://img.shields.io/badge/API-Live-brightgreen)](https://your-service.onrender.com/docs)

A **secure, modular, and production-ready** full-stack web application for managing digital textile printing operations. Recently refactored with enhanced security, improved architecture, and comprehensive testing.

## 🏗️ System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React.js      │    │   FastAPI        │    │  PostgreSQL     │
│   Frontend      │◄──►│   Backend        │◄──►│   Database      │
│   (Netlify)     │    │   (Render.com)   │    │  (Render.com)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🛠️ Technology Stack

- **Backend**: Python 3.9+ with FastAPI, SQLAlchemy ORM, Pydantic
- **Frontend**: React.js 18+ with TypeScript, Material-UI
- **Database**: PostgreSQL 14+ with connection pooling
- **Authentication**: Secure JWT tokens with enhanced validation
- **Security**: bcrypt hashing, input validation, CORS protection
- **Testing**: Pytest with comprehensive test coverage
- **Deployment**: 
  - Frontend: Netlify with optimized builds
  - Backend: Render.com with health monitoring
  - Database: Render.com PostgreSQL with migrations

## 📋 Core Features

### Business Workflow Management
- **Customer Management**: Complete customer database with GST support
- **Order Processing**: End-to-end order lifecycle management
- **Production Tracking**: Three-stage production workflow (Pre-treatment → Printing → Post-process)
- **Material Management**: Track material in/out with inventory integration
- **Delivery Management**: Generate and manage delivery challans
- **Invoice Management**: GST-compliant invoice generation with multiple challan consolidation
- **Payment Tracking**: Comprehensive payment recording with outstanding management
- **Returns Processing**: Handle damaged returns and adjustments

### Reporting & Analytics
- **Operational Reports**: Pending orders, production status, stock holdings
- **Financial Reports**: Receivables, payments, expenses analysis
- **Material Flow Reports**: Track material movement across date ranges
- **Export Capabilities**: PDF and Excel export for all reports

### Security & Audit
- **Enhanced Security**: All hardcoded credentials removed, secure environment configuration
- **Role-based Access Control**: Admin, Manager, Employee roles with proper authorization
- **Audit Trail**: Automatic audit logging for all critical operations
- **Data Protection**: SQL injection protection, XSS prevention, input sanitization
- **Authentication**: Secure JWT tokens with proper validation and expiration

## 📁 Project Structure

```
textile-printing-system/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── api/               # API endpoints
│   │   ├── core/              # Configuration, security, exceptions
│   │   ├── models/            # Database models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic layer (NEW)
│   │   └── migrations/        # Database migrations (NEW)
│   ├── tests/                 # Comprehensive test suite (ENHANCED)
│   │   ├── conftest.py        # Test configuration
│   │   ├── test_api_security.py # Security tests
│   │   └── test_customer_api.py # API tests
│   ├── requirements.txt
│   ├── render.yaml            # Deployment configuration (UPDATED)
│   └── .env.example           # Environment template (NEW)
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── components/        # Reusable components (ENHANCED)
│   │   │   └── ui/            # UI components (NEW)
│   │   ├── pages/             # Main pages
│   │   ├── services/          # API services
│   │   ├── hooks/             # Custom hooks (NEW)
│   │   ├── context/           # React context
│   │   └── types/             # TypeScript types
│   ├── public/
│   └── package.json
├── database/                   # Database scripts
│   ├── schema.sql             # Complete schema
│   └── post_deployment_objects.sql
├── docs/                       # Comprehensive Documentation (UPDATED)
│   ├── DEPLOYMENT_GUIDE.md    # Step-by-step deployment
│   ├── TESTING_GUIDE.md       # Complete testing guide
│   ├── USER_GUIDE.md          # User documentation
│   └── API_DOCUMENTATION.md   # API reference
├── Security & Setup Scripts (NEW)
│   ├── setup_secure_environment.py # Environment setup
│   ├── remove_hardcoded_credentials.py # Security cleanup
│   └── deploy.py              # Automated deployment
├── FUNCTIONAL_REQUIREMENTS.md
└── REFACTORING_SUMMARY.md     # Latest changes summary (NEW)
```

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+
- PostgreSQL 14+
- Git

### 🔒 Secure Setup (Recommended)

1. **Clone and Setup Security**
   ```bash
   git clone <repository-url>
   cd textile-printing-system
   
   # Remove any hardcoded credentials
   python3 remove_hardcoded_credentials.py
   
   # Setup secure environment
   python3 setup_secure_environment.py
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Database Setup**
   ```bash
   # Create database
   createdb textile_printing_db
   
   # Apply latest schema with improvements
   psql -d textile_printing_db -f app/migrations/schema_fix_v2.sql
   ```

4. **Environment Configuration**
   ```bash
   # The secure setup script created .env file
   # Verify and update if needed
   cp .env.example .env  # If not created by setup script
   ```

5. **Run Tests**
   ```bash
   # Run comprehensive test suite
   python -m pytest tests/ -v
   ```

6. **Start Backend Server**
   ```bash
   uvicorn app.main:app --reload
   # Server runs on http://localhost:8000
   # Health check: http://localhost:8000/health
   ```

7. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   npm start
   # Application runs on http://localhost:3000
   ```

## 📖 Documentation Links

- [📋 Functional Requirements](FUNCTIONAL_REQUIREMENTS.md)
- [🚀 Deployment Guide](docs/DEPLOYMENT_GUIDE.md) - **Step-by-step production deployment**
- [🧪 Testing Guide](docs/TESTING_GUIDE.md) - **Comprehensive API testing**
- [👤 User Guide](docs/USER_GUIDE.md) - **End-user documentation**
- [🔧 API Documentation](docs/API_DOCUMENTATION.md) - **Complete API reference**
- [🔄 Refactoring Summary](REFACTORING_SUMMARY.md) - **Latest changes and improvements**

## 🧪 Testing

### Comprehensive Test Suite
```bash
cd backend

# Run all tests with coverage
python -m pytest tests/ -v --cov=app

# Security-focused tests
python -m pytest tests/test_api_security.py -v

# API functionality tests
python -m pytest tests/test_customer_api.py -v

# Performance tests
python -m pytest tests/ -k "performance" -v
```

### Frontend Tests
```bash
cd frontend
npm test -- --coverage --watchAll=false
```

### Automated Testing
```bash
# Run complete test suite with deployment checks
python3 deploy.py
```

## 🚀 Deployment

### 🔄 Automated Deployment
```bash
# Run automated deployment script
python3 deploy.py
```

### Manual Production Deployment
1. **Security Setup**: Run security cleanup and environment setup
2. **Database**: Deploy PostgreSQL with schema migration
3. **Backend**: Deploy FastAPI on Render.com with health monitoring
4. **Frontend**: Deploy React app on Netlify with optimizations
5. **Verification**: Run production health checks and tests

See [📖 Deployment Guide](docs/DEPLOYMENT_GUIDE.md) for detailed step-by-step instructions.

## 📊 System Capabilities

- **Concurrent Users**: Up to 100+ users (optimized with connection pooling)
- **Annual Capacity**: 50,000+ orders per year
- **Report Generation**: Under 15 seconds (database optimized)
- **Page Load Time**: Under 2 seconds (frontend optimized)
- **Data Export**: PDF and Excel formats with streaming
- **Security**: Production-ready with comprehensive protection

## 🔒 Enhanced Security Features

- **🛡️ Secure Authentication**: JWT tokens with proper validation and expiration
- **🔐 Password Security**: bcrypt hashing with increased rounds, strength validation
- **🚫 Attack Protection**: SQL injection, XSS, CSRF protection implemented
- **👥 Access Control**: Role-based permissions with audit logging
- **📝 Input Validation**: Comprehensive validation and sanitization
- **🔍 Audit Trail**: Automatic logging of all critical operations
- **🌐 Network Security**: CORS, security headers, rate limiting
- **💾 Data Protection**: Secure environment variables, no hardcoded credentials

## 🆘 Support

For technical support or questions:
1. Check the [📖 Testing Guide](docs/TESTING_GUIDE.md) for troubleshooting
2. Review [📖 Deployment Guide](docs/DEPLOYMENT_GUIDE.md) for setup issues
3. Check [📖 API Documentation](docs/API_DOCUMENTATION.md) for integration help
4. Review [🔄 Refactoring Summary](REFACTORING_SUMMARY.md) for recent changes
5. Submit issues via the project issue tracker

## 🎯 What's New (Recent Refactoring)

- ✅ **Security Enhanced**: All hardcoded credentials removed, secure configuration
- ✅ **Modular Architecture**: Service layer with business logic separation
- ✅ **Comprehensive Testing**: Security tests, API tests, performance tests
- ✅ **Database Optimized**: Improved schema with indexes and constraints
- ✅ **Production Ready**: Automated deployment, health monitoring, error handling
- ✅ **Developer Experience**: Better documentation, testing tools, debugging

## 📄 License

This project is proprietary software developed for digital textile printing business operations.

## 🔄 Version Information

- **Current Version**: 2.0.0 (Recently Refactored)
- **Last Updated**: 2025
- **Security Status**: ✅ Production-Ready
- **Compatibility**: All modern browsers, PostgreSQL 14+, Python 3.9+, Node.js 16+ 