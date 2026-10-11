-- Re-runnable: adds each column if it is missing, otherwise sets its type.

-- AlterTable
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "p_mrp" DECIMAL(18,2);
ALTER TABLE "product" ALTER COLUMN "p_mrp" TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "invoice_item" ADD COLUMN IF NOT EXISTS "mrp" DECIMAL(18,2);
ALTER TABLE "invoice_item" ALTER COLUMN "mrp" TYPE DECIMAL(18,2);
