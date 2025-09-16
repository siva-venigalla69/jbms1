-- Minimal Schema Fix for Employee Management System
-- This creates only the essential tables without dependencies on existing structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- 1. EMPLOYEES TABLE (Minimal Version)
-- ==============================================

-- Drop and recreate employees table if it has issues
DROP TABLE IF EXISTS employees CASCADE;

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(15),
    department VARCHAR(50),
    designation VARCHAR(50) NOT NULL,
    employment_type VARCHAR(20) NOT NULL DEFAULT 'FULL_TIME',
    employee_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    base_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
    salary_type VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 2. SALARY PAYMENTS TABLE (Minimal Version)
-- ==============================================

DROP TABLE IF EXISTS salary_payments CASCADE;

CREATE TABLE salary_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    payment_period_start DATE NOT NULL,
    payment_period_end DATE NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    base_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    overtime_rate DECIMAL(10,2) DEFAULT 0,
    overtime_amount DECIMAL(15,2) DEFAULT 0,
    bonus_amount DECIMAL(15,2) DEFAULT 0,
    allowances DECIMAL(15,2) DEFAULT 0,
    incentives DECIMAL(15,2) DEFAULT 0,
    tax_deduction DECIMAL(15,2) DEFAULT 0,
    pf_deduction DECIMAL(15,2) DEFAULT 0,
    esi_deduction DECIMAL(15,2) DEFAULT 0,
    loan_deduction DECIMAL(15,2) DEFAULT 0,
    other_deductions DECIMAL(15,2) DEFAULT 0,
    gross_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_deductions DECIMAL(15,2) NOT NULL DEFAULT 0,
    net_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(20) DEFAULT 'BANK_TRANSFER',
    payment_reference VARCHAR(100),
    payment_status VARCHAR(20) DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 3. EXPENSES TABLE (Minimal Version)
-- ==============================================

DROP TABLE IF EXISTS expenses CASCADE;

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_number VARCHAR(50) UNIQUE NOT NULL,
    employee_id UUID REFERENCES employees(id),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expense_type VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'INR',
    vendor_name VARCHAR(100),
    vendor_contact VARCHAR(50),
    vendor_gst VARCHAR(15),
    invoice_number VARCHAR(50),
    invoice_date DATE,
    policy_limit DECIMAL(15,2),
    exceeds_policy BOOLEAN DEFAULT FALSE,
    business_purpose TEXT,
    status VARCHAR(20) DEFAULT 'DRAFT',
    submitted_by UUID REFERENCES employees(id),
    submitted_date TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES employees(id),
    approved_date TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    payment_method VARCHAR(20),
    payment_reference VARCHAR(100),
    payment_date DATE,
    payment_id UUID,
    reimbursement_status VARCHAR(20) DEFAULT 'PENDING',
    receipt_url TEXT,
    additional_documents TEXT[],
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 4. PURCHASES TABLE (Minimal Version)
-- ==============================================

DROP TABLE IF EXISTS purchases CASCADE;

CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    purchase_type VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 18.0,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'INR',
    vendor_name VARCHAR(100),
    vendor_contact VARCHAR(50),
    vendor_gst VARCHAR(15),
    vendor_address TEXT,
    invoice_number VARCHAR(50),
    invoice_date DATE,
    delivery_address TEXT,
    requested_by UUID REFERENCES employees(id),
    approved_by UUID REFERENCES employees(id),
    received_by UUID REFERENCES employees(id),
    status VARCHAR(20) DEFAULT 'DRAFT',
    approval_date TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    payment_terms VARCHAR(100),
    payment_status VARCHAR(20) DEFAULT 'PENDING',
    paid_amount DECIMAL(15,2) DEFAULT 0,
    outstanding_amount DECIMAL(15,2) DEFAULT 0,
    quality_check_status VARCHAR(20),
    quality_notes TEXT,
    warranty_period INTEGER,
    warranty_expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 5. PAYMENTS TABLE (Simplified)
-- ==============================================

DROP TABLE IF EXISTS payments CASCADE;

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    payment_type VARCHAR(30) NOT NULL,
    payment_category VARCHAR(30) NOT NULL,
    customer_id UUID,
    employee_id UUID REFERENCES employees(id),
    invoice_id UUID,
    expense_id UUID REFERENCES expenses(id),
    purchase_id UUID REFERENCES purchases(id),
    salary_payment_id UUID REFERENCES salary_payments(id),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    payment_method VARCHAR(30) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'PENDING',
    transaction_reference VARCHAR(100),
    bank_details TEXT,
    cheque_number VARCHAR(20),
    cheque_date DATE,
    upi_transaction_id VARCHAR(50),
    card_last_four VARCHAR(4),
    processed_by UUID REFERENCES employees(id),
    processed_date TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    description TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- SEQUENCES FOR AUTO-NUMBERING
-- ==============================================

DROP SEQUENCE IF EXISTS employee_code_seq CASCADE;
DROP SEQUENCE IF EXISTS salary_payment_seq CASCADE;
DROP SEQUENCE IF EXISTS expense_seq CASCADE;
DROP SEQUENCE IF EXISTS purchase_seq CASCADE;
DROP SEQUENCE IF EXISTS payment_seq CASCADE;

CREATE SEQUENCE employee_code_seq START 1001;
CREATE SEQUENCE salary_payment_seq START 1;
CREATE SEQUENCE expense_seq START 1;
CREATE SEQUENCE purchase_seq START 1;
CREATE SEQUENCE payment_seq START 1;

-- ==============================================
-- SIMPLE TRIGGER FUNCTIONS
-- ==============================================

-- Function to calculate salary amounts
CREATE OR REPLACE FUNCTION calculate_salary_amounts()
RETURNS TRIGGER AS $$
BEGIN
    NEW.gross_salary = NEW.base_amount + NEW.overtime_amount + NEW.bonus_amount + NEW.allowances + NEW.incentives;
    NEW.total_deductions = NEW.tax_deduction + NEW.pf_deduction + NEW.esi_deduction + NEW.loan_deduction + NEW.other_deductions;
    NEW.net_salary = NEW.gross_salary - NEW.total_deductions;
    
    IF NEW.payment_number IS NULL OR NEW.payment_number = '' THEN
        NEW.payment_number = 'SAL-' || TO_CHAR(NEW.payment_period_start, 'YYYY-MM') || '-' || LPAD(nextval('salary_payment_seq')::text, 4, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate expense amounts
CREATE OR REPLACE FUNCTION calculate_expense_amounts()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_amount = NEW.amount + COALESCE(NEW.tax_amount, 0);
    
    IF NEW.policy_limit IS NOT NULL AND NEW.total_amount > NEW.policy_limit THEN
        NEW.exceeds_policy = TRUE;
    END IF;
    
    IF NEW.expense_number IS NULL OR NEW.expense_number = '' THEN
        NEW.expense_number = 'EXP-' || TO_CHAR(NEW.expense_date, 'YYYYMM') || '-' || LPAD(nextval('expense_seq')::text, 4, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate purchase amounts
CREATE OR REPLACE FUNCTION calculate_purchase_amounts()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tax_amount = 0 THEN
        NEW.tax_amount = (NEW.quantity * NEW.unit_price * NEW.tax_rate / 100);
    END IF;
    
    NEW.total_amount = (NEW.quantity * NEW.unit_price) + NEW.tax_amount;
    NEW.outstanding_amount = NEW.total_amount - NEW.paid_amount;
    
    IF NEW.purchase_number IS NULL OR NEW.purchase_number = '' THEN
        NEW.purchase_number = 'PUR-' || TO_CHAR(NEW.order_date, 'YYYYMM') || '-' || LPAD(nextval('purchase_seq')::text, 4, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate payment numbers
CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_number IS NULL OR NEW.payment_number = '' THEN
        NEW.payment_number = 'PAY-' || TO_CHAR(NEW.payment_date, 'YYYYMM') || '-' || LPAD(nextval('payment_seq')::text, 4, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- CREATE TRIGGERS
-- ==============================================

DROP TRIGGER IF EXISTS salary_calculation_trigger ON salary_payments;
CREATE TRIGGER salary_calculation_trigger
    BEFORE INSERT OR UPDATE ON salary_payments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_salary_amounts();

DROP TRIGGER IF EXISTS expense_calculation_trigger ON expenses;
CREATE TRIGGER expense_calculation_trigger
    BEFORE INSERT OR UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION calculate_expense_amounts();

DROP TRIGGER IF EXISTS purchase_calculation_trigger ON purchases;
CREATE TRIGGER purchase_calculation_trigger
    BEFORE INSERT OR UPDATE ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION calculate_purchase_amounts();

DROP TRIGGER IF EXISTS payment_number_trigger ON payments;
CREATE TRIGGER payment_number_trigger
    BEFORE INSERT OR UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION generate_payment_number();

-- ==============================================
-- BASIC INDEXES
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(employee_status);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_salary_employee ON salary_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_status ON salary_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_expenses_employee ON expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);

-- ==============================================
-- SAMPLE DATA
-- ==============================================

INSERT INTO employees (employee_code, first_name, last_name, email, department, designation, base_salary, employment_type) 
VALUES 
('EMP1001', 'Admin', 'User', 'admin@company.com', 'IT', 'System Administrator', 50000, 'FULL_TIME'),
('EMP1002', 'John', 'Doe', 'john.doe@company.com', 'Sales', 'Sales Executive', 35000, 'FULL_TIME'),
('EMP1003', 'Jane', 'Smith', 'jane.smith@company.com', 'HR', 'HR Manager', 45000, 'FULL_TIME')
ON CONFLICT (employee_code) DO NOTHING;

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Minimal Employee Management Schema deployed successfully!';
    RAISE NOTICE '📊 Tables created: employees, salary_payments, expenses, purchases, payments';
    RAISE NOTICE '🔄 Triggers created for automatic calculations';
    RAISE NOTICE '👥 Sample employees added';
    RAISE NOTICE '🚀 Ready for API testing!';
END $$;