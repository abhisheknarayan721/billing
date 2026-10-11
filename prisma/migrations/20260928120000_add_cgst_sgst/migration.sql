-- Re-runnable: each column is added if it is missing. One that already exists
-- is brought to this type and default, its NULLs become 0, and it is made
-- NOT NULL.

-- AlterTable
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "cgstrate" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "cgstamount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "sgstrate" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "sgstamount" DECIMAL(18,2) NOT NULL DEFAULT 0;

UPDATE "invoice" SET
  "cgstrate" = COALESCE("cgstrate", 0),
  "cgstamount" = COALESCE("cgstamount", 0),
  "sgstrate" = COALESCE("sgstrate", 0),
  "sgstamount" = COALESCE("sgstamount", 0)
WHERE "cgstrate" IS NULL OR "cgstamount" IS NULL OR "sgstrate" IS NULL OR "sgstamount" IS NULL;

ALTER TABLE "invoice"
  ALTER COLUMN "cgstrate" TYPE DECIMAL(5,2), ALTER COLUMN "cgstrate" SET DEFAULT 0, ALTER COLUMN "cgstrate" SET NOT NULL,
  ALTER COLUMN "cgstamount" TYPE DECIMAL(18,2), ALTER COLUMN "cgstamount" SET DEFAULT 0, ALTER COLUMN "cgstamount" SET NOT NULL,
  ALTER COLUMN "sgstrate" TYPE DECIMAL(5,2), ALTER COLUMN "sgstrate" SET DEFAULT 0, ALTER COLUMN "sgstrate" SET NOT NULL,
  ALTER COLUMN "sgstamount" TYPE DECIMAL(18,2), ALTER COLUMN "sgstamount" SET DEFAULT 0, ALTER COLUMN "sgstamount" SET NOT NULL;
