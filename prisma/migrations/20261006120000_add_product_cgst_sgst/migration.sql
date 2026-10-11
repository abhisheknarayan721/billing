-- Re-runnable: each column is added if it is missing. One that already exists
-- is brought to this type and default, its NULLs become 0, and it is made
-- NOT NULL.

-- AlterTable
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "p_cgst" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "p_sgst" DECIMAL(5,2) NOT NULL DEFAULT 0;

UPDATE "product" SET "p_cgst" = COALESCE("p_cgst", 0), "p_sgst" = COALESCE("p_sgst", 0)
WHERE "p_cgst" IS NULL OR "p_sgst" IS NULL;

ALTER TABLE "product"
  ALTER COLUMN "p_cgst" TYPE DECIMAL(5,2), ALTER COLUMN "p_cgst" SET DEFAULT 0, ALTER COLUMN "p_cgst" SET NOT NULL,
  ALTER COLUMN "p_sgst" TYPE DECIMAL(5,2), ALTER COLUMN "p_sgst" SET DEFAULT 0, ALTER COLUMN "p_sgst" SET NOT NULL;
