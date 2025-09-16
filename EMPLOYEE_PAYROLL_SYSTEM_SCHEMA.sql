-- =====================================================
-- EMPLOYEE MANAGEMENT & PAYROLL SYSTEM
-- Complete schema for employees, salaries, expenses, and purchases
-- =====================================================

-- =====================================================
-- 1. EMPLOYEES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    date_of_birth DATE,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    termination_date DATE,
    
    -- Employment Details
    department VARCHAR(100),
    designation VARCHAR(100) NOT NULL,
    employment_type VARCHAR(20) NOT NULL DEFAULT 'FULL_TIME', -- FULL_TIME, PART_TIME, CONTRACT, INTERN
    employee_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, TERMINATED
    reporting_manager_id UUID REFERENCES employees(id),
    
    -- Salary Information
    base_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
    salary_type VARCHAR(20) NOT NULL DEFAULT 'MONTHLY', -- MONTHLY, DAILY, HOURLY
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    
    -- Banking Details
    bank_account_number VARCHAR(50),
    bank_name VARCHAR(100),
    bank_ifsc VARCHAR(15),
    pan_number VARCHAR(15),
    aadhar_number VARCHAR(20),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Indexes for employees
CREATE INDEX IF NOT EXISTS idx_employees_employee_code ON employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(employee_status);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_hire_date ON employees(hire_date);

-- =====================================================
-- 2. SALARY PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS salary_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
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
    
    -- Calculated Fields
    gross_salary DECIMAL(15,2) GENERATED ALWAYS AS (
        base_amount + overtime_amount + bonus_amount + allowances + incentives
    ) STORED,
    total_deductions DECIMAL(15,2) GENERATED ALWAYS AS (
        tax_deduction + pf_deduction + esi_deduction + loan_deduction + other_deductions
    ) STORED,
    net_salary DECIMAL(15,2) GENERATED ALWAYS AS (
        base_amount + overtime_amount + bonus_amount + allowances + incentives - 
        tax_deduction - pf_deduction - esi_deduction - loan_deduction - other_deductions
    ) STORED,
    
    -- Payment Details
    payment_method VARCHAR(20) DEFAULT 'BANK_TRANSFER', -- BANK_TRANSFER, CASH, CHEQUE
    payment_reference VARCHAR(100),
    payment_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PAID, CANCELLED
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    
    -- Constraints
    CONSTRAINT chk_salary_dates CHECK (payment_period_start <= payment_period_end),
    CONSTRAINT chk_salary_amounts CHECK (base_amount >= 0 AND gross_salary >= 0 AND net_salary >= 0),
    UNIQUE(employee_id, payment_period_start, payment_period_end)
);

-- Indexes for salary_payments
CREATE INDEX IF NOT EXISTS idx_salary_payments_employee ON salary_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_period ON salary_payments(payment_period_start, payment_period_end);
CREATE INDEX IF NOT EXISTS idx_salary_payments_date ON salary_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_salary_payments_status ON salary_payments(payment_status);

-- =====================================================
-- 3. EXPENSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_number VARCHAR(50) UNIQUE NOT NULL,
    employee_id UUID REFERENCES employees(id),
    
    -- Expense Details
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expense_type VARCHAR(50) NOT NULL, -- TRAVEL, FUEL, OFFICE_SUPPLIES, UTILITIES, RENT, MARKETING, etc.
    category VARCHAR(50) NOT NULL, -- OPERATIONAL, ADMINISTRATIVE, SALES, PRODUCTION
    description TEXT NOT NULL,
    
    -- Amount Details
    amount DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) GENERATED ALWAYS AS (amount + tax_amount) STORED,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    
    -- Vendor/Supplier Information
    vendor_name VARCHAR(255),
    vendor_contact VARCHAR(100),
    invoice_number VARCHAR(100),
    invoice_date DATE,
    
    -- Approval Workflow
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, PAID
    submitted_by UUID REFERENCES employees(id),
    approved_by UUID REFERENCES employees(id),
    approved_date TIMESTAMP WITH TIME ZONE,
    
    -- Payment Details
    payment_method VARCHAR(20), -- CASH, BANK_TRANSFER, CHEQUE, CREDIT_CARD
    payment_reference VARCHAR(100),
    payment_date DATE,
    
    -- Attachments and Notes
    receipt_url TEXT,
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Indexes for expenses
CREATE INDEX IF NOT EXISTS idx_expenses_employee ON expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(expense_type);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- =====================================================
-- 4. PURCHASES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Supplier Information
    supplier_name VARCHAR(255) NOT NULL,
    supplier_contact VARCHAR(100),
    supplier_email VARCHAR(255),
    supplier_address TEXT,
    supplier_gst VARCHAR(20),
    
    -- Purchase Details
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    purchase_type VARCHAR(50) NOT NULL, -- RAW_MATERIALS, OFFICE_SUPPLIES, EQUIPMENT, SERVICES
    
    -- Amounts
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    shipping_charges DECIMAL(15,2) DEFAULT 0,
    other_charges DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) GENERATED ALWAYS AS (
        subtotal + tax_amount + shipping_charges + other_charges - discount_amount
    ) STORED,
    
    -- Status and Workflow
    status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, SENT, CONFIRMED, RECEIVED, CANCELLED
    requested_by UUID REFERENCES employees(id),
    approved_by UUID REFERENCES employees(id),
    received_by UUID REFERENCES employees(id),
    
    -- Payment Information
    payment_terms VARCHAR(100),
    payment_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PARTIAL, PAID
    paid_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Notes and References
    notes TEXT,
    internal_reference VARCHAR(100),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Indexes for purchases
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_name);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_type ON purchases(purchase_type);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_status ON purchases(payment_status);

-- =====================================================
-- 5. PURCHASE ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    
    -- Item Details
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    item_code VARCHAR(100),
    category VARCHAR(100),
    
    -- Quantity and Pricing
    quantity DECIMAL(10,3) NOT NULL,
    unit_of_measure VARCHAR(20) NOT NULL DEFAULT 'PCS', -- PCS, KG, METERS, LITERS, etc.
    unit_price DECIMAL(15,2) NOT NULL,
    line_total DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    
    -- Quality and Specifications
    specifications TEXT,
    quality_grade VARCHAR(50),
    
    -- Delivery Tracking
    quantity_received DECIMAL(10,3) DEFAULT 0,
    quantity_pending DECIMAL(10,3) GENERATED ALWAYS AS (quantity - quantity_received) STORED,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for purchase_items
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_name ON purchase_items(item_name);
CREATE INDEX IF NOT EXISTS idx_purchase_items_category ON purchase_items(category);

-- =====================================================
-- 6. EMPLOYEE ATTENDANCE TABLE (Optional Enhancement)
-- =====================================================
CREATE TABLE IF NOT EXISTS employee_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    
    -- Time Tracking
    check_in_time TIME,
    check_out_time TIME,
    break_duration_minutes INTEGER DEFAULT 0,
    total_hours DECIMAL(4,2),
    
    -- Status
    status VARCHAR(20) DEFAULT 'PRESENT', -- PRESENT, ABSENT, HALF_DAY, LEAVE, HOLIDAY
    attendance_type VARCHAR(20) DEFAULT 'REGULAR', -- REGULAR, OVERTIME, NIGHT_SHIFT
    
    -- Leave Information (if applicable)
    leave_type VARCHAR(50), -- SICK, CASUAL, EARNED, MATERNITY, etc.
    leave_reason TEXT,
    
    -- Approval
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(employee_id, attendance_date)
);

-- Indexes for employee_attendance
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON employee_attendance(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON employee_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON employee_attendance(status);

-- =====================================================
-- 7. BUSINESS LOGIC FUNCTIONS
-- =====================================================

-- Function to generate employee code
CREATE OR REPLACE FUNCTION generate_employee_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.employee_code IS NULL OR NEW.employee_code = '' THEN
        NEW.employee_code := 'EMP' || LPAD(nextval('employee_code_seq')::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for employee codes
CREATE SEQUENCE IF NOT EXISTS employee_code_seq START 1001;

-- Trigger for employee code generation
DROP TRIGGER IF EXISTS tr_generate_employee_code ON employees;
CREATE TRIGGER tr_generate_employee_code
    BEFORE INSERT ON employees
    FOR EACH ROW
    EXECUTE FUNCTION generate_employee_code();

-- Function to generate expense number
CREATE OR REPLACE FUNCTION generate_expense_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expense_number IS NULL OR NEW.expense_number = '' THEN
        NEW.expense_number := 'EXP' || TO_CHAR(CURRENT_DATE, 'YYYY') || LPAD(nextval('expense_number_seq')::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for expense numbers
CREATE SEQUENCE IF NOT EXISTS expense_number_seq START 1001;

-- Trigger for expense number generation
DROP TRIGGER IF EXISTS tr_generate_expense_number ON expenses;
CREATE TRIGGER tr_generate_expense_number
    BEFORE INSERT ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION generate_expense_number();

-- Function to generate purchase order number
CREATE OR REPLACE FUNCTION generate_purchase_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.purchase_order_number IS NULL OR NEW.purchase_order_number = '' THEN
        NEW.purchase_order_number := 'PO' || TO_CHAR(CURRENT_DATE, 'YYYY') || LPAD(nextval('purchase_order_seq')::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for purchase order numbers
CREATE SEQUENCE IF NOT EXISTS purchase_order_seq START 1001;

-- Trigger for purchase order number generation
DROP TRIGGER IF EXISTS tr_generate_purchase_order_number ON purchases;
CREATE TRIGGER tr_generate_purchase_order_number
    BEFORE INSERT ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION generate_purchase_order_number();

-- Function to update purchase subtotal when items change
CREATE OR REPLACE FUNCTION update_purchase_subtotal()
RETURNS TRIGGER AS $$
BEGIN
    -- Update purchase subtotal based on items
    UPDATE purchases 
    SET subtotal = (
        SELECT COALESCE(SUM(line_total), 0)
        FROM purchase_items 
        WHERE purchase_id = COALESCE(NEW.purchase_id, OLD.purchase_id)
    )
    WHERE id = COALESCE(NEW.purchase_id, OLD.purchase_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update purchase subtotal
DROP TRIGGER IF EXISTS tr_update_purchase_subtotal ON purchase_items;
CREATE TRIGGER tr_update_purchase_subtotal
    AFTER INSERT OR UPDATE OR DELETE ON purchase_items
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_subtotal();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updating timestamps
DROP TRIGGER IF EXISTS tr_employees_updated_at ON employees;
CREATE TRIGGER tr_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS tr_salary_payments_updated_at ON salary_payments;
CREATE TRIGGER tr_salary_payments_updated_at
    BEFORE UPDATE ON salary_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS tr_expenses_updated_at ON expenses;
CREATE TRIGGER tr_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS tr_purchases_updated_at ON purchases;
CREATE TRIGGER tr_purchases_updated_at
    BEFORE UPDATE ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- =====================================================
-- 8. USEFUL VIEWS
-- =====================================================

-- Employee Summary View
CREATE OR REPLACE VIEW employee_summary AS
SELECT 
    e.id,
    e.employee_code,
    e.first_name || ' ' || e.last_name as full_name,
    e.email,
    e.phone,
    e.department,
    e.designation,
    e.employment_type,
    e.employee_status,
    e.hire_date,
    e.base_salary,
    e.salary_type,
    rm.first_name || ' ' || rm.last_name as reporting_manager_name,
    
    -- Recent salary payment
    (SELECT sp.net_salary 
     FROM salary_payments sp 
     WHERE sp.employee_id = e.id 
     ORDER BY sp.payment_date DESC 
     LIMIT 1) as last_salary_paid,
     
    -- Attendance this month
    (SELECT COUNT(*) 
     FROM employee_attendance ea 
     WHERE ea.employee_id = e.id 
     AND ea.attendance_date >= DATE_TRUNC('month', CURRENT_DATE)
     AND ea.status = 'PRESENT') as days_present_this_month,
     
    e.created_at,
    e.updated_at
FROM employees e
LEFT JOIN employees rm ON e.reporting_manager_id = rm.id;

-- Monthly Salary Summary View
CREATE OR REPLACE VIEW monthly_salary_summary AS
SELECT 
    DATE_TRUNC('month', sp.payment_period_start) as salary_month,
    COUNT(*) as total_employees_paid,
    SUM(sp.gross_salary) as total_gross_salary,
    SUM(sp.total_deductions) as total_deductions,
    SUM(sp.net_salary) as total_net_salary,
    AVG(sp.net_salary) as average_net_salary
FROM salary_payments sp
WHERE sp.payment_status = 'PAID'
GROUP BY DATE_TRUNC('month', sp.payment_period_start)
ORDER BY salary_month DESC;

-- Expense Summary View
CREATE OR REPLACE VIEW expense_summary AS
SELECT 
    e.expense_type,
    e.category,
    COUNT(*) as total_expenses,
    SUM(e.total_amount) as total_amount,
    AVG(e.total_amount) as average_amount,
    SUM(CASE WHEN e.status = 'APPROVED' THEN e.total_amount ELSE 0 END) as approved_amount,
    SUM(CASE WHEN e.status = 'PAID' THEN e.total_amount ELSE 0 END) as paid_amount
FROM expenses e
GROUP BY e.expense_type, e.category
ORDER BY total_amount DESC;

-- Purchase Summary View
CREATE OR REPLACE VIEW purchase_summary AS
SELECT 
    p.purchase_type,
    COUNT(*) as total_purchases,
    SUM(p.total_amount) as total_amount,
    AVG(p.total_amount) as average_amount,
    SUM(CASE WHEN p.status = 'CONFIRMED' THEN p.total_amount ELSE 0 END) as confirmed_amount,
    SUM(p.paid_amount) as total_paid_amount,
    SUM(p.total_amount - p.paid_amount) as outstanding_amount
FROM purchases p
GROUP BY p.purchase_type
ORDER BY total_amount DESC;

-- =====================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE employees IS 'Employee master data with employment and salary information';
COMMENT ON TABLE salary_payments IS 'Monthly salary payments with detailed breakdown of components and deductions';
COMMENT ON TABLE expenses IS 'Company expenses tracking with approval workflow';
COMMENT ON TABLE purchases IS 'Purchase orders and vendor management';
COMMENT ON TABLE purchase_items IS 'Line items for purchase orders';
COMMENT ON TABLE employee_attendance IS 'Daily attendance tracking for employees';

COMMENT ON COLUMN employees.employee_code IS 'Unique employee identifier (auto-generated)';
COMMENT ON COLUMN employees.employment_type IS 'FULL_TIME, PART_TIME, CONTRACT, INTERN';
COMMENT ON COLUMN employees.employee_status IS 'ACTIVE, INACTIVE, TERMINATED';
COMMENT ON COLUMN employees.salary_type IS 'MONTHLY, DAILY, HOURLY';

COMMENT ON COLUMN salary_payments.gross_salary IS 'Calculated field: base + overtime + bonus + allowances + incentives';
COMMENT ON COLUMN salary_payments.total_deductions IS 'Calculated field: sum of all deductions';
COMMENT ON COLUMN salary_payments.net_salary IS 'Calculated field: gross_salary - total_deductions';

COMMENT ON COLUMN expenses.status IS 'PENDING, APPROVED, REJECTED, PAID';
COMMENT ON COLUMN purchases.status IS 'DRAFT, SENT, CONFIRMED, RECEIVED, CANCELLED';
COMMENT ON COLUMN purchases.payment_status IS 'PENDING, PARTIAL, PAID';

-- =====================================================
-- END OF SCHEMA
-- =====================================================