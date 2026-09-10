-- Migration 008 Verification Queries
-- Run these AFTER applying Migration 008 to verify it works correctly

-- ============================================================================
-- TEST 1: Authenticated User WITHOUT Profile/Role
-- ============================================================================

-- Setup: Create a test user in Supabase Auth (no profile in public.users)
-- Then run this query as that user:

-- Expected: Should return 0 rows or RLS error
SELECT 'TEST 1: Unauthenticated user accessing buses' as test_name;
SELECT * FROM public.buses LIMIT 1;

-- ============================================================================
-- TEST 2: Authenticated User WITH Profile but NO Role
-- ============================================================================

-- Setup: Create user profile but don't assign any role
-- INSERT INTO public.users (id, email, full_name, status) VALUES ('<user-id>', 'test@example.com', 'Test User', 'active');
-- Then run this query as that user:

-- Expected: Should return 0 rows or RLS error
SELECT 'TEST 2: User with profile but no role accessing buses' as test_name;
SELECT * FROM public.buses LIMIT 1;

-- ============================================================================
-- TEST 3: OWNER Role Access
-- ============================================================================

-- Setup: Ensure OWNER exists and has role assigned
-- Then run this query as OWNER:

-- Expected: Should return data (if buses exist)
SELECT 'TEST 3: OWNER accessing buses' as test_name;
SELECT COUNT(*) as bus_count FROM public.buses;

-- ============================================================================
-- TEST 4: MANAGER Role Access
-- ============================================================================

-- Setup: Create MANAGER user and assign role
-- Then run this query as MANAGER:

-- Expected: Should return data (if buses exist)
SELECT 'TEST 4: MANAGER accessing buses' as test_name;
SELECT COUNT(*) as bus_count FROM public.buses;

-- ============================================================================
-- TEST 5: Verify Bootstrap Function Still Works
-- ============================================================================

-- If no OWNER exists, this should work:
SELECT 'TEST 5: Bootstrap function test' as test_name;
-- SELECT public.bootstrap_first_owner('Test Owner', '+92 300 1234567');

-- ============================================================================
-- TEST 6: Verify No Old Authentication-Only Policies Remain
-- ============================================================================

-- Check that business tables use role-based policies, not is_authenticated()
SELECT 'TEST 6: Verify RLS policies are role-gated' as test_name;

SELECT 
    schemaname,
    tablename,
    policyname,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('buses', 'trips', 'trip_revenue_entries', 'trip_expenses')
AND qual LIKE '%is_authenticated%'
AND qual NOT LIKE '%has_role%';

-- Expected: Should return 0 rows (no old authentication-only policies)

-- ============================================================================
-- TEST 7: Verify All Business Tables Are Protected
-- ============================================================================

SELECT 'TEST 7: Verify all business tables have role-gated policies' as test_name;

SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'buses', 'trips', 'trip_revenue_entries', 'trip_expenses',
    'maintenance_records', 'tyre_records',
    'fuel_purchases', 'fuel_sales', 'fuel_stock_snapshots',
    'fuel_stock_adjustments', 'fuel_sale_expense_links',
    'adda_income', 'adda_expenses',
    'cargo_records',
    'installments', 'installment_payments',
    'audit_logs'
)
GROUP BY tablename
ORDER BY tablename;

-- Expected: Each table should have 2-3 policies (SELECT, INSERT, UPDATE)

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 'VERIFICATION COMPLETE' as status;
SELECT 'Review results above. All tests should pass.' as message;
