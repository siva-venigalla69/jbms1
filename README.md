# 🧵 Digital Textile Printing Management System

[![Tests](https://github.com/your-username/textile-printing-system/workflows/Tests/badge.svg)](https://github.com/your-username/textile-printing-system/actions)
[![Coverage](https://codecov.io/gh/your-username/textile-printing-system/branch/main/graph/badge.svg)](https://codecov.io/gh/your-username/textile-printing-system)
[![Frontend](https://img.shields.io/badge/Frontend-Live-brightgreen)](https://your-site.netlify.app)
[![API](https://img.shields.io/badge/API-Live-brightgreen)](https://your-service.onrender.com/docs)

A comprehensive, production-ready full-stack web application for managing digital textile printing operations. Built with modern cloud-first architecture for scalability, security, and ease of use.

## 🏗️ System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React.js      │    │   FastAPI        │    │  PostgreSQL     │
│   Frontend      │◄──►│   Backend        │◄──►│   Database      │
│   (Netlify)     │    │   (Render.com)   │    │  (Render.com)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🛠️ Technology Stack

- **Backend**: Python 3.9+ with FastAPI
- **Frontend**: React.js 18+ with TypeScript
- **Database**: PostgreSQL 14+
- **Authentication**: JWT tokens
- **PDF Generation**: ReportLab (Python)
- **Deployment**: 
  - Frontend: Netlify (Free tier)
  - Backend: Render.com (Free tier)
  - Database: Render.com PostgreSQL (Free tier)

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
- **Role-based Access Control**: Admin, Manager, Employee roles
- **Audit Trail**: Complete change tracking for critical operations
- **Data Validation**: Comprehensive input validation and business rule enforcement

## 📁 Project Structure

```
textile-printing-system/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── api/               # API endpoints
│   │   ├── core/              # Configuration and security
│   │   ├── models/            # Database models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic
│   │   └── utils/             # Utilities
│   ├── alembic/               # Database migrations
│   ├── tests/                 # Test cases
│   └── requirements.txt
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/             # Main pages
│   │   ├── services/          # API services
│   │   ├── hooks/             # Custom hooks
│   │   ├── context/           # React context
│   │   └── utils/             # Utilities
│   ├── public/
│   └── package.json
├── database/                   # Database scripts
│   ├── schema.sql             # Complete schema
│   ├── seed_data.sql          # Initial data
│   └── test_data.sql          # Test data
├── docs/                       # Documentation
│   ├── DEPLOYMENT_GUIDE.md
│   ├── USER_GUIDE.md
│   ├── API_DOCUMENTATION.md
│   └── TESTING_GUIDE.md
└── FUNCTIONAL_REQUIREMENTS.md
```

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+
- PostgreSQL 14+
- Git

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd textile-printing-system
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
   
   # Run schema creation
   psql -d textile_printing_db -f ../database/schema.sql
   
   # Load initial data
   psql -d textile_printing_db -f ../database/seed_data.sql
   ```

4. **Environment Configuration**
   ```bash
   # Create .env file in backend directory
   cp .env.example .env
   # Edit .env with your database credentials
   ```

5. **Start Backend Server**
   ```bash
   uvicorn app.main:app --reload
   # Server runs on http://localhost:8000
   ```

6. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   npm start
   # Application runs on http://localhost:3000
   ```

## 📖 Documentation Links

- [📋 Functional Requirements](FUNCTIONAL_REQUIREMENTS.md)
- [🚀 Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [👤 User Guide](docs/USER_GUIDE.md)
- [🔧 API Documentation](docs/API_DOCUMENTATION.md)
- [🧪 Testing Guide](docs/TESTING_GUIDE.md)

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v
```

### Frontend Tests
```bash
cd frontend
npm test
```

### End-to-End Tests
```bash
cd backend
pytest tests/e2e/ -v
```

## 🚀 Deployment

### Production Deployment Order
1. **Database**: Deploy PostgreSQL on Render.com
2. **Backend**: Deploy FastAPI on Render.com
3. **Frontend**: Deploy React app on Netlify

See [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) for detailed instructions.

## 📊 System Capabilities

- **Concurrent Users**: Up to 50 users
- **Annual Capacity**: 10,000+ orders per year
- **Report Generation**: Under 30 seconds
- **Page Load Time**: Under 3 seconds
- **Data Export**: PDF and Excel formats

## 🔒 Security Features

- JWT-based authentication
- Role-based access control
- Input validation and sanitization
- SQL injection prevention
- Audit trail for all critical operations

## 🆘 Support

For technical support or questions:
1. Check the [User Guide](docs/USER_GUIDE.md)
2. Review [API Documentation](docs/API_DOCUMENTATION.md)
3. Submit issues via the project issue tracker

## 📄 License

This project is proprietary software developed for digital textile printing business operations.

## 🔄 Version Information

- **Current Version**: 1.0.0
- **Last Updated**: 2024
- **Compatibility**: All modern browsers, PostgreSQL 14+, Python 3.9+ 