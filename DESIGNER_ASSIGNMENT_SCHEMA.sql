-- ============================================================================
-- DESIGNER ASSIGNMENT SYSTEM - DATABASE SCHEMA
-- Extends existing schema with designer workflow management
-- ============================================================================

-- 1. DESIGN LIBRARY TABLE
-- Store reusable designs and templates
CREATE TABLE IF NOT EXISTS design_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_name VARCHAR(255) NOT NULL,
    design_category VARCHAR(100), -- saree, dupatta, voni, etc.
    design_code VARCHAR(50) UNIQUE, -- searchable design code
    design_file_url TEXT,
    design_thumbnail_url TEXT,
    design_description TEXT,
    material_compatibility TEXT[], -- array of compatible materials
    complexity_level VARCHAR(20) DEFAULT 'medium', -- simple, medium, complex
    estimated_hours DECIMAL(4,2) DEFAULT 2.0, -- time estimate for this design
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. DESIGNER ASSIGNMENTS TABLE
-- Track which designer is assigned to which order item
CREATE TABLE IF NOT EXISTS designer_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
    designer_id UUID REFERENCES auth.users(id),
    assigned_by UUID REFERENCES auth.users(id),
    priority_level VARCHAR(20) DEFAULT 'normal', -- urgent, high, normal, low
    expected_delivery_date DATE,
    estimated_hours DECIMAL(4,2) DEFAULT 2.0,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_completion_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'assigned', -- assigned, in_progress, completed, on_hold
    design_library_id UUID REFERENCES design_library(id), -- if using existing design
    assignment_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one assignment per order item
    UNIQUE(order_item_id)
);

-- 3. DESIGNER WORKLOAD VIEW
-- Real-time view of designer workloads
CREATE OR REPLACE VIEW designer_workload AS
SELECT 
    u.id as designer_id,
    u.email as designer_email,
    u.raw_user_meta_data->>'full_name' as designer_name,
    
    -- Current assignments
    COUNT(da.id) as total_assignments,
    COUNT(CASE WHEN da.status = 'assigned' THEN 1 END) as pending_assignments,
    COUNT(CASE WHEN da.status = 'in_progress' THEN 1 END) as active_assignments,
    COUNT(CASE WHEN da.expected_delivery_date < CURRENT_DATE AND da.status NOT IN ('completed') THEN 1 END) as overdue_assignments,
    
    -- Time estimates
    SUM(CASE WHEN da.status NOT IN ('completed') THEN da.estimated_hours ELSE 0 END) as pending_hours,
    
    -- Priority breakdown
    COUNT(CASE WHEN da.priority_level = 'urgent' AND da.status NOT IN ('completed') THEN 1 END) as urgent_tasks,
    COUNT(CASE WHEN da.priority_level = 'high' AND da.status NOT IN ('completed') THEN 1 END) as high_priority_tasks,
    
    -- Performance metrics
    AVG(CASE 
        WHEN da.actual_completion_time IS NOT NULL AND da.actual_start_time IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (da.actual_completion_time - da.actual_start_time))/3600 
    END) as avg_completion_hours,
    
    COUNT(CASE 
        WHEN da.actual_completion_time IS NOT NULL 
        AND da.actual_completion_time::date <= da.expected_delivery_date 
        THEN 1 
    END) as on_time_deliveries,
    
    COUNT(CASE WHEN da.actual_completion_time IS NOT NULL THEN 1 END) as total_completed

FROM auth.users u
LEFT JOIN designer_assignments da ON u.id = da.designer_id
WHERE u.raw_user_meta_data->>'role' = 'designer' OR u.raw_user_meta_data->>'role' = 'admin'
GROUP BY u.id, u.email, u.raw_user_meta_data->>'full_name';

-- 4. TODAY'S PRIORITIES VIEW
-- Dashboard view for today's urgent tasks
CREATE OR REPLACE VIEW todays_priorities AS
SELECT 
    da.id as assignment_id,
    da.order_item_id,
    da.priority_level,
    da.expected_delivery_date,
    da.status,
    da.estimated_hours,
    
    -- Order information
    oi.material_type,
    oi.quantity,
    oi.customization_details,
    o.order_number,
    o.order_date,
    
    -- Customer information
    c.name as customer_name,
    c.phone as customer_phone,
    
    -- Designer information
    designer.email as designer_email,
    designer.raw_user_meta_data->>'full_name' as designer_name,
    
    -- Design library info (if applicable)
    dl.design_name,
    dl.design_code,
    dl.complexity_level,
    
    -- Status indicators
    CASE 
        WHEN da.expected_delivery_date < CURRENT_DATE AND da.status NOT IN ('completed') THEN 'overdue'
        WHEN da.expected_delivery_date = CURRENT_DATE AND da.status NOT IN ('completed') THEN 'due_today' 
        WHEN da.expected_delivery_date = CURRENT_DATE + INTERVAL '1 day' AND da.status NOT IN ('completed') THEN 'due_tomorrow'
        ELSE 'upcoming'
    END as urgency_status,
    
    -- Days until due (negative if overdue)
    da.expected_delivery_date - CURRENT_DATE as days_until_due

FROM designer_assignments da
JOIN order_items oi ON da.order_item_id = oi.id
JOIN orders o ON oi.order_id = o.id  
JOIN customers c ON o.customer_id = c.id
JOIN auth.users designer ON da.designer_id = designer.id
LEFT JOIN design_library dl ON da.design_library_id = dl.id

WHERE da.status NOT IN ('completed')
ORDER BY 
    CASE da.priority_level 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'normal' THEN 3 
        WHEN 'low' THEN 4 
    END,
    da.expected_delivery_date ASC;

-- 5. OVERDUE ITEMS VIEW
-- Items that are past their expected delivery date
CREATE OR REPLACE VIEW overdue_assignments AS
SELECT 
    da.*,
    oi.material_type,
    oi.quantity,
    o.order_number,
    c.name as customer_name,
    designer.raw_user_meta_data->>'full_name' as designer_name,
    CURRENT_DATE - da.expected_delivery_date as days_overdue
    
FROM designer_assignments da
JOIN order_items oi ON da.order_item_id = oi.id
JOIN orders o ON oi.order_id = o.id  
JOIN customers c ON o.customer_id = c.id
JOIN auth.users designer ON da.designer_id = designer.id

WHERE da.expected_delivery_date < CURRENT_DATE 
AND da.status NOT IN ('completed')
ORDER BY days_overdue DESC, da.priority_level;

-- 6. DESIGN ASSIGNMENT HISTORY TABLE
-- Track assignment changes and reassignments
CREATE TABLE IF NOT EXISTS assignment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES designer_assignments(id) ON DELETE CASCADE,
    previous_designer_id UUID REFERENCES auth.users(id),
    new_designer_id UUID REFERENCES auth.users(id),
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    reason_for_change TEXT,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_designer_assignments_designer_id ON designer_assignments(designer_id);
CREATE INDEX IF NOT EXISTS idx_designer_assignments_order_item_id ON designer_assignments(order_item_id);
CREATE INDEX IF NOT EXISTS idx_designer_assignments_status ON designer_assignments(status);
CREATE INDEX IF NOT EXISTS idx_designer_assignments_priority ON designer_assignments(priority_level);
CREATE INDEX IF NOT EXISTS idx_designer_assignments_delivery_date ON designer_assignments(expected_delivery_date);
CREATE INDEX IF NOT EXISTS idx_design_library_category ON design_library(design_category);
CREATE INDEX IF NOT EXISTS idx_design_library_code ON design_library(design_code);
CREATE INDEX IF NOT EXISTS idx_design_library_active ON design_library(is_active);

-- 8. ROW LEVEL SECURITY POLICIES
-- Enable RLS on new tables
ALTER TABLE design_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE designer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_history ENABLE ROW LEVEL SECURITY;

-- Policies for design_library
CREATE POLICY "Anyone can view active designs" ON design_library
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins and designers can manage designs" ON design_library
    FOR ALL USING (
        auth.jwt() ->> 'role' IN ('admin', 'designer') OR
        auth.uid() = created_by
    );

-- Policies for designer_assignments  
CREATE POLICY "Users can view their assignments" ON designer_assignments
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.uid() = designer_id OR
        auth.uid() = assigned_by
    );

CREATE POLICY "Admins can manage all assignments" ON designer_assignments
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Designers can update their own assignments" ON designer_assignments
    FOR UPDATE USING (
        auth.uid() = designer_id AND
        status IN ('assigned', 'in_progress')
    );

-- Policies for assignment_history
CREATE POLICY "Users can view assignment history" ON assignment_history
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.uid() = previous_designer_id OR
        auth.uid() = new_designer_id OR
        auth.uid() = changed_by
    );

CREATE POLICY "Admins can manage assignment history" ON assignment_history
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- 9. FUNCTIONS FOR BUSINESS LOGIC

-- Function to auto-assign designer based on workload
CREATE OR REPLACE FUNCTION auto_assign_designer(
    p_order_item_id UUID,
    p_priority_level VARCHAR DEFAULT 'normal',
    p_estimated_hours DECIMAL DEFAULT 2.0,
    p_assigned_by UUID DEFAULT auth.uid()
) RETURNS UUID AS $$
DECLARE
    best_designer_id UUID;
    assignment_id UUID;
BEGIN
    -- Find designer with least current workload
    SELECT designer_id INTO best_designer_id
    FROM designer_workload 
    WHERE pending_hours < 40 -- Don't overload designers
    ORDER BY pending_hours ASC, total_assignments ASC
    LIMIT 1;
    
    -- If no available designer, assign to admin
    IF best_designer_id IS NULL THEN
        SELECT id INTO best_designer_id 
        FROM auth.users 
        WHERE raw_user_meta_data->>'role' = 'admin' 
        LIMIT 1;
    END IF;
    
    -- Create assignment
    INSERT INTO designer_assignments (
        order_item_id,
        designer_id,
        assigned_by,
        priority_level,
        estimated_hours,
        expected_delivery_date
    ) VALUES (
        p_order_item_id,
        best_designer_id,
        p_assigned_by,
        p_priority_level,
        p_estimated_hours,
        CURRENT_DATE + INTERVAL '3 days' -- Default 3 day delivery
    ) RETURNING id INTO assignment_id;
    
    RETURN assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check design availability
CREATE OR REPLACE FUNCTION check_design_availability(
    p_design_code VARCHAR,
    p_material_type VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    design_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM design_library 
        WHERE design_code = p_design_code 
        AND is_active = true
        AND (material_compatibility IS NULL OR p_material_type = ANY(material_compatibility))
    ) INTO design_exists;
    
    RETURN design_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update assignment status with history tracking
CREATE OR REPLACE FUNCTION update_assignment_status(
    p_assignment_id UUID,
    p_new_status VARCHAR,
    p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    old_status VARCHAR;
    old_designer_id UUID;
BEGIN
    -- Get current status
    SELECT status, designer_id INTO old_status, old_designer_id
    FROM designer_assignments 
    WHERE id = p_assignment_id;
    
    -- Update assignment
    UPDATE designer_assignments 
    SET 
        status = p_new_status,
        actual_start_time = CASE 
            WHEN p_new_status = 'in_progress' AND actual_start_time IS NULL 
            THEN NOW() 
            ELSE actual_start_time 
        END,
        actual_completion_time = CASE 
            WHEN p_new_status = 'completed' 
            THEN NOW() 
            ELSE actual_completion_time 
        END,
        updated_at = NOW()
    WHERE id = p_assignment_id;
    
    -- Log history
    INSERT INTO assignment_history (
        assignment_id,
        previous_designer_id,
        new_designer_id,
        previous_status,
        new_status,
        reason_for_change,
        changed_by
    ) VALUES (
        p_assignment_id,
        old_designer_id,
        old_designer_id,
        old_status,
        p_new_status,
        p_reason,
        auth.uid()
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. SAMPLE DATA FOR TESTING
-- Insert sample design library items
INSERT INTO design_library (design_name, design_category, design_code, material_compatibility, complexity_level, estimated_hours) VALUES
('Traditional Paisley', 'saree', 'TRAD_PAIS_001', ARRAY['saree', 'dupatta'], 'medium', 2.5),
('Modern Geometric', 'saree', 'MOD_GEO_001', ARRAY['saree'], 'complex', 4.0),
('Floral Border', 'dupatta', 'FLOR_BOR_001', ARRAY['dupatta', 'voni'], 'simple', 1.5),
('Wedding Special', 'voni', 'WED_SPEC_001', ARRAY['voni'], 'complex', 6.0),
('Simple Dots', 'dupatta', 'SIMP_DOT_001', ARRAY['dupatta', 'saree'], 'simple', 1.0)
ON CONFLICT (design_code) DO NOTHING;

COMMENT ON TABLE design_library IS 'Library of reusable designs and templates';
COMMENT ON TABLE designer_assignments IS 'Tracks designer assignments for order items';
COMMENT ON VIEW designer_workload IS 'Real-time designer workload and performance metrics';
COMMENT ON VIEW todays_priorities IS 'Dashboard view for today urgent tasks and priorities';
COMMENT ON VIEW overdue_assignments IS 'Items past their expected delivery date';
COMMENT ON FUNCTION auto_assign_designer IS 'Automatically assigns designer based on workload balance';
COMMENT ON FUNCTION check_design_availability IS 'Checks if a design exists and is compatible with material';
COMMENT ON FUNCTION update_assignment_status IS 'Updates assignment status with automatic history tracking';