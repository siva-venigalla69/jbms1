-- Fixed Enhanced Employee & Payments Management System
-- Comprehensive database schema with corrected generated columns
-- Fixes PostgreSQL error: cannot use generated column in column generation expression

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- 1. EMPLOYEES TABLE (Enhanced)
-- ==============================================

CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(15),
    date_of_birth DATE,
    gender VARCHAR(10),
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    postal_code VARCHAR(10),
    country VARCHAR(50) DEFAULT 'India',
    
    -- Employment Details
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    employment_type VARCHAR(20) NOT NULL DEFAULT 'FULL_TIME', -- FULL_TIME, PART_TIME, CONTRACT, INTERN
    employee_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, TERMINATED
    department VARCHAR(50),
    designation VARCHAR(50) NOT NULL,
    reporting_manager_id UUID REFERENCES employees(id),
    
    -- Salary Information
    base_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
    salary_type VARCHAR(20) NOT NULL DEFAULT 'MONTHLY', -- MONTHLY, DAILY, HOURLY
    currency VARCHAR(3) DEFAULT 'INR',
    
    -- Bank Details
    bank_account_number VARCHAR(30),
    bank_name VARCHAR(100),
    bank_branch VARCHAR(100),
    bank_ifsc_code VARCHAR(11),
    
    -- Tax Information
    pan_number VARCHAR(10),
    aadhaar_number VARCHAR(12),
    pf_account_number VARCHAR(20),
    esi_number VARCHAR(17),
    
    -- Employment History
    previous_employer VARCHAR(100),
    previous_designation VARCHAR(50),
    experience_years INTEGER DEFAULT 0,
    
    -- Emergency Contact
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(15),
    emergency_contact_relationship VARCHAR(50),
    
    -- Documents
    profile_photo_url TEXT,
    resume_url TEXT,
    documents_folder_url TEXT,
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    
    -- Constraints
    CONSTRAINT chk_employee_salary CHECK (base_salary >= 0),
    CONSTRAINT chk_employee_experience CHECK (experience_years >= 0)
);

-- ==============================================
-- 2. SALARY PAYMENTS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS salary_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Payment Period
    payment_period_start DATE NOT NULL,
    payment_period_end DATE NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Salary Components
    base_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    overtime_rate DECIMAL(10,2) DEFAULT 0,
    overtime_amount DECIMAL(15,2) DEFAULT 0,
    bonus_amount DECIMAL(15,2) DEFAULT 0,
    allowances DECIMAL(15,2) DEFAULT 0,
    incentives DECIMAL(15,2) DEFAULT 0,
    
    -- Deductions
    tax_deduction DECIMAL(15,2) DEFAULT 0,
    pf_deduction DECIMAL(15,2) DEFAULT 0,
    esi_deduction DECIMAL(15,2) DEFAULT 0,
    loan_deduction DECIMAL(15,2) DEFAULT 0,
    other_deductions DECIMAL(15,2) DEFAULT 0,
    
    -- Calculated amounts (NOT generated columns to avoid issues)
    gross_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_deductions DECIMAL(15,2) NOT NULL DEFAULT 0,
    net_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Payment Details
    payment_method VARCHAR(20) DEFAULT 'BANK_TRANSFER', -- BANK_TRANSFER, CASH, CHEQUE
    payment_reference VARCHAR(100),
    payment_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PAID, CANCELLED
    
    -- Approval
    approved_by UUID REFERENCES employees(id),
    approved_date TIMESTAMP WITH TIME ZONE,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    
    -- Constraints
    CONSTRAINT chk_salary_dates CHECK (payment_period_start <= payment_period_end),
    CONSTRAINT chk_salary_amounts CHECK (base_amount >= 0 AND gross_salary >= 0),
    UNIQUE(employee_id, payment_period_start, payment_period_end)
);

-- ==============================================
-- 3. EXPENSES TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_number VARCHAR(50) UNIQUE NOT NULL,
    employee_id UUID REFERENCES employees(id),
    
    -- Expense Details
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expense_type VARCHAR(50) NOT NULL, -- TRAVEL, FOOD, ACCOMMODATION, TRANSPORT, OFFICE_SUPPLIES, etc.
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    description TEXT NOT NULL,
    
    -- Financial Details
    amount DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0, -- Will be calculated via trigger
    currency VARCHAR(3) DEFAULT 'INR',
    
    -- Vendor Information
    vendor_name VARCHAR(100),
    vendor_contact VARCHAR(50),
    vendor_gst VARCHAR(15),
    invoice_number VARCHAR(50),
    invoice_date DATE,
    
    -- Policy and Compliance
    policy_limit DECIMAL(15,2),
    exceeds_policy BOOLEAN DEFAULT FALSE,
    business_purpose TEXT,
    
    -- Approval Workflow
    status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, APPROVED, REJECTED, PAID, REIMBURSED
    submitted_by UUID REFERENCES employees(id),
    submitted_date TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES employees(id),
    approved_date TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Payment Information
    payment_method VARCHAR(20),
    payment_reference VARCHAR(100),
    payment_date DATE,
    payment_id UUID, -- Link to payments table
    reimbursement_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PROCESSED, COMPLETED
    
    -- Documentation
    receipt_url TEXT,
    additional_documents TEXT[],
    
    -- Notes and Comments
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    
    -- Constraints
    CONSTRAINT chk_expense_amounts CHECK (amount > 0 AND total_amount >= amount)
);

-- ==============================================
-- 4. PURCHASES TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID, -- References vendors table (if exists)
    
    -- Order Details
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    
    -- Purchase Information
    purchase_type VARCHAR(50) NOT NULL, -- MATERIAL, EQUIPMENT, SERVICES, OFFICE_SUPPLIES, etc.
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    
    -- Financial Calculations (NOT generated to avoid dependency issues)
    tax_rate DECIMAL(5,2) DEFAULT 18.0,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'INR',
    
    -- Vendor Details
    vendor_name VARCHAR(100),
    vendor_contact VARCHAR(50),
    vendor_gst VARCHAR(15),
    vendor_address TEXT,
    invoice_number VARCHAR(50),
    invoice_date DATE,
    
    -- Delivery Information
    delivery_address TEXT,
    
    -- Approval Workflow
    requested_by UUID REFERENCES employees(id),
    approved_by UUID REFERENCES employees(id),
    received_by UUID REFERENCES employees(id),
    status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, PENDING_APPROVAL, APPROVED, ORDERED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
    approval_date TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Payment Information
    payment_terms VARCHAR(100),
    payment_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PARTIAL, PAID, OVERDUE
    paid_amount DECIMAL(15,2) DEFAULT 0,
    outstanding_amount DECIMAL(15,2) DEFAULT 0, -- Will be calculated via trigger
    
    -- Quality and Compliance
    quality_check_status VARCHAR(20), -- PENDING, PASSED, FAILED, WAIVED
    quality_notes TEXT,
    compliance_documents TEXT[],
    
    -- Warranty and Support
    warranty_period INTEGER, -- in months
    warranty_expiry_date DATE,
    support_contact VARCHAR(100),
    
    -- Additional Information
    notes TEXT,
    specifications JSONB,
    custom_fields JSONB,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    
    -- Constraints
    CONSTRAINT chk_purchase_amounts CHECK (quantity > 0 AND unit_price >= 0 AND total_amount >= 0),
    CONSTRAINT chk_purchase_dates CHECK (order_date <= COALESCE(expected_delivery_date, order_date + INTERVAL '365 days'))
);

-- ==============================================
-- 5. EMPLOYEE LOANS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS employee_loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_number VARCHAR(50) UNIQUE NOT NULL,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Loan Details
    loan_type VARCHAR(50) NOT NULL, -- PERSONAL, HOME, VEHICLE, EDUCATION, MEDICAL, ADVANCE
    amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2) DEFAULT 0,
    tenure_months INTEGER NOT NULL,
    emi_amount DECIMAL(15,2) NOT NULL,
    
    -- Dates
    sanctioned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    first_emi_date DATE NOT NULL,
    maturity_date DATE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, CLOSED, DEFAULTED
    recovered_amount DECIMAL(15,2) DEFAULT 0,
    outstanding_amount DECIMAL(15,2) NOT NULL DEFAULT 0, -- Will be calculated via trigger
    
    -- Approval
    sanctioned_by UUID REFERENCES employees(id),
    
    -- Additional Information
    purpose TEXT,
    guarantor_employee_id UUID REFERENCES employees(id),
    documents TEXT[],
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_loan_amounts CHECK (amount > 0 AND emi_amount > 0),
    CONSTRAINT chk_loan_tenure CHECK (tenure_months > 0)
);

-- ==============================================
-- 6. ENHANCED PAYMENTS TABLE (UNIFIED)
-- ==============================================

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Payment Classification
    payment_type VARCHAR(30) NOT NULL, -- CUSTOMER_PAYMENT, SALARY_PAYMENT, EXPENSE_PAYMENT, VENDOR_PAYMENT, REFUND
    payment_category VARCHAR(30) NOT NULL, -- INCOME, EXPENSE, TRANSFER
    
    -- Reference Links (Foreign Keys to related entities)
    customer_id UUID, -- References customers(id)
    employee_id UUID REFERENCES employees(id),
    invoice_id UUID, -- References gst_invoices(id) or invoices(id)
    expense_id UUID REFERENCES expenses(id),
    purchase_id UUID REFERENCES purchases(id),
    salary_payment_id UUID REFERENCES salary_payments(id),
    
    -- Payment Details
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    
    -- Payment Method and Status
    payment_method VARCHAR(30) NOT NULL, -- CASH, CHEQUE, BANK_TRANSFER, UPI, CARD, OTHER
    payment_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
    
    -- Payment Method Specific Details
    transaction_reference VARCHAR(100),
    bank_details TEXT,
    cheque_number VARCHAR(20),
    cheque_date DATE,
    upi_transaction_id VARCHAR(50),
    card_last_four VARCHAR(4),
    
    -- Processing Information
    processed_by UUID REFERENCES employees(id),
    processed_date TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    
    -- Description and Notes
    description TEXT,
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES employees(id),
    updated_by UUID REFERENCES employees(id),
    
    -- Constraints
    CONSTRAINT chk_payment_amount CHECK (amount > 0),
    CONSTRAINT chk_payment_links CHECK (
        (customer_id IS NOT NULL AND payment_type = 'CUSTOMER_PAYMENT') OR
        (employee_id IS NOT NULL AND payment_type IN ('SALARY_PAYMENT', 'EXPENSE_PAYMENT')) OR
        (purchase_id IS NOT NULL AND payment_type = 'VENDOR_PAYMENT') OR
        (payment_type = 'REFUND')
    )
);

-- ==============================================
-- 7. EMPLOYEE ATTENDANCE TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS employee_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    
    -- Attendance Status
    status VARCHAR(20) NOT NULL DEFAULT 'ABSENT', -- PRESENT, ABSENT, HALF_DAY, LATE, ON_LEAVE
    check_in_time TIME,
    check_out_time TIME,
    total_hours DECIMAL(4,2) DEFAULT 0,
    
    -- Leave Information
    leave_type VARCHAR(30), -- SICK, CASUAL, EARNED, MATERNITY, PATERNITY, etc.
    leave_reason TEXT,
    
    -- Overtime
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    overtime_approved BOOLEAN DEFAULT FALSE,
    
    -- Location (if tracking)
    work_location VARCHAR(100),
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    recorded_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_attendance_hours CHECK (total_hours >= 0 AND total_hours <= 24),
    UNIQUE(employee_id, attendance_date)
);

-- ==============================================
-- TRIGGERS FOR AUTOMATIC CALCULATIONS
-- ==============================================

-- Trigger function for salary calculations
CREATE OR REPLACE FUNCTION calculate_salary_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate gross salary
    NEW.gross_salary = NEW.base_amount + NEW.overtime_amount + NEW.bonus_amount + NEW.allowances + NEW.incentives;
    
    -- Calculate total deductions
    NEW.total_deductions = NEW.tax_deduction + NEW.pf_deduction + NEW.esi_deduction + NEW.loan_deduction + NEW.other_deductions;
    
    -- Calculate net salary
    NEW.net_salary = NEW.gross_salary - NEW.total_deductions;
    
    -- Generate payment number if not provided
    IF NEW.payment_number IS NULL OR NEW.payment_number = '' THEN
        NEW.payment_number = 'SAL-' || TO_CHAR(NEW.payment_period_start, 'YYYY-MM') || '-' || LPAD(nextval('salary_payment_seq')::text, 4, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for expense calculations
CREATE OR REPLACE FUNCTION calculate_expense_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate total amount
    NEW.total_amount = NEW.amount + COALESCE(NEW.tax_amount, 0);
    
    -- Check policy limits
    IF NEW.policy_limit IS NOT NULL AND NEW.total_amount > NEW.policy_limit THEN
        NEW.exceeds_policy = TRUE;
    END IF;
    
    -- Generate expense number if not provided
    IF NEW.expense_number IS NULL OR NEW.expense_number = '' THEN
        NEW.expense_number = 'EXP-' || TO_CHAR(NEW.expense_date, 'YYYYMM') || '-' || LPAD(nextval('expense_seq')::text, 4, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for purchase calculations
CREATE OR REPLACE FUNCTION calculate_purchase_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate tax amount if not provided
    IF NEW.tax_amount = 0 THEN
        NEW.tax_amount = (NEW.quantity * NEW.unit_price * NEW.tax_rate / 100);
    END IF;
    
    -- Calculate total amount
    NEW.total_amount = (NEW.quantity * NEW.unit_price) + NEW.tax_amount;
    
    -- Calculate outstanding amount
    NEW.outstanding_amount = NEW.total_amount - NEW.paid_amount;
    
    -- Generate purchase number if not provided
    IF NEW.purchase_number IS NULL OR NEW.purchase_number = '' THEN
        NEW.purchase_number = 'PUR-' || TO_CHAR(NEW.order_date, 'YYYYMM') || '-' || LPAD(nextval('purchase_seq')::text, 4, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for loan calculations
CREATE OR REPLACE FUNCTION calculate_loan_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate outstanding amount
    NEW.outstanding_amount = NEW.amount - NEW.recovered_amount;
    
    -- Generate loan number if not provided
    IF NEW.loan_number IS NULL OR NEW.loan_number = '' THEN
        NEW.loan_number = 'LN-' || TO_CHAR(NEW.sanctioned_date, 'YYYYMM') || '-' || LPAD(nextval('loan_seq')::text, 4, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for payment number generation
CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate payment number if not provided
    IF NEW.payment_number IS NULL OR NEW.payment_number = '' THEN
        NEW.payment_number = 'PAY-' || TO_CHAR(NEW.payment_date, 'YYYYMM') || '-' || LPAD(nextval('payment_seq')::text, 4, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- SEQUENCES FOR AUTO-NUMBERING
-- ==============================================

CREATE SEQUENCE IF NOT EXISTS employee_code_seq START 1001;
CREATE SEQUENCE IF NOT EXISTS salary_payment_seq START 1;
CREATE SEQUENCE IF NOT EXISTS expense_seq START 1;
CREATE SEQUENCE IF NOT EXISTS purchase_seq START 1;
CREATE SEQUENCE IF NOT EXISTS loan_seq START 1;
CREATE SEQUENCE IF NOT EXISTS payment_seq START 1;

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Salary calculations trigger
DROP TRIGGER IF EXISTS salary_calculation_trigger ON salary_payments;
CREATE TRIGGER salary_calculation_trigger
    BEFORE INSERT OR UPDATE ON salary_payments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_salary_amounts();

-- Expense calculations trigger
DROP TRIGGER IF EXISTS expense_calculation_trigger ON expenses;
CREATE TRIGGER expense_calculation_trigger
    BEFORE INSERT OR UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION calculate_expense_amounts();

-- Purchase calculations trigger
DROP TRIGGER IF EXISTS purchase_calculation_trigger ON purchases;
CREATE TRIGGER purchase_calculation_trigger
    BEFORE INSERT OR UPDATE ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION calculate_purchase_amounts();

-- Loan calculations trigger
DROP TRIGGER IF EXISTS loan_calculation_trigger ON employee_loans;
CREATE TRIGGER loan_calculation_trigger
    BEFORE INSERT OR UPDATE ON employee_loans
    FOR EACH ROW
    EXECUTE FUNCTION calculate_loan_amounts();

-- Payment number generation trigger
DROP TRIGGER IF EXISTS payment_number_trigger ON payments;
CREATE TRIGGER payment_number_trigger
    BEFORE INSERT OR UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION generate_payment_number();

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Employee indexes
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(employee_status);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(reporting_manager_id);

-- Salary payment indexes
CREATE INDEX IF NOT EXISTS idx_salary_employee ON salary_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_period ON salary_payments(payment_period_start, payment_period_end);
CREATE INDEX IF NOT EXISTS idx_salary_status ON salary_payments(payment_status);

-- Expense indexes
CREATE INDEX IF NOT EXISTS idx_expenses_employee ON expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(expense_type, category);

-- Purchase indexes
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(order_date);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_vendor ON purchases(vendor_id);

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_employee ON payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);

-- Attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON employee_attendance(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON employee_attendance(attendance_date);

-- ==============================================
-- VIEWS FOR REPORTING
-- ==============================================

-- Employee Summary View
CREATE OR REPLACE VIEW employee_summary AS
SELECT 
    e.id,
    e.employee_code,
    e.first_name || ' ' || e.last_name AS employee_name,
    e.email,
    e.phone,
    e.department,
    e.designation,
    e.employment_type,
    e.employee_status,
    e.base_salary,
    e.hire_date,
    m.first_name || ' ' || m.last_name AS manager_name,
    COUNT(sp.id) AS total_salary_payments,
    COALESCE(SUM(sp.net_salary), 0) AS total_salary_paid
FROM employees e
LEFT JOIN employees m ON e.reporting_manager_id = m.id
LEFT JOIN salary_payments sp ON e.id = sp.employee_id AND sp.payment_status = 'PAID'
GROUP BY e.id, e.employee_code, e.first_name, e.last_name, e.email, e.phone, 
         e.department, e.designation, e.employment_type, e.employee_status, 
         e.base_salary, e.hire_date, m.first_name, m.last_name;

-- Monthly Salary Summary View
CREATE OR REPLACE VIEW monthly_salary_summary AS
SELECT 
    TO_CHAR(payment_period_start, 'YYYY-MM') AS salary_month,
    COUNT(*) AS total_employees_paid,
    SUM(gross_salary) AS total_gross_salary,
    SUM(total_deductions) AS total_deductions,
    SUM(net_salary) AS total_net_salary,
    AVG(net_salary) AS average_net_salary
FROM salary_payments 
WHERE payment_status = 'PAID'
GROUP BY TO_CHAR(payment_period_start, 'YYYY-MM')
ORDER BY salary_month DESC;

-- Expense Summary View
CREATE OR REPLACE VIEW expense_summary AS
SELECT 
    expense_type,
    category,
    COUNT(*) AS total_expenses,
    SUM(total_amount) AS total_amount,
    AVG(total_amount) AS average_amount,
    SUM(CASE WHEN status = 'APPROVED' THEN total_amount ELSE 0 END) AS approved_amount,
    SUM(CASE WHEN status = 'PAID' THEN total_amount ELSE 0 END) AS paid_amount
FROM expenses
GROUP BY expense_type, category
ORDER BY total_amount DESC;

-- Purchase Summary View
CREATE OR REPLACE VIEW purchase_summary AS
SELECT 
    purchase_type,
    category,
    COUNT(*) AS total_orders,
    SUM(total_amount) AS total_amount,
    AVG(total_amount) AS average_amount,
    SUM(outstanding_amount) AS pending_amount,
    SUM(CASE WHEN status = 'RECEIVED' THEN total_amount ELSE 0 END) AS received_amount
FROM purchases
GROUP BY purchase_type, category
ORDER BY total_amount DESC;

-- Payment Summary View
CREATE OR REPLACE VIEW payment_summary AS
SELECT 
    payment_type,
    payment_method,
    COUNT(*) AS total_payments,
    SUM(amount) AS total_amount,
    AVG(amount) AS average_amount,
    SUM(CASE WHEN payment_status = 'COMPLETED' THEN amount ELSE 0 END) AS completed_amount,
    SUM(CASE WHEN payment_status = 'PENDING' THEN amount ELSE 0 END) AS pending_amount
FROM payments
GROUP BY payment_type, payment_method
ORDER BY total_amount DESC;

-- ==============================================
-- SAMPLE DATA (OPTIONAL)
-- ==============================================

-- Insert sample departments
INSERT INTO employees (employee_code, first_name, last_name, email, department, designation, base_salary, employment_type) 
VALUES 
('EMP1001', 'Admin', 'User', 'admin@company.com', 'IT', 'System Administrator', 50000, 'FULL_TIME')
ON CONFLICT (employee_code) DO NOTHING;

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Enhanced Employee & Payments System Schema deployed successfully!';
    RAISE NOTICE '📊 Tables created: employees, salary_payments, expenses, purchases, employee_loans, payments, employee_attendance';
    RAISE NOTICE '🔄 Triggers created for automatic calculations';
    RAISE NOTICE '📈 Views created for reporting';
    RAISE NOTICE '🚀 System ready for use!';
END $$;