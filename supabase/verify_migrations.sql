-- ============================================================================
-- SADAAT TRAVELS - DATABASE VERIFICATION SCRIPT
-- ============================================================================
-- Run this in Supabase SQL Editor after applying migrations to verify setup
-- ============================================================================

-- 1. Verify all tables exist
SELECT 'Tables Check' as test,
       COUNT(*) as table_count,
       CASE WHEN COUNT(*) >= 23 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- 2. Verify enums exist
SELECT 'Enums Check' as test,
       COUNT(*) as enum_count,
       CASE WHEN COUNT(*) >= 6 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname = 'public';

-- 3. Verify roles exist
SELECT 'Roles Check' as test,
       COUNT(*) as role_count,
       CASE WHEN COUNT(*) = 3 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM public.roles;

-- 4. Verify permissions exist
SELECT 'Permissions Check' as test,
       COUNT(*) as permission_count,
       CASE WHEN COUNT(*) >= 49 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM public.permissions;

-- 5. Verify RLS is enabled on all tables
SELECT 'RLS Check' as test,
       COUNT(*) as tables_with_rls,
       CASE WHEN COUNT(*) >= 23 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM pg_class
WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND relkind = 'r'
AND relrowsecurity = true;

-- 6. Verify helper functions exist
SELECT 'Functions Check' as test,
       COUNT(*) as function_count,
       CASE WHEN COUNT(*) >= 4 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('is_authenticated', 'has_role', 'has_permission', 'get_user_roles');

-- 7. List all tables
SELECT 'Table List' as info,
       table_name,
       'Created' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 8. List all roles
SELECT 'Role List' as info,
       name as role_name,
       description,
       'Seeded' as status
FROM public.roles
ORDER BY name;

-- 9. Count permissions by module
SELECT 'Permissions by Module' as info,
       module,
       COUNT(*) as count,
       'Seeded' as status
FROM public.permissions
GROUP BY module
ORDER BY module;

-- 10. Verify indexes exist
SELECT 'Indexes Check' as test,
       COUNT(*) as index_count,
       CASE WHEN COUNT(*) >= 60 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM pg_indexes
WHERE schemaname = 'public';

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT 'VERIFICATION COMPLETE' as summary,
       'Check all results above. All should show ✓ PASS' as message;
