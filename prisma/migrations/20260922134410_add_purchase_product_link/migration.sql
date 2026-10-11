-- Re-runnable: columns are added if missing, otherwise set to these types; the
-- index and the foreign key are created only if they do not exist yet.

-- AlterTable
ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "p_id" INTEGER,
ADD COLUMN IF NOT EXISTS "updateddate" TIMESTAMP(6);
ALTER TABLE "purchase" ALTER COLUMN "p_id" TYPE INTEGER,
ALTER COLUMN "updateddate" TYPE TIMESTAMP(6);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_purchase_p_id" ON "purchase"("p_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_p_id_fkey') THEN
    ALTER TABLE "purchase" ADD CONSTRAINT "purchase_p_id_fkey" FOREIGN KEY ("p_id") REFERENCES "product"("p_id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;
