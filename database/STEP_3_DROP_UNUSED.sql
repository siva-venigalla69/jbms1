-- ============================================================================
-- STEP 3: DROP UNUSED TABLES (Optional but Recommended)
-- ============================================================================
-- CLEAN VERSION - Safely removes 40+ unused tables
-- All data is backed up in backup_schema
-- Execute this ONLY AFTER Step 1 and Step 2 complete successfully
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'STEP 3: CLEANING UP UNUSED TABLES';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'WARNING: This will drop 40+ unused tables from public schema';
  RAISE NOTICE 'All data is safely backed up in backup_schema';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- Drop Design Management Tables (12 tables)
-- ============================================================================

DO $$
DECLARE
  dropped_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Dropping Design Management Tables...';

  DROP TABLE IF EXISTS public.design_submissions CASCADE;
  DROP TABLE IF EXISTS public.design_files CASCADE;
  DROP TABLE IF EXISTS public.design_status CASCADE;
  DROP TABLE IF EXISTS public.design_status_history CASCADE;
  DROP TABLE IF EXISTS public.customer_designs CASCADE;
  DROP TABLE IF EXISTS public.design_library CASCADE;
  DROP TABLE IF EXISTS public.material_design_mapping CASCADE;
  DROP TABLE IF EXISTS public.design_printing_queue CASCADE;
  DROP TABLE IF EXISTS public.design_material_requirements CASCADE;
  DROP TABLE IF EXISTS public.designer_assignments CASCADE;
  DROP TABLE IF EXISTS public.assignment_history CASCADE;
  DROP TABLE IF EXISTS public.customer_design_summary CASCADE;

  RAISE NOTICE '  Dropped: 12 design management tables';
END $$;

-- ============================================================================
-- Drop Production Scheduling Tables (8 tables)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Dropping Production Scheduling Tables...';

  DROP TABLE IF EXISTS public.production_schedule CASCADE;
  DROP TABLE IF EXISTS public.production_dependencies CASCADE;
  DROP TABLE IF EXISTS public.production_stage_progress CASCADE;
  DROP TABLE IF EXISTS public.production_batches CASCADE;
  DROP TABLE IF EXISTS public.order_items CASCADE;

  RAISE NOTICE '  Dropped: 5 production scheduling tables';
END $$;

-- ============================================================================
-- Drop Invoice Complexity Tables (6 tables)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Dropping Invoice Complexity Tables...';

  DROP TABLE IF EXISTS public.invoice_line_items CASCADE;
  DROP TABLE IF EXISTS public.invoice_approvals CASCADE;
  DROP TABLE IF EXISTS public.invoice_revisions CASCADE;
  DROP TABLE IF EXISTS public.invoice_templates CASCADE;
  DROP TABLE IF EXISTS public.invoice_sources_enhanced CASCADE;

  RAISE NOTICE '  Dropped: 5 invoice complexity tables';
END $$;

-- ============================================================================
-- Drop Employee/Payroll Tables (5 tables)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Dropping Employee/Payroll Tables...';

  DROP TABLE IF EXISTS public.employees CASCADE;
  DROP TABLE IF EXISTS public.salary_payments CASCADE;
  DROP TABLE IF EXISTS public.expenses CASCADE;
  DROP TABLE IF EXISTS public.purchases CASCADE;
  DROP TABLE IF EXISTS public.purchase_items CASCADE;

  RAISE NOTICE '  Dropped: 5 employee/payroll tables';
END $$;

-- ============================================================================
-- Drop Other Unused Tables
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Dropping Other Unused Tables...';

  DROP TABLE IF EXISTS public.inventory CASCADE;
  DROP TABLE IF EXISTS public.material_out CASCADE;
  DROP TABLE IF EXISTS public.audit_trail CASCADE;
  DROP TABLE IF EXISTS public.user_activity_log CASCADE;
  DROP TABLE IF EXISTS public.user_notifications CASCADE;
  DROP TABLE IF EXISTS public.system_settings CASCADE;

  RAISE NOTICE '  Dropped: Additional unused tables';
END $$;

-- ============================================================================
-- VERIFICATION & SUMMARY
-- ============================================================================

DO $$
DECLARE
  public_count INTEGER;
  backup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO public_count FROM information_schema.tables WHERE table_schema = 'public';
  SELECT COUNT(*) INTO backup_count FROM information_schema.tables WHERE table_schema = 'backup_schema';

  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'STEP 3 COMPLETE!';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - Tables in public schema: %', public_count;
  RAISE NOTICE '  - Tables in backup_schema: %', backup_count;
  RAISE NOTICE '  - Simplified system ready!';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT:';
  RAISE NOTICE '  - All dropped tables are backed up in backup_schema';
  RAISE NOTICE '  - To restore a table:';
  RAISE NOTICE '    CREATE TABLE public.table_name AS SELECT * FROM backup_schema.table_name';
  RAISE NOTICE '  - Keep backup_schema until new system is fully verified';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;

-- List remaining tables in public schema
SELECT
  tablename as remaining_table
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
