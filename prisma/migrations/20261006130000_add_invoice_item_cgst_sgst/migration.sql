-- Tax is now charged line by line, so each invoice line gets its own rates.
--
-- Re-runnable: the backfill below runs only when the columns are created here.
-- If they already exist (and so may already hold real per-line rates), they
-- are only brought to this type and default, with NULLs set to 0 — their
-- values are never overwritten.
DO $$
DECLARE
  created boolean := NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'invoice_item' AND column_name = 'cgstrate'
  );
BEGIN
  ALTER TABLE "invoice_item" ADD COLUMN IF NOT EXISTS "cgstrate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sgstrate" DECIMAL(5,2) NOT NULL DEFAULT 0;

  UPDATE "invoice_item" SET "cgstrate" = COALESCE("cgstrate", 0), "sgstrate" = COALESCE("sgstrate", 0)
  WHERE "cgstrate" IS NULL OR "sgstrate" IS NULL;

  ALTER TABLE "invoice_item"
    ALTER COLUMN "cgstrate" TYPE DECIMAL(5,2), ALTER COLUMN "cgstrate" SET DEFAULT 0, ALTER COLUMN "cgstrate" SET NOT NULL,
    ALTER COLUMN "sgstrate" TYPE DECIMAL(5,2), ALTER COLUMN "sgstrate" SET DEFAULT 0, ALTER COLUMN "sgstrate" SET NOT NULL;

  IF created THEN
    -- Existing lines take the rates their invoice charged on the whole
    -- subtotal, so old bills show the rates they were raised at.
    UPDATE "invoice_item" AS ii
    SET "cgstrate" = i."cgstrate", "sgstrate" = i."sgstrate"
    FROM "invoice" AS i
    WHERE ii."inv_id" = i."inv_id" AND (i."cgstrate" <> 0 OR i."sgstrate" <> 0);

    -- Invoices from before CGST/SGST existed only have a combined tax amount:
    -- the rate is worked back out of the subtotal and split evenly, as the
    -- edit form did.
    UPDATE "invoice_item" AS ii
    SET "cgstrate" = LEAST(ROUND(i."taxamount" / i."subtotal" * 50, 2), 100),
        "sgstrate" = LEAST(ROUND(i."taxamount" / i."subtotal" * 50, 2), 100)
    FROM "invoice" AS i
    WHERE ii."inv_id" = i."inv_id"
      AND i."cgstrate" = 0 AND i."sgstrate" = 0
      AND i."taxamount" <> 0 AND i."subtotal" <> 0;
  END IF;
END $$;
