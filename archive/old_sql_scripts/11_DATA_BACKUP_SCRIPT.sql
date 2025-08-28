-- =====================================
-- DATA BACKUP SCRIPT
-- This generates INSERT statements for all your data
-- Run this to backup all current data
-- =====================================

DO $$
DECLARE
    rec RECORD;
    data_backup TEXT := '';
    table_name TEXT;
    insert_stmt TEXT;
    row_count INTEGER;
BEGIN
    data_backup := '-- =====================================' || E'\n';
    data_backup := data_backup || '-- COMPLETE DATA BACKUP' || E'\n';
    data_backup := data_backup || '-- Generated: ' || NOW() || E'\n';
    data_backup := data_backup || '-- =====================================' || E'\n\n';

    -- 1. REFERENCE TABLES DATA (Insert first due to FK dependencies)
    data_backup := data_backup || '-- =====================================' || E'\n';
    data_backup := data_backup || '-- REFERENCE TABLES DATA' || E'\n';
    data_backup := data_backup || '-- =====================================' || E'\n\n';

    -- User Roles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
        SELECT COUNT(*) INTO row_count FROM user_roles;
        data_backup := data_backup || '-- user_roles (' || row_count || ' records)' || E'\n';
        
        FOR rec IN SELECT * FROM user_roles ORDER BY id LOOP
            data_backup := data_backup || 'INSERT INTO user_roles (id, name, created_at) VALUES (''' || 
                          rec.id || ''', ''' || rec.name || ''', ''' || rec.created_at || ''');' || E'\n';
        END LOOP;
        data_backup := data_backup || E'\n';
    END IF;

    -- Material Types  
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'material_types') THEN
        SELECT COUNT(*) INTO row_count FROM material_types;
        data_backup := data_backup || '-- material_types (' || row_count || ' records)' || E'\n';
        
        FOR rec IN SELECT * FROM material_types ORDER BY id LOOP
            data_backup := data_backup || 'INSERT INTO material_types (id, name, created_at) VALUES (''' || 
                          rec.id || ''', ''' || rec.name || ''', ''' || rec.created_at || ''');' || E'\n';
        END LOOP;
        data_backup := data_backup || E'\n';
    END IF;

    -- Order Statuses
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_statuses') THEN
        SELECT COUNT(*) INTO row_count FROM order_statuses;
        data_backup := data_backup || '-- order_statuses (' || row_count || ' records)' || E'\n';
        
        FOR rec IN SELECT * FROM order_statuses ORDER BY id LOOP
            data_backup := data_backup || 'INSERT INTO order_statuses (id, name, created_at) VALUES (''' || 
                          rec.id || ''', ''' || rec.name || ''', ''' || rec.created_at || ''');' || E'\n';
        END LOOP;
        data_backup := data_backup || E'\n';
    END IF;

    -- Payment Methods
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_methods') THEN
        SELECT COUNT(*) INTO row_count FROM payment_methods;
        data_backup := data_backup || '-- payment_methods (' || row_count || ' records)' || E'\n';
        
        FOR rec IN SELECT * FROM payment_methods ORDER BY id LOOP
            data_backup := data_backup || 'INSERT INTO payment_methods (id, name, created_at) VALUES (''' || 
                          rec.id || ''', ''' || rec.name || ''', ''' || rec.created_at || ''');' || E'\n';
        END LOOP;
        data_backup := data_backup || E'\n';
    END IF;

    -- Production Stages
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'production_stages') THEN
        SELECT COUNT(*) INTO row_count FROM production_stages;
        data_backup := data_backup || '-- production_stages (' || row_count || ' records)' || E'\n';
        
        FOR rec IN SELECT * FROM production_stages ORDER BY id LOOP
            data_backup := data_backup || 'INSERT INTO production_stages (id, name, created_at) VALUES (''' || 
                          rec.id || ''', ''' || rec.name || ''', ''' || rec.created_at || ''');' || E'\n';
        END LOOP;
        data_backup := data_backup || E'\n';
    END IF;

    -- Return Reasons
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'return_reasons') THEN
        SELECT COUNT(*) INTO row_count FROM return_reasons;
        data_backup := data_backup || '-- return_reasons (' || row_count || ' records)' || E'\n';
        
        FOR rec IN SELECT * FROM return_reasons ORDER BY id LOOP
            data_backup := data_backup || 'INSERT INTO return_reasons (id, name, created_at) VALUES (''' || 
                          rec.id || ''', ''' || rec.name || ''', ''' || rec.created_at || ''');' || E'\n';
        END LOOP;
        data_backup := data_backup || E'\n';
    END IF;

    -- 2. MAIN TABLES DATA
    data_backup := data_backup || '-- =====================================' || E'\n';
    data_backup := data_backup || '-- MAIN TABLES DATA' || E'\n';
    data_backup := data_backup || '-- =====================================' || E'\n\n';

    -- Customers (94 records)
    SELECT COUNT(*) INTO row_count FROM customers;
    data_backup := data_backup || '-- customers (' || row_count || ' records)' || E'\n';
    data_backup := data_backup || '-- Note: Only showing first 5 customers for brevity' || E'\n';
    FOR rec IN SELECT * FROM customers ORDER BY created_at LIMIT 5 LOOP
        data_backup := data_backup || 'INSERT INTO customers (id, name, phone, email, address, gst_number, is_deleted, created_at) VALUES (''' || 
                      rec.id || ''', ''' || COALESCE(rec.name, '') || ''', ''' || COALESCE(rec.phone, '') || ''', ''' || 
                      COALESCE(rec.email, '') || ''', ''' || COALESCE(rec.address, '') || ''', ''' || 
                      COALESCE(rec.gst_number, '') || ''', ' || rec.is_deleted || ', ''' || rec.created_at || ''');' || E'\n';
    END LOOP;
    data_backup := data_backup || '-- ... (remaining ' || (row_count - 5) || ' customers)' || E'\n\n';

    -- Material In (7 records)
    SELECT COUNT(*) INTO row_count FROM material_in;
    data_backup := data_backup || '-- material_in (' || row_count || ' records)' || E'\n';
    FOR rec IN SELECT * FROM material_in ORDER BY received_date DESC LOOP
        data_backup := data_backup || 'INSERT INTO material_in (id, customer_id, order_id, material_type, quantity, unit, received_date, notes, created_at) VALUES (''' || 
                      rec.id || ''', ''' || rec.customer_id || ''', ''' || COALESCE(rec.order_id::text, 'NULL') || ''', ''' || 
                      rec.material_type || ''', ' || rec.quantity || ', ''' || COALESCE(rec.unit, '') || ''', ''' || 
                      rec.received_date || ''', ''' || COALESCE(rec.notes, '') || ''', ''' || rec.created_at || ''');' || E'\n';
    END LOOP;
    data_backup := data_backup || E'\n';

    -- Material Stock (12 records)
    SELECT COUNT(*) INTO row_count FROM material_stock;
    data_backup := data_backup || '-- material_stock (' || row_count || ' records)' || E'\n';
    FOR rec IN SELECT * FROM material_stock ORDER BY created_at LOOP
        data_backup := data_backup || 'INSERT INTO material_stock (id, customer_id, material_type, total_received, total_delivered, current_stock, last_updated, created_at) VALUES (''' || 
                      rec.id || ''', ''' || rec.customer_id || ''', ''' || rec.material_type || ''', ' || 
                      rec.total_received || ', ' || rec.total_delivered || ', ' || rec.current_stock || ', ''' || 
                      rec.last_updated || ''', ''' || rec.created_at || ''');' || E'\n';
    END LOOP;
    data_backup := data_backup || E'\n';

    -- Delivery Challans (3 records)
    SELECT COUNT(*) INTO row_count FROM delivery_challans;
    data_backup := data_backup || '-- delivery_challans (' || row_count || ' records)' || E'\n';
    FOR rec IN SELECT * FROM delivery_challans ORDER BY created_at LOOP
        data_backup := data_backup || 'INSERT INTO delivery_challans (id, challan_number, customer_id, challan_date, total_quantity, delivery_status, notes, is_deleted, created_at) VALUES (''' || 
                      rec.id || ''', ''' || rec.challan_number || ''', ''' || rec.customer_id || ''', ''' || 
                      rec.challan_date || ''', ' || COALESCE(rec.total_quantity, 0) || ', ''' || 
                      COALESCE(rec.delivery_status, '') || ''', ''' || COALESCE(rec.notes, '') || ''', ' || 
                      rec.is_deleted || ', ''' || rec.created_at || ''');' || E'\n';
    END LOOP;
    data_backup := data_backup || E'\n';

    -- Challan Items (3 records)  
    SELECT COUNT(*) INTO row_count FROM challan_items;
    data_backup := data_backup || '-- challan_items (' || row_count || ' records)' || E'\n';
    FOR rec IN SELECT * FROM challan_items ORDER BY created_at LOOP
        data_backup := data_backup || 'INSERT INTO challan_items (id, challan_id, order_item_id, quantity, created_at) VALUES (''' || 
                      rec.id || ''', ''' || rec.challan_id || ''', ''' || rec.order_item_id || ''', ' || 
                      rec.quantity || ', ''' || rec.created_at || ''');' || E'\n';
    END LOOP;
    data_backup := data_backup || E'\n';

    data_backup := data_backup || '-- =====================================' || E'\n';
    data_backup := data_backup || '-- END OF DATA BACKUP' || E'\n';
    data_backup := data_backup || '-- =====================================' || E'\n';

    -- Output the data backup
    RAISE NOTICE '%', data_backup;
    
    -- Save to temp table
    DROP TABLE IF EXISTS temp_data_backup;
    CREATE TEMP TABLE temp_data_backup AS SELECT data_backup as data_script;
    
END $$;

-- Get the data backup script
SELECT data_script FROM temp_data_backup;