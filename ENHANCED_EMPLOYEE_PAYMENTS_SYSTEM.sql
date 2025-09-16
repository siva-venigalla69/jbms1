-- =====================================================
-- ENHANCED EMPLOYEE & PAYMENTS SYSTEM
-- Integrates with existing invoicing system and adds comprehensive payment tracking
-- =====================================================

-- =====================================================
-- 1. EMPLOYEES TABLE (Enhanced with payment integration)
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
    
    -- Payment Settings
    preferred_payment_method VARCHAR(20) DEFAULT 'BANK_TRANSFER', -- BANK_TRANSFER, CASH, CHEQUE
    payment_schedule VARCHAR(20) DEFAULT 'MONTHLY', -- MONTHLY, WEEKLY, DAILY
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- =====================================================
-- 2. ENHANCED PAYMENTS TABLE (Unified payment tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Payment Classification
    payment_type VARCHAR(30) NOT NULL, -- CUSTOMER_PAYMENT, SALARY_PAYMENT, EXPENSE_PAYMENT, VENDOR_PAYMENT, REFUND
    payment_category VARCHAR(30) NOT NULL, -- INCOME, EXPENSE, TRANSFER
    
    -- Related Entity References
    customer_id UUID REFERENCES customers(id),
    employee_id UUID REFERENCES employees(id),
    supplier_id UUID, -- For vendor payments
    invoice_id UUID, -- Links to existing invoices table
    expense_id UUID, -- Links to expenses table
    purchase_id UUID, -- Links to purchases table
    salary_payment_id UUID, -- Links to salary_payments table
    
    -- Payment Details
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    
    -- Payment Method Details
    payment_method VARCHAR(30) NOT NULL, -- CASH, BANK_TRANSFER, CHEQUE, UPI, CARD, NEFT, RTGS, IMPS
    payment_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, REFUNDED
    
    -- Transaction Details
    transaction_id VARCHAR(100), -- Bank/Gateway transaction ID
    reference_number VARCHAR(100),
    bank_details TEXT,
    cheque_number VARCHAR(50),
    cheque_date DATE,
    
    -- Approval Workflow
    approved_by UUID REFERENCES employees(id),
    approved_date TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES employees(id),
    processed_date TIMESTAMP WITH TIME ZONE,
    
    -- Additional Information
    description TEXT,
    notes TEXT,
    receipt_url TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- =====================================================
-- 3. SALARY PAYMENTS TABLE (Enhanced)
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
    advance_deduction DECIMAL(15,2) DEFAULT 0,
    other_deductions DECIMAL(15,2) DEFAULT 0,
    
    -- Calculated Fields
    gross_salary DECIMAL(15,2) GENERATED ALWAYS AS (
        base_amount + overtime_amount + bonus_amount + allowances + incentives
    ) STORED,
    total_deductions DECIMAL(15,2) GENERATED ALWAYS AS (
        tax_deduction + pf_deduction + esi_deduction + loan_deduction + advance_deduction + other_deductions
    ) STORED,
    net_salary DECIMAL(15,2) GENERATED ALWAYS AS (
        base_amount + overtime_amount + bonus_amount + allowances + incentives - 
        tax_deduction - pf_deduction - esi_deduction - loan_deduction - advance_deduction - other_deductions
    ) STORED,
    
    -- Payment Details
    payment_method VARCHAR(20) DEFAULT 'BANK_TRANSFER',
    payment_reference VARCHAR(100),
    payment_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, PAID, CANCELLED
    payment_id UUID REFERENCES payments(id), -- Links to unified payments table
    
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

-- =====================================================
-- 4. EXPENSES TABLE (Enhanced with payment integration)
-- =====================================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_number VARCHAR(50) UNIQUE NOT NULL,
    employee_id UUID REFERENCES employees(id),
    
    -- Expense Details
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expense_type VARCHAR(50) NOT NULL, -- TRAVEL, FUEL, OFFICE_SUPPLIES, UTILITIES, RENT, MARKETING, MEALS, ACCOMMODATION
    category VARCHAR(50) NOT NULL, -- OPERATIONAL, ADMINISTRATIVE, SALES, PRODUCTION, TRAVEL, ENTERTAINMENT
    subcategory VARCHAR(50), -- For detailed classification
    description TEXT NOT NULL,
    
    -- Amount Details
    amount DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) GENERATED ALWAYS AS (amount + tax_amount) STORED,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    
    -- Vendor/Supplier Information
    vendor_name VARCHAR(255),
    vendor_contact VARCHAR(100),
    vendor_gst VARCHAR(20),
    invoice_number VARCHAR(100),
    invoice_date DATE,
    
    -- Expense Policy Compliance
    policy_limit DECIMAL(15,2),
    exceeds_policy BOOLEAN GENERATED ALWAYS AS (total_amount > COALESCE(policy_limit, total_amount)) STORED,
    business_purpose TEXT,
    
    -- Approval Workflow
    status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, APPROVED, REJECTED, PAID, REIMBURSED
    submitted_by UUID REFERENCES employees(id),
    submitted_date TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES employees(id),
    approved_date TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Payment Details
    payment_method VARCHAR(20), -- CASH, BANK_TRANSFER, CHEQUE, CREDIT_CARD, REIMBURSEMENT
    payment_reference VARCHAR(100),
    payment_date DATE,
    payment_id UUID REFERENCES payments(id), -- Links to unified payments table
    reimbursement_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PROCESSED, COMPLETED
    
    -- Attachments and Notes
    receipt_url TEXT,
    additional_documents TEXT[], -- Array of document URLs
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- =====================================================
-- 5. PURCHASES TABLE (Enhanced)
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
    supplier_pan VARCHAR(15),
    
    -- Purchase Details
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    purchase_type VARCHAR(50) NOT NULL, -- RAW_MATERIALS, OFFICE_SUPPLIES, EQUIPMENT, SERVICES, MAINTENANCE
    priority VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, URGENT
    
    -- Amounts
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    shipping_charges DECIMAL(15,2) DEFAULT 0,
    handling_charges DECIMAL(15,2) DEFAULT 0,
    other_charges DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) GENERATED ALWAYS AS (
        subtotal + tax_amount + shipping_charges + handling_charges + other_charges - discount_amount
    ) STORED,
    
    -- Status and Workflow
    status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, SENT, CONFIRMED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED, CLOSED
    requested_by UUID REFERENCES employees(id),
    approved_by UUID REFERENCES employees(id),
    received_by UUID REFERENCES employees(id),
    
    -- Payment Information
    payment_terms VARCHAR(100),
    payment_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PARTIAL, PAID, OVERDUE
    paid_amount DECIMAL(15,2) DEFAULT 0,
    outstanding_amount DECIMAL(15,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    
    -- Quality and Compliance
    quality_check_status VARCHAR(20), -- PENDING, PASSED, FAILED, WAIVED
    quality_notes TEXT,
    compliance_documents TEXT[],
    
    -- Notes and References
    notes TEXT,
    internal_reference VARCHAR(100),
    terms_and_conditions TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- =====================================================
-- 6. PURCHASE ITEMS TABLE (Enhanced)
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    
    -- Item Details
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    item_code VARCHAR(100),
    category VARCHAR(100),
    brand VARCHAR(100),
    model_number VARCHAR(100),
    
    -- Quantity and Pricing
    quantity DECIMAL(10,3) NOT NULL,
    unit_of_measure VARCHAR(20) NOT NULL DEFAULT 'PCS',
    unit_price DECIMAL(15,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discounted_price DECIMAL(15,2) GENERATED ALWAYS AS (unit_price * (1 - discount_percentage/100)) STORED,
    line_total DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price * (1 - discount_percentage/100)) STORED,
    
    -- Quality and Specifications
    specifications TEXT,
    quality_grade VARCHAR(50),
    warranty_period VARCHAR(50),
    
    -- Delivery Tracking
    quantity_received DECIMAL(10,3) DEFAULT 0,
    quantity_pending DECIMAL(10,3) GENERATED ALWAYS AS (quantity - quantity_received) STORED,
    quantity_rejected DECIMAL(10,3) DEFAULT 0,
    
    -- Quality Control
    inspection_status VARCHAR(20), -- PENDING, PASSED, FAILED, WAIVED
    inspection_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. EMPLOYEE ADVANCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS employee_advances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advance_number VARCHAR(50) UNIQUE NOT NULL,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Advance Details
    advance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    advance_type VARCHAR(30) NOT NULL, -- SALARY_ADVANCE, TRAVEL_ADVANCE, MEDICAL_ADVANCE, EMERGENCY_ADVANCE
    amount DECIMAL(15,2) NOT NULL,
    purpose TEXT NOT NULL,
    
    -- Approval
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, DISBURSED, RECOVERED
    requested_by UUID REFERENCES employees(id),
    approved_by UUID REFERENCES employees(id),
    approved_date TIMESTAMP WITH TIME ZONE,
    
    -- Recovery Details
    recovery_method VARCHAR(30) DEFAULT 'SALARY_DEDUCTION', -- SALARY_DEDUCTION, LUMP_SUM, INSTALLMENTS
    installments INTEGER DEFAULT 1,
    installment_amount DECIMAL(15,2),
    recovered_amount DECIMAL(15,2) DEFAULT 0,
    outstanding_amount DECIMAL(15,2) GENERATED ALWAYS AS (amount - recovered_amount) STORED,
    
    -- Payment Details
    payment_date DATE,
    payment_method VARCHAR(20),
    payment_reference VARCHAR(100),
    payment_id UUID REFERENCES payments(id),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- =====================================================
-- 8. PAYMENT METHODS CONFIGURATION
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    method_code VARCHAR(20) UNIQUE NOT NULL,
    method_name VARCHAR(100) NOT NULL,
    method_type VARCHAR(30) NOT NULL, -- ELECTRONIC, MANUAL, CARD
    is_active BOOLEAN DEFAULT true,
    
    -- Configuration
    requires_approval BOOLEAN DEFAULT false,
    approval_limit DECIMAL(15,2),
    processing_time_hours INTEGER DEFAULT 24,
    transaction_fee_percentage DECIMAL(5,4) DEFAULT 0,
    transaction_fee_fixed DECIMAL(10,2) DEFAULT 0,
    
    -- Integration Details
    gateway_name VARCHAR(100),
    api_endpoint TEXT,
    configuration JSON,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 9. INDEXES FOR PERFORMANCE
-- =====================================================

-- Employees indexes
CREATE INDEX IF NOT EXISTS idx_employees_employee_code ON employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(employee_status);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_hire_date ON employees(hire_date);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_employee ON payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_expense ON payments(expense_id);
CREATE INDEX IF NOT EXISTS idx_payments_purchase ON payments(purchase_id);

-- Salary payments indexes
CREATE INDEX IF NOT EXISTS idx_salary_payments_employee ON salary_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_period ON salary_payments(payment_period_start, payment_period_end);
CREATE INDEX IF NOT EXISTS idx_salary_payments_date ON salary_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_salary_payments_status ON salary_payments(payment_status);

-- Expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_employee ON expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(expense_type);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- Purchases indexes
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_name);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_type ON purchases(purchase_type);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_status ON purchases(payment_status);

-- Purchase items indexes
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_name ON purchase_items(item_name);
CREATE INDEX IF NOT EXISTS idx_purchase_items_category ON purchase_items(category);

-- Employee advances indexes
CREATE INDEX IF NOT EXISTS idx_employee_advances_employee ON employee_advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_advances_date ON employee_advances(advance_date);
CREATE INDEX IF NOT EXISTS idx_employee_advances_status ON employee_advances(status);

-- =====================================================
-- 10. BUSINESS LOGIC FUNCTIONS
-- =====================================================

-- Function to generate payment number
CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_number IS NULL OR NEW.payment_number = '' THEN
        NEW.payment_number := 'PAY' || TO_CHAR(CURRENT_DATE, 'YYYY') || LPAD(nextval('payment_number_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for payment numbers
CREATE SEQUENCE IF NOT EXISTS payment_number_seq START 100001;

-- Trigger for payment number generation
DROP TRIGGER IF EXISTS tr_generate_payment_number ON payments;
CREATE TRIGGER tr_generate_payment_number
    BEFORE INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION generate_payment_number();

-- Function to generate advance number
CREATE OR REPLACE FUNCTION generate_advance_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.advance_number IS NULL OR NEW.advance_number = '' THEN
        NEW.advance_number := 'ADV' || TO_CHAR(CURRENT_DATE, 'YYYY') || LPAD(nextval('advance_number_seq')::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for advance numbers
CREATE SEQUENCE IF NOT EXISTS advance_number_seq START 1001;

-- Trigger for advance number generation
DROP TRIGGER IF EXISTS tr_generate_advance_number ON employee_advances;
CREATE TRIGGER tr_generate_advance_number
    BEFORE INSERT ON employee_advances
    FOR EACH ROW
    EXECUTE FUNCTION generate_advance_number();

-- Function to create payment entry when salary is paid
CREATE OR REPLACE FUNCTION create_salary_payment_entry()
RETURNS TRIGGER AS $$
DECLARE
    payment_id UUID;
BEGIN
    -- Create payment entry when salary payment status changes to 'PAID'
    IF NEW.payment_status = 'PAID' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'PAID') THEN
        INSERT INTO payments (
            payment_type,
            payment_category,
            employee_id,
            salary_payment_id,
            payment_date,
            amount,
            payment_method,
            payment_status,
            reference_number,
            description
        ) VALUES (
            'SALARY_PAYMENT',
            'EXPENSE',
            NEW.employee_id,
            NEW.id,
            NEW.payment_date,
            NEW.net_salary,
            NEW.payment_method,
            'COMPLETED',
            NEW.payment_reference,
            'Salary payment for period ' || NEW.payment_period_start || ' to ' || NEW.payment_period_end
        ) RETURNING id INTO payment_id;
        
        -- Update salary payment with payment ID
        NEW.payment_id = payment_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for salary payment integration
DROP TRIGGER IF EXISTS tr_create_salary_payment_entry ON salary_payments;
CREATE TRIGGER tr_create_salary_payment_entry
    BEFORE UPDATE ON salary_payments
    FOR EACH ROW
    EXECUTE FUNCTION create_salary_payment_entry();

-- =====================================================
-- 11. ENHANCED VIEWS
-- =====================================================

-- Payment Summary View
CREATE OR REPLACE VIEW payment_summary AS
SELECT 
    p.payment_type,
    p.payment_category,
    p.payment_method,
    p.payment_status,
    COUNT(*) as total_payments,
    SUM(p.amount) as total_amount,
    AVG(p.amount) as average_amount,
    MIN(p.payment_date) as earliest_payment,
    MAX(p.payment_date) as latest_payment
FROM payments p
GROUP BY p.payment_type, p.payment_category, p.payment_method, p.payment_status
ORDER BY total_amount DESC;

-- Employee Financial Summary View
CREATE OR REPLACE VIEW employee_financial_summary AS
SELECT 
    e.id,
    e.employee_code,
    e.first_name || ' ' || e.last_name as full_name,
    e.department,
    e.designation,
    e.base_salary,
    
    -- Salary payments
    COALESCE(sp.total_salary_paid, 0) as total_salary_paid,
    COALESCE(sp.last_salary_amount, 0) as last_salary_amount,
    COALESCE(sp.last_salary_date, NULL) as last_salary_date,
    
    -- Expenses
    COALESCE(exp.total_expenses, 0) as total_expenses_claimed,
    COALESCE(exp.approved_expenses, 0) as approved_expenses,
    COALESCE(exp.pending_expenses, 0) as pending_expenses,
    
    -- Advances
    COALESCE(adv.total_advances, 0) as total_advances_taken,
    COALESCE(adv.outstanding_advances, 0) as outstanding_advances
    
FROM employees e
LEFT JOIN (
    SELECT 
        employee_id,
        SUM(net_salary) as total_salary_paid,
        MAX(net_salary) as last_salary_amount,
        MAX(payment_date) as last_salary_date
    FROM salary_payments 
    WHERE payment_status = 'PAID'
    GROUP BY employee_id
) sp ON e.id = sp.employee_id
LEFT JOIN (
    SELECT 
        employee_id,
        SUM(total_amount) as total_expenses,
        SUM(CASE WHEN status = 'APPROVED' THEN total_amount ELSE 0 END) as approved_expenses,
        SUM(CASE WHEN status IN ('SUBMITTED', 'PENDING') THEN total_amount ELSE 0 END) as pending_expenses
    FROM expenses
    GROUP BY employee_id
) exp ON e.id = exp.employee_id
LEFT JOIN (
    SELECT 
        employee_id,
        SUM(amount) as total_advances,
        SUM(outstanding_amount) as outstanding_advances
    FROM employee_advances
    WHERE status IN ('DISBURSED', 'APPROVED')
    GROUP BY employee_id
) adv ON e.id = adv.employee_id;

-- =====================================================
-- 12. INSERT DEFAULT PAYMENT METHODS
-- =====================================================
INSERT INTO payment_methods (method_code, method_name, method_type, requires_approval, approval_limit) VALUES
('CASH', 'Cash Payment', 'MANUAL', true, 10000.00),
('BANK_TRANSFER', 'Bank Transfer', 'ELECTRONIC', true, 1000000.00),
('CHEQUE', 'Cheque Payment', 'MANUAL', true, 500000.00),
('UPI', 'UPI Payment', 'ELECTRONIC', false, 100000.00),
('NEFT', 'NEFT Transfer', 'ELECTRONIC', true, 2000000.00),
('RTGS', 'RTGS Transfer', 'ELECTRONIC', true, 10000000.00),
('CARD', 'Card Payment', 'CARD', false, 50000.00)
ON CONFLICT (method_code) DO NOTHING;

-- =====================================================
-- 13. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE payments IS 'Unified payment tracking for all types of payments (customer, salary, expense, vendor)';
COMMENT ON TABLE salary_payments IS 'Detailed salary payments with components and deductions';
COMMENT ON TABLE expenses IS 'Employee expense claims with approval workflow';
COMMENT ON TABLE purchases IS 'Purchase orders and vendor payments';
COMMENT ON TABLE employee_advances IS 'Employee advances and recovery tracking';
COMMENT ON TABLE payment_methods IS 'Configuration for available payment methods';

COMMENT ON COLUMN payments.payment_type IS 'CUSTOMER_PAYMENT, SALARY_PAYMENT, EXPENSE_PAYMENT, VENDOR_PAYMENT, REFUND';
COMMENT ON COLUMN payments.payment_category IS 'INCOME, EXPENSE, TRANSFER';
COMMENT ON COLUMN payments.payment_status IS 'PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, REFUNDED';

-- =====================================================
-- END OF ENHANCED SCHEMA
-- =====================================================