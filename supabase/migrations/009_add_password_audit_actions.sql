-- Migration: 009_add_password_audit_actions
-- Description: Add password-related audit actions to the audit_action enum
-- Date: 2026-01-15
--
-- PURPOSE:
-- Extend the audit_action enum to support password management audit events.
-- This allows the application to log password changes and reset attempts
-- for security auditing purposes.

-- Add new audit action types for password management
ALTER TYPE audit_action ADD VALUE 'password_change';
ALTER TYPE audit_action ADD VALUE 'password_reset_requested';
ALTER TYPE audit_action ADD VALUE 'password_reset_completed';

-- Note: These new audit actions will be used by the application to log:
-- - password_change: When a user changes their password while logged in
-- - password_reset_requested: When a user requests a password reset email
-- - password_reset_completed: When a user successfully resets their password
