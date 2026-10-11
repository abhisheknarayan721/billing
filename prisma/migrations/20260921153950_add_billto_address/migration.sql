-- Re-runnable: adds the column if it is missing, otherwise sets its type.

-- AlterTable
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "billtoaddress" TEXT;
ALTER TABLE "invoice" ALTER COLUMN "billtoaddress" TYPE TEXT;
