# Project Structure - Digital Textile Printing System

This document outlines the complete project structure for the Digital Textile Printing System, providing detailed information about each directory and file.

## 📁 Complete Directory Structure

```
textile-printing-system/
│
├── 📋 FUNCTIONAL_REQUIREMENTS.md      # Complete business requirements ✅
├── 📖 README.md                       # Project overview and quick start ✅  
├── 📅 IMPLEMENTATION_TIMELINE.md      # Detailed development phases ✅
├── 🌍 ENVIRONMENT_SETUP.md           # Development environment guide ✅
├── 📁 PROJECT_STRUCTURE.md           # This file ✅
├── .gitignore                         # Git ignore patterns
├── validate_environment.sh            # Environment validation script
├── docker-compose.yml                # Docker development setup (optional)
│
├── 📂 backend/                        # FastAPI Backend
│   ├── 📄 requirements.txt           # Python dependencies ✅
│   ├── 📄 .env.example              # Environment variables template
│   ├── 📄 .env                      # Local environment variables (git ignored)
│   ├── 📄 start_dev.sh              # Development startup script
│   ├── 📄 pytest.ini               # Testing configuration
│   ├── 📄 mypy.ini                 # Type checking configuration
│   ├── 📄 Dockerfile               # Production container setup
│   ├── 📄 render.yaml              # Render.com deployment config
│   │
│   ├── 📂 app/                      # Main application package
│   │   ├── 📄 __init__.py
│   │   ├── 📄 main.py              # FastAPI application entry ✅
│   │   │
│   │   ├── 📂 core/                # Core configuration
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 config.py        # Application settings ✅
│   │   │   ├── 📄 database.py      # Database connection
│   │   │   ├── 📄 security.py      # Authentication & JWT
│   │   │   └── 📄 exceptions.py    # Custom exceptions
│   │   │
│   │   ├── 📂 api/                 # API layer
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 deps.py          # Dependency injection
│   │   │   └── 📂 v1/              # API version 1
│   │   │       ├── 📄 __init__.py
│   │   │       ├── 📄 router.py    # Main API router
│   │   │       ├── 📄 auth.py      # Authentication endpoints
│   │   │       ├── 📄 users.py     # User management
│   │   │       ├── 📄 customers.py # Customer endpoints
│   │   │       ├── 📄 orders.py    # Order management
│   │   │       ├── 📄 production.py# Production tracking
│   │   │       ├── 📄 materials.py # Material in/out
│   │   │       ├── 📄 challans.py  # Delivery challans
│   │   │       ├── 📄 invoices.py  # GST invoices
│   │   │       ├── 📄 payments.py  # Payment recording
│   │   │       ├── 📄 returns.py   # Returns processing
│   │   │       ├── 📄 inventory.py # Inventory management
│   │   │       ├── 📄 expenses.py  # Expense recording
│   │   │       └── 📄 reports.py   # Reporting endpoints
│   │   │
│   │   ├── 📂 models/              # SQLAlchemy models
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 base.py          # Base model class
│   │   │   ├── 📄 user.py          # User model
│   │   │   ├── 📄 customer.py      # Customer model
│   │   │   ├── 📄 order.py         # Order & OrderItem models
│   │   │   ├── 📄 material.py      # Material in/out models
│   │   │   ├── 📄 challan.py       # Delivery challan models
│   │   │   ├── 📄 invoice.py       # GST invoice models
│   │   │   ├── 📄 payment.py       # Payment model
│   │   │   ├── 📄 returns.py       # Returns model
│   │   │   ├── 📄 inventory.py     # Inventory models
│   │   │   ├── 📄 expense.py       # Expense model
│   │   │   └── 📄 audit.py         # Audit log model
│   │   │
│   │   ├── 📂 schemas/             # Pydantic schemas
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 base.py          # Base schema classes
│   │   │   ├── 📄 user.py          # User schemas
│   │   │   ├── 📄 customer.py      # Customer schemas
│   │   │   ├── 📄 order.py         # Order schemas
│   │   │   ├── 📄 material.py      # Material schemas
│   │   │   ├── 📄 challan.py       # Challan schemas
│   │   │   ├── 📄 invoice.py       # Invoice schemas
│   │   │   ├── 📄 payment.py       # Payment schemas
│   │   │   ├── 📄 returns.py       # Returns schemas
│   │   │   ├── 📄 inventory.py     # Inventory schemas
│   │   │   ├── 📄 expense.py       # Expense schemas
│   │   │   ├── 📄 report.py        # Report schemas
│   │   │   └── 📄 response.py      # API response schemas
│   │   │
│   │   ├── 📂 services/            # Business logic layer
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 auth_service.py  # Authentication logic
│   │   │   ├── 📄 customer_service.py  # Customer business logic
│   │   │   ├── 📄 order_service.py     # Order business logic
│   │   │   ├── 📄 production_service.py # Production logic
│   │   │   ├── 📄 material_service.py  # Material tracking logic
│   │   │   ├── 📄 challan_service.py   # Challan logic
│   │   │   ├── 📄 invoice_service.py   # Invoice logic
│   │   │   ├── 📄 payment_service.py   # Payment logic
│   │   │   ├── 📄 returns_service.py   # Returns logic
│   │   │   ├── 📄 inventory_service.py # Inventory logic
│   │   │   ├── 📄 expense_service.py   # Expense logic
│   │   │   ├── 📄 report_service.py    # Report generation
│   │   │   └── 📄 audit_service.py     # Audit trail logic
│   │   │
│   │   ├── 📂 utils/               # Utility functions
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 validators.py    # Input validation functions
│   │   │   ├── 📄 formatters.py    # Data formatting utilities
│   │   │   ├── 📄 pdf_generator.py # PDF generation utilities
│   │   │   ├── 📄 excel_exporter.py# Excel export utilities
│   │   │   ├── 📄 number_generator.py # Order/Invoice number generation
│   │   │   ├── 📄 gst_calculator.py   # GST calculation utilities
│   │   │   └── 📄 constants.py     # Application constants
│   │   │
│   │   └── 📂 middleware/          # Custom middleware
│   │       ├── 📄 __init__.py
│   │       ├── 📄 auth_middleware.py   # Authentication middleware
│   │       ├── 📄 audit_middleware.py  # Audit logging middleware
│   │       └── 📄 cors_middleware.py   # CORS handling
│   │
│   ├── 📂 alembic/                 # Database migrations
│   │   ├── 📄 env.py
│   │   ├── 📄 script.py.mako
│   │   ├── 📄 alembic.ini
│   │   └── 📂 versions/            # Migration files
│   │       └── 📄 001_initial_schema.py
│   │
│   ├── 📂 tests/                   # Test suite
│   │   ├── 📄 __init__.py
│   │   ├── 📄 conftest.py         # Test configuration
│   │   ├── 📂 unit/               # Unit tests
│   │   │   ├── 📄 test_customer_service.py
│   │   │   ├── 📄 test_order_service.py
│   │   │   ├── 📄 test_invoice_service.py
│   │   │   ├── 📄 test_payment_service.py
│   │   │   ├── 📄 test_report_service.py
│   │   │   └── 📄 test_auth_service.py
│   │   ├── 📂 integration/         # Integration tests
│   │   │   ├── 📄 test_customer_api.py
│   │   │   ├── 📄 test_order_api.py
│   │   │   ├── 📄 test_invoice_api.py
│   │   │   └── 📄 test_reports_api.py
│   │   ├── 📂 e2e/                # End-to-end tests
│   │   │   ├── 📄 test_order_workflow.py
│   │   │   ├── 📄 test_invoice_workflow.py
│   │   │   └── 📄 test_complete_business_flow.py
│   │   ├── 📂 performance/         # Performance tests
│   │   │   ├── 📄 test_load.py
│   │   │   └── 📄 test_reports_performance.py
│   │   ├── 📂 security/           # Security tests
│   │   │   └── 📄 test_auth_security.py
│   │   └── 📂 fixtures/           # Test data and fixtures
│   │       ├── 📄 factories.py
│   │       └── 📄 sample_data.py
│   │
│   └── 📂 exports/                # Generated reports (git ignored)
│       ├── 📂 pdf/
│       └── 📂 excel/
│
├── 📂 frontend/                    # React Frontend
│   ├── 📄 package.json           # Node.js dependencies
│   ├── 📄 package-lock.json
│   ├── 📄 .env                   # Environment variables (git ignored)
│   ├── 📄 .env.example          # Environment template
│   ├── 📄 .env.production       # Production environment
│   ├── 📄 netlify.toml          # Netlify deployment config
│   ├── 📄 tsconfig.json         # TypeScript configuration
│   ├── 📄 craco.config.js       # Build configuration (if needed)
│   │
│   ├── 📂 public/               # Static files
│   │   ├── 📄 index.html
│   │   ├── 📄 favicon.ico
│   │   ├── 📄 manifest.json
│   │   └── 📂 icons/            # App icons
│   │
│   └── 📂 src/                  # Source code
│       ├── 📄 index.tsx         # Application entry point
│       ├── 📄 App.tsx           # Main App component
│       ├── 📄 App.css           # Global styles
│       ├── 📄 index.css
│       │
│       ├── 📂 components/       # Reusable components
│       │   ├── 📂 common/       # Shared components
│       │   │   ├── 📄 Layout.tsx        # Main layout wrapper
│       │   │   ├── 📄 Navigation.tsx    # Navigation menu
│       │   │   ├── 📄 Header.tsx        # Page header
│       │   │   ├── 📄 Footer.tsx        # Page footer
│       │   │   ├── 📄 DataTable.tsx     # Reusable data table
│       │   │   ├── 📄 SearchBox.tsx     # Search component
│       │   │   ├── 📄 Pagination.tsx    # Pagination component
│       │   │   ├── 📄 LoadingSpinner.tsx# Loading indicator
│       │   │   ├── 📄 ErrorBoundary.tsx # Error handling
│       │   │   ├── 📄 ConfirmDialog.tsx # Confirmation dialogs
│       │   │   └── 📂 forms/           # Form components
│       │   │       ├── 📄 FormField.tsx
│       │   │       ├── 📄 FormSelect.tsx
│       │   │       ├── 📄 FormDatePicker.tsx
│       │   │       └── 📄 FormValidation.tsx
│       │   │
│       │   ├── 📂 auth/         # Authentication components
│       │   │   ├── 📄 Login.tsx
│       │   │   ├── 📄 PasswordChange.tsx
│       │   │   └── 📄 UserProfile.tsx
│       │   │
│       │   ├── 📂 customers/    # Customer management
│       │   │   ├── 📄 CustomerList.tsx
│       │   │   ├── 📄 CustomerForm.tsx
│       │   │   ├── 📄 CustomerDetails.tsx
│       │   │   ├── 📄 CustomerSearch.tsx
│       │   │   └── 📄 CustomerCard.tsx
│       │   │
│       │   ├── 📂 orders/       # Order management
│       │   │   ├── 📄 OrderList.tsx
│       │   │   ├── 📄 OrderForm.tsx
│       │   │   ├── 📄 OrderDetails.tsx
│       │   │   ├── 📄 OrderItemForm.tsx
│       │   │   ├── 📄 OrderStatusTracker.tsx
│       │   │   └── 📄 OrderSummary.tsx
│       │   │
│       │   ├── 📂 production/   # Production tracking
│       │   │   ├── 📄 ProductionDashboard.tsx
│       │   │   ├── 📄 ProductionTracker.tsx
│       │   │   ├── 📄 StageUpdateModal.tsx
│       │   │   ├── 📄 ProductionCalendar.tsx
│       │   │   └── 📄 WorkflowVisualization.tsx
│       │   │
│       │   ├── 📂 materials/    # Material management
│       │   │   ├── 📄 MaterialIn.tsx
│       │   │   ├── 📄 MaterialOut.tsx
│       │   │   ├── 📄 MaterialFlow.tsx
│       │   │   └── 📄 MaterialHistory.tsx
│       │   │
│       │   ├── 📂 challans/     # Delivery challans
│       │   │   ├── 📄 ChallanList.tsx
│       │   │   ├── 📄 ChallanForm.tsx
│       │   │   ├── 📄 ChallanDetails.tsx
│       │   │   ├── 📄 ChallanPrint.tsx
│       │   │   └── 📄 DeliveryTracking.tsx
│       │   │
│       │   ├── 📂 invoices/     # Invoice management
│       │   │   ├── 📄 InvoiceList.tsx
│       │   │   ├── 📄 InvoiceForm.tsx
│       │   │   ├── 📄 InvoiceDetails.tsx
│       │   │   ├── 📄 InvoiceGenerator.tsx
│       │   │   ├── 📄 GSTCalculator.tsx
│       │   │   └── 📄 InvoicePrint.tsx
│       │   │
│       │   ├── 📂 payments/     # Payment management
│       │   │   ├── 📄 PaymentList.tsx
│       │   │   ├── 📄 PaymentForm.tsx
│       │   │   ├── 📄 PaymentHistory.tsx
│       │   │   └── 📄 OutstandingTracker.tsx
│       │   │
│       │   ├── 📂 returns/      # Returns processing
│       │   │   ├── 📄 ReturnsList.tsx
│       │   │   ├── 📄 ReturnsForm.tsx
│       │   │   ├── 📄 ReturnsDetails.tsx
│       │   │   └── 📄 RefundProcessor.tsx
│       │   │
│       │   ├── 📂 inventory/    # Inventory management
│       │   │   ├── 📄 InventoryList.tsx
│       │   │   ├── 📄 InventoryForm.tsx
│       │   │   ├── 📄 StockAlerts.tsx
│       │   │   ├── 📄 InventoryAdjustments.tsx
│       │   │   └── 📄 InventoryDashboard.tsx
│       │   │
│       │   ├── 📂 expenses/     # Expense management
│       │   │   ├── 📄 ExpensesList.tsx
│       │   │   ├── 📄 ExpenseForm.tsx
│       │   │   ├── 📄 ExpenseCategories.tsx
│       │   │   └── 📄 ExpenseAnalytics.tsx
│       │   │
│       │   ├── 📂 reports/      # Reporting system
│       │   │   ├── 📄 ReportsDashboard.tsx
│       │   │   ├── 📄 PendingOrders.tsx
│       │   │   ├── 📄 ProductionStatus.tsx
│       │   │   ├── 📄 StockHolding.tsx
│       │   │   ├── 📄 PendingReceivables.tsx
│       │   │   ├── 📄 PaymentsReceived.tsx
│       │   │   ├── 📄 MaterialFlow.tsx
│       │   │   ├── 📄 DamagedReturns.tsx
│       │   │   ├── 📄 ExpensesReport.tsx
│       │   │   ├── 📄 DailyOperations.tsx
│       │   │   ├── 📄 ReportFilters.tsx
│       │   │   └── 📄 ReportExport.tsx
│       │   │
│       │   └── 📂 admin/        # Admin components
│       │       ├── 📄 UserManagement.tsx
│       │       ├── 📄 UserForm.tsx
│       │       ├── 📄 SystemSettings.tsx
│       │       ├── 📄 AuditLog.tsx
│       │       └── 📄 BackupRestore.tsx
│       │
│       ├── 📂 pages/            # Main page components
│       │   ├── 📄 Dashboard.tsx     # Main dashboard
│       │   ├── 📄 Customers.tsx     # Customer management page
│       │   ├── 📄 Orders.tsx        # Order management page
│       │   ├── 📄 Production.tsx    # Production tracking page
│       │   ├── 📄 Materials.tsx     # Material management page
│       │   ├── 📄 Deliveries.tsx    # Delivery management page
│       │   ├── 📄 Invoices.tsx      # Invoice management page
│       │   ├── 📄 Payments.tsx      # Payment management page
│       │   ├── 📄 Returns.tsx       # Returns management page
│       │   ├── 📄 Inventory.tsx     # Inventory management page
│       │   ├── 📄 Expenses.tsx      # Expense management page
│       │   ├── 📄 Reports.tsx       # Reports dashboard
│       │   ├── 📄 Settings.tsx      # System settings
│       │   └── 📄 Profile.tsx       # User profile
│       │
│       ├── 📂 services/         # API service layer
│       │   ├── 📄 api.ts            # Base API configuration
│       │   ├── 📄 auth.ts           # Authentication API
│       │   ├── 📄 customers.ts      # Customer API
│       │   ├── 📄 orders.ts         # Order API
│       │   ├── 📄 production.ts     # Production API
│       │   ├── 📄 materials.ts      # Material API
│       │   ├── 📄 challans.ts       # Challan API
│       │   ├── 📄 invoices.ts       # Invoice API
│       │   ├── 📄 payments.ts       # Payment API
│       │   ├── 📄 returns.ts        # Returns API
│       │   ├── 📄 inventory.ts      # Inventory API
│       │   ├── 📄 expenses.ts       # Expense API
│       │   └── 📄 reports.ts        # Reports API
│       │
│       ├── 📂 hooks/            # Custom React hooks
│       │   ├── 📄 useAuth.ts        # Authentication hook
│       │   ├── 📄 useApi.ts         # API calling hook
│       │   ├── 📄 usePagination.ts  # Pagination hook
│       │   ├── 📄 useLocalStorage.ts# Local storage hook
│       │   ├── 📄 useDebounce.ts    # Debounce hook
│       │   ├── 📄 useCustomers.ts   # Customer data hook
│       │   ├── 📄 useOrders.ts      # Order data hook
│       │   ├── 📄 useReports.ts     # Reports data hook
│       │   └── 📄 useNotifications.ts# Notifications hook
│       │
│       ├── 📂 context/          # React context providers
│       │   ├── 📄 AuthContext.tsx   # Authentication context
│       │   ├── 📄 ThemeContext.tsx  # UI theme context
│       │   ├── 📄 NotificationContext.tsx # Notifications
│       │   └── 📄 AppContext.tsx    # Global app state
│       │
│       ├── 📂 utils/            # Utility functions
│       │   ├── 📄 constants.ts      # Application constants
│       │   ├── 📄 formatters.ts     # Data formatting
│       │   ├── 📄 validators.ts     # Form validation
│       │   ├── 📄 helpers.ts        # Helper functions
│       │   ├── 📄 dateUtils.ts      # Date manipulation
│       │   ├── 📄 numberUtils.ts    # Number formatting
│       │   ├── 📄 exportUtils.ts    # Data export utilities
│       │   └── 📄 apiUtils.ts       # API utility functions
│       │
│       ├── 📂 types/            # TypeScript type definitions
│       │   ├── 📄 index.ts          # Main type exports
│       │   ├── 📄 auth.ts           # Authentication types
│       │   ├── 📄 customer.ts       # Customer types
│       │   ├── 📄 order.ts          # Order types
│       │   ├── 📄 invoice.ts        # Invoice types
│       │   ├── 📄 payment.ts        # Payment types
│       │   ├── 📄 inventory.ts      # Inventory types
│       │   ├── 📄 report.ts         # Report types
│       │   └── 📄 api.ts            # API response types
│       │
│       ├── 📂 styles/           # Styling files
│       │   ├── 📄 globals.css       # Global styles
│       │   ├── 📄 variables.css     # CSS variables
│       │   ├── 📄 components.css    # Component styles
│       │   ├── 📄 utilities.css     # Utility classes
│       │   └── 📂 themes/          # Theme definitions
│       │       ├── 📄 light.css
│       │       └── 📄 dark.css
│       │
│       └── 📂 __tests__/        # Frontend tests
│           ├── 📄 App.test.tsx
│           ├── 📂 components/    # Component tests
│           ├── 📂 services/      # Service tests
│           ├── 📂 hooks/         # Hook tests
│           └── 📂 utils/         # Utility tests
│
├── 📂 database/                 # Database files
│   ├── 📄 schema.sql           # Complete database schema ✅
│   ├── 📄 seed_data.sql        # Initial seed data
│   ├── 📄 test_data.sql        # Test data for development
│   ├── 📄 backup_script.sh     # Database backup script
│   ├── 📄 restore_script.sh    # Database restore script
│   └── 📂 migrations/          # Manual migration scripts
│       ├── 📄 001_initial_setup.sql
│       ├── 📄 002_add_audit_tables.sql
│       └── 📄 003_performance_indexes.sql
│
├── 📂 docs/                    # Documentation
│   ├── 📄 DEPLOYMENT_GUIDE.md  # Deployment instructions ✅
│   ├── 📄 USER_GUIDE.md        # End-user documentation ✅
│   ├── 📄 API_DOCUMENTATION.md # API endpoint documentation
│   ├── 📄 TESTING_GUIDE.md     # Testing procedures ✅
│   ├── 📄 CONTRIBUTING.md      # Development guidelines
│   ├── 📄 CHANGELOG.md         # Version change log
│   ├── 📂 api/                 # API documentation files
│   │   ├── 📄 endpoints.md
│   │   ├── 📄 authentication.md
│   │   └── 📄 examples.md
│   ├── 📂 screenshots/         # Application screenshots
│   │   ├── 📄 dashboard.png
│   │   ├── 📄 orders.png
│   │   └── 📄 reports.png
│   └── 📂 diagrams/           # System diagrams
│       ├── 📄 architecture.png
│       ├── 📄 database_schema.png
│       └── 📄 workflow_diagram.png
│
├── 📂 scripts/                 # Utility scripts
│   ├── 📄 setup_dev.sh        # Development setup script
│   ├── 📄 deploy_production.sh # Production deployment
│   ├── 📄 backup_database.sh  # Database backup
│   ├── 📄 generate_reports.py # Automated report generation
│   ├── 📄 data_migration.py   # Data migration utilities
│   └── 📄 health_check.sh     # System health monitoring
│
├── 📂 docker/                  # Docker configuration (optional)
│   ├── 📄 Dockerfile.backend   # Backend container
│   ├── 📄 Dockerfile.frontend  # Frontend container
│   ├── 📄 docker-compose.yml   # Development environment
│   ├── 📄 docker-compose.prod.yml # Production environment
│   └── 📂 config/              # Docker config files
│
└── 📂 .github/                # GitHub workflows (if using GitHub)
    └── 📂 workflows/
        ├── 📄 test.yml         # Automated testing
        ├── 📄 deploy.yml       # Automated deployment
        └── 📄 code_quality.yml # Code quality checks
```

## 📋 File Status Legend

- ✅ **Created**: File has been created and documented
- 🔄 **In Progress**: File is being developed
- ⏳ **Pending**: File needs to be created
- 📝 **Template**: Template file for reference

## 🎯 Key Components Overview

### Backend Architecture (FastAPI)
- **Layered Architecture**: Clean separation of concerns
- **API Layer**: RESTful endpoints with proper HTTP methods
- **Service Layer**: Business logic implementation
- **Model Layer**: Database models and relationships
- **Schema Layer**: Request/response validation
- **Utils Layer**: Shared utilities and helpers

### Frontend Architecture (React + TypeScript)
- **Component-Based**: Reusable and maintainable components
- **Page-Based Routing**: Clear navigation structure
- **Service Layer**: API communication abstraction
- **Hook-Based State**: Custom hooks for state management
- **Type Safety**: Full TypeScript implementation
- **Context Providers**: Global state management

### Database Design (PostgreSQL)
- **Normalized Schema**: Proper relational design
- **Audit Trail**: Complete change tracking
- **Soft Deletes**: Data preservation for auditing
- **Performance Indexes**: Optimized query performance
- **Constraints**: Data integrity enforcement

### Documentation Structure
- **User-Focused**: Clear guides for different user types
- **Developer-Focused**: Technical implementation details
- **Deployment-Focused**: Production deployment guides
- **Maintenance-Focused**: Ongoing system maintenance

## 🔍 Directory Purpose Explanation

### `/backend/app/core/`
Contains core application configuration and shared functionality:
- Database connection management
- Security and authentication setup
- Application-wide settings
- Custom exception definitions

### `/backend/app/api/v1/`
API endpoints organized by business domain:
- RESTful endpoint implementations
- Request/response handling
- Input validation
- Error handling

### `/backend/app/services/`
Business logic layer:
- Domain-specific business rules
- Data processing and validation
- Integration between different domains
- Complex calculations and workflows

### `/backend/app/models/`
Database model definitions:
- SQLAlchemy ORM models
- Table relationships
- Model methods and properties
- Database constraints

### `/frontend/src/components/`
Reusable UI components organized by feature:
- Business domain components
- Common/shared components
- Form components
- Display components

### `/frontend/src/pages/`
Top-level page components:
- Main application pages
- Route-specific components
- Page-level state management
- Layout composition

### `/frontend/src/services/`
API communication layer:
- HTTP client configuration
- API endpoint functions
- Response handling
- Error management

## 📁 File Naming Conventions

### Backend Files
- **Models**: `customer.py`, `order.py` (singular, lowercase)
- **Services**: `customer_service.py` (descriptive with suffix)
- **Schemas**: `customer.py` (matches model name)
- **APIs**: `customers.py` (plural for collection endpoints)

### Frontend Files
- **Components**: `CustomerList.tsx` (PascalCase)
- **Pages**: `Customers.tsx` (PascalCase, often plural)
- **Services**: `customers.ts` (camelCase, plural)
- **Types**: `customer.ts` (camelCase, singular)
- **Hooks**: `useCustomers.ts` (camelCase with use prefix)

### Database Files
- **Schema**: `schema.sql` (descriptive)
- **Migrations**: `001_description.sql` (numbered with description)
- **Seed Data**: `seed_data.sql` (descriptive)

## 🚀 Development Workflow

### Backend Development
1. **Model First**: Define database models
2. **Schema Definition**: Create Pydantic schemas
3. **Service Logic**: Implement business logic
4. **API Endpoints**: Create RESTful endpoints
5. **Testing**: Write unit and integration tests

### Frontend Development
1. **Type Definitions**: Define TypeScript types
2. **API Services**: Create API communication layer
3. **Components**: Build reusable components
4. **Pages**: Compose pages from components
5. **Testing**: Write component and integration tests

### Integration Development
1. **Database Schema**: Ensure proper relationships
2. **API Documentation**: Document all endpoints
3. **Error Handling**: Implement proper error responses
4. **Validation**: Add input validation at all layers
5. **Security**: Implement authentication and authorization

## 📊 Code Organization Principles

### Single Responsibility
- Each file has a single, well-defined purpose
- Functions and classes focus on one task
- Clear separation between business logic and presentation

### Dependency Direction
- Higher-level modules don't depend on lower-level modules
- Both depend on abstractions (interfaces/schemas)
- Database models don't know about API endpoints

### Consistency
- Consistent naming conventions across the project
- Similar patterns for similar functionality
- Standardized error handling and response formats

### Maintainability
- Clear documentation for complex logic
- Modular design for easy modification
- Comprehensive testing for confidence in changes

This project structure ensures scalability, maintainability, and clear separation of concerns while following modern software development best practices. 