-- Passwords are kept as readable text from here on. A scrypt hash cannot be
-- turned back into the password, so the old values are kept as-is under the
-- new name; any account still holding one must have its password set again
-- with `npm run user:create -- <username>`.
--
-- Re-runnable: renames only while the old column is there and the new one is
-- not, so a database that already has "password" is left alone.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'app_user' AND column_name = 'passwordhash'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'app_user' AND column_name = 'password'
  ) THEN
    ALTER TABLE "app_user" RENAME COLUMN "passwordhash" TO "password";
  END IF;
END $$;
