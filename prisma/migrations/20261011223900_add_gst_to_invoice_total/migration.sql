-- GST is added to the subtotal. Recalculate saved invoice totals using the
-- same nearest-rupee, half-up rounding as computeTotals.
UPDATE "invoice"
SET "totalamount" = ROUND("subtotal" + "taxamount", 0);
