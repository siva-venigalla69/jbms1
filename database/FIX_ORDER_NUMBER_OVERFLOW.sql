-- FIX: Order Number Overflow Issue
-- Problem: Existing orders have large timestamp-based numbers that overflow INTEGER type
-- Solution: Clean up bad order numbers and improve the function

-- Step 1: Check existing order numbers
SELECT
  id,
  order_number,
  customer_id,
  created_at,
  LENGTH(SUBSTRING(order_number FROM '[0-9]+')) as number_length,
  SUBSTRING(order_number FROM '[0-9]+') as extracted_number
FROM orders
WHERE order_number ~ '^ORD-[0-9]+$'
ORDER BY created_at DESC
LIMIT 20;

-- Step 2: Find problematic orders (numbers > 2147483647 which is max INTEGER)
SELECT
  id,
  order_number,
  customer_id,
  created_at,
  CASE
    WHEN LENGTH(SUBSTRING(order_number FROM '[0-9]+')) > 10 THEN 'TOO LARGE - TIMESTAMP?'
    ELSE 'OK'
  END as status
FROM orders
WHERE order_number ~ '^ORD-[0-9]+$'
  AND LENGTH(SUBSTRING(order_number FROM '[0-9]+')) > 10
ORDER BY created_at;

-- Step 3: Option A - Delete test/invalid orders with large numbers
-- UNCOMMENT AND RUN IF YOU WANT TO DELETE THEM:
-- DELETE FROM orders
-- WHERE order_number ~ '^ORD-[0-9]+$'
--   AND LENGTH(SUBSTRING(order_number FROM '[0-9]+')) > 10;

-- Step 4: Option B - Renumber all orders sequentially (SAFER - RECOMMENDED)
-- This will renumber all orders starting from 1
DO $$
DECLARE
  v_order RECORD;
  v_counter INTEGER := 0;
BEGIN
  -- Renumber all existing orders sequentially
  FOR v_order IN
    SELECT id FROM orders WHERE order_number ~ '^ORD-[0-9]+$' ORDER BY created_at
  LOOP
    v_counter := v_counter + 1;
    UPDATE orders
    SET order_number = 'ORD-' || LPAD(v_counter::TEXT, 6, '0')
    WHERE id = v_order.id;
  END LOOP;

  RAISE NOTICE 'Renumbered % orders sequentially', v_counter;
END $$;

-- Step 5: Improve the generate_order_number function to handle edge cases
-- First drop the trigger that uses the function
DROP TRIGGER IF EXISTS trigger_set_order_number ON orders;

-- Then drop the function
DROP FUNCTION IF EXISTS generate_order_number() CASCADE;

-- Recreate the improved function
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR AS $$
DECLARE
  next_num INTEGER;
  order_num VARCHAR;
BEGIN
  -- Extract numeric part and find max, but only for valid sequential numbers
  -- Ignore any order numbers with more than 10 digits (likely timestamps)
  SELECT COALESCE(MAX(
    CASE
      WHEN LENGTH(SUBSTRING(order_number FROM '[0-9]+')) <= 10
      THEN (SUBSTRING(order_number FROM '[0-9]+')::INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_num
  FROM orders
  WHERE order_number ~ '^ORD-[0-9]+$';

  order_num := 'ORD-' || LPAD(next_num::TEXT, 6, '0');
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_set_order_number ON orders;

CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE 'Function and trigger recreated successfully';
END $$;

-- Step 6: Verify the fix
SELECT 'Testing order number generation:' as test;
SELECT generate_order_number() as next_order_number;

-- Step 7: Show all current order numbers
SELECT
  order_number,
  customer_id,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 10;

SELECT '==== FIX COMPLETE ====' as status;
SELECT 'Run this script to fix order number overflow issue' as instructions;
