-- Migration: Add manager role to users table
-- Date: 2026-02-04

-- Drop the old constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the new constraint with manager role
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('designer', 'constructor', 'buyer', 'manager', 'china_office', 'factory'));
