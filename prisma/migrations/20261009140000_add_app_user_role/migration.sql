-- Logins get a role: 'admin' sees everything, 'user' only retailer orders.
-- Everyone who could already sign in becomes an admin, so nobody loses access.
--
-- Re-runnable: the column is added only if it does not exist.
ALTER TABLE "app_user" ADD COLUMN IF NOT EXISTS "role" VARCHAR(20) NOT NULL DEFAULT 'admin';
