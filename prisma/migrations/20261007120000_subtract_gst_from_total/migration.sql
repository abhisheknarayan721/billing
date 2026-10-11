-- GST is now subtracted from the subtotal instead of added, as computeTotals in
-- src/api/lib/invoice.ts does. Every saved total is recalculated from the
-- invoice's own subtotal and tax, so flat tax figures are covered too. ROUND(x, 0)
-- rounds half up for the positive amounts an invoice holds, as ROUND_HALF_UP does.
UPDATE "invoice"
SET "totalamount" = ROUND("subtotal" - "taxamount", 0);
