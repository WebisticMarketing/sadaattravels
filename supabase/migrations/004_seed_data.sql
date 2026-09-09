-- Migration: 004_seed_data
-- Description: Initial roles and permissions for Sadaat Travels Management System
-- Date: 2026

-- ============================================================================
-- SEED ROLES
-- ============================================================================

INSERT INTO public.roles (name, description) VALUES
    ('OWNER', 'Full system access. Can manage all aspects of the business including users, permissions, and financial data.'),
    ('MANAGER', 'Can manage day-to-day operations including trips, buses, fuel, cargo, and reports. Cannot manage users or permissions.'),
    ('STAFF', 'Limited access. Can view and enter data for assigned modules. Cannot reverse or delete financial records.');

-- ============================================================================
-- SEED PERMISSIONS
-- ============================================================================

-- User Management
INSERT INTO public.permissions (code, name, description, module) VALUES
    ('users.view', 'View Users', 'Can view user list and details', 'users'),
    ('users.create', 'Create Users', 'Can create new user accounts', 'users'),
    ('users.update', 'Update Users', 'Can update user details', 'users'),
    ('users.delete', 'Delete Users', 'Can delete user accounts', 'users'),
    ('users.assign_roles', 'Assign Roles', 'Can assign roles to users', 'users');

-- Bus Management
INSERT INTO public.permissions (code, name, description, module) VALUES
    ('buses.view', 'View Buses', 'Can view bus fleet', 'buses'),
    ('buses.create', 'Create Buses', 'Can add new buses', 'buses'),
    ('buses.update', 'Update Buses', 'Can edit bus details', 'buses'),
    ('buses.delete', 'Delete Buses', 'Can remove buses', 'buses');

-- Trip Management
INSERT INTO public.permissions (code, name, description, module) VALUES
    ('trips.view', 'View Trips', 'Can view trip records', 'trips'),
    ('trips.create', 'Create Trips', 'Can create new trips', 'trips'),
    ('trips.update', 'Update Trips', 'Can edit trip details', 'trips'),
    ('trips.reverse', 'Reverse Trips', 'Can reverse/cancel trips', 'trips'),
    ('trips.add_revenue', 'Add Trip Revenue', 'Can add revenue entries to trips', 'trips'),
    ('trips.add_expense', 'Add Trip Expenses', 'Can add expense entries to trips', 'trips');

-- Maintenance
INSERT INTO public.permissions (code, name, description, module) VALUES
    ('maintenance.view', 'View Maintenance', 'Can view maintenance records', 'maintenance'),
    ('maintenance.create', 'Create Maintenance', 'Can create maintenance records', 'maintenance'),
    ('maintenance.update', 'Update Maintenance', 'Can edit maintenance records', 'maintenance');

-- Tyres
INSERT INTO public.permissions (code, name, description, module) VALUES
    ('tyres.view', 'View Tyres', 'Can view tyre records', 'tyres'),
    ('tyres.create', 'Create Tyres', 'Can create tyre records', 'tyres'),
    ('tyres.update', 'Update Tyres', 'Can edit tyre records', 'tyres');

-- Fuel / Petrol Pump
INSERT INTO public.permissions (code, name, description, module) VALUES
    ('fuel.view', 'View Fuel', 'Can view fuel purchases and sales', 'fuel'),
    ('fuel.purchase', 'Record Fuel Purchase', 'Can record fuel purchases', 'fuel'),
    ('fuel.sell_external', 'Sell Fuel (External)', 'Can sell fuel to external customers', 'fuel'),
    ('fuel.sell_internal', 'Supply Fuel (Internal)', 'Can supply fuel to Sadaat buses', 'fuel'),
    ('fuel.reverse', 'Reverse Fuel Records', 'Can reverse fuel transactions', 'fuel'),
    ('fuel.stock', 'Manage Fuel Stock', 'Can manage fuel stock snapshots', 'fuel');

-- Adda
INSERT INTO public.permissions (code, name, description, module) VALUES
    ('adda.view', 'View Adda', 'Can view adda income and expenses', 'adda'),
    ('adda.create_income', 'Create Adda Income', 'Can record adda income', 'adda'),
    ('adda.create_expense', 'Create Adda Expense', 'Can record adda expenses', 'adda'),
    ('adda.reverse', 'Reverse Adda Records', 'Can reverse adda transactions', 'adda');

-- Cargo
INSERT INTO public.permissions (code, name, description, module) VALUES
    ('cargo.view', 'View Cargo', 'Can view cargo records', 'cargo'),
    ('cargo.create', 'Create Cargo', 'Can create cargo records', 'cargo'),
    ('cargo.update', 'Update Cargo', 'Can edit cargo records', 'cargo'),
    ('cargo.reverse', 'Reverse Cargo', 'Can reverse cargo records', 'cargo');

-- Installments
INSERT INTO public.permissions (code, name, description, module) VALUES
    ('installments.view', 'View Installments', 'Can view installment records', 'installments'),
    ('installments.create', 'Create Installments', 'Can create installment records', 'installments'),
    ('installments.update', 'Update Installments', 'Can edit installment records', 'installments'),
    ('installments.pay', 'Record Payments', 'Can record installment payments', 'installments'),
    ('installments.reverse', 'Reverse Installments', 'Can reverse installment records', 'installments');

-- Personal Expenses
INSERT INTO public.permissions (code, name, description, module) VALUES
    ('personal_expenses.view', 'View Personal Expenses', 'Can view personal expense records', 'personal_expenses'),
    ('personal_expenses.create', 'Create Personal Expenses', 'Can record personal expenses', 'personal_expenses'),
    ('personal_expenses.update', 'Update Personal Expenses', 'Can edit personal expense records', 'personal_expenses');

-- Reports
INSERT INTO public.permissions (code, name, description, module) VALUES
    ('reports.view', 'View Reports', 'Can access reports', 'reports'),
    ('reports.financial', 'View Financial Reports', 'Can view financial reports and P&L', 'reports'),
    ('reports.export', 'Export Reports', 'Can export report data', 'reports');

-- Audit Logs
INSERT INTO public.permissions (code, name, description, module) VALUES
    ('audit.view', 'View Audit Logs', 'Can view system audit logs', 'audit');

-- ============================================================================
-- ASSIGN PERMISSIONS TO ROLES
-- ============================================================================

-- OWNER gets ALL permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'OWNER';

-- MANAGER gets most permissions except user management and some sensitive operations
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'MANAGER'
AND p.code NOT IN (
    'users.view', 'users.create', 'users.update', 'users.delete', 'users.assign_roles',
    'audit.view'
);

-- STAFF gets view and create permissions for operational modules
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'STAFF'
AND p.code IN (
    -- Buses: view only
    'buses.view',
    -- Trips: view, create, add revenue/expense (no reverse)
    'trips.view', 'trips.create', 'trips.add_revenue', 'trips.add_expense',
    -- Maintenance: view and create
    'maintenance.view', 'maintenance.create',
    -- Tyres: view and create
    'tyres.view', 'tyres.create',
    -- Fuel: view, purchase, sell (no reverse, no stock management)
    'fuel.view', 'fuel.purchase', 'fuel.sell_external', 'fuel.sell_internal',
    -- Adda: view and create
    'adda.view', 'adda.create_income', 'adda.create_expense',
    -- Cargo: view and create
    'cargo.view', 'cargo.create',
    -- Installments: view only
    'installments.view',
    -- Personal expenses: view and create
    'personal_expenses.view', 'personal_expenses.create',
    -- Reports: view only
    'reports.view'
);
