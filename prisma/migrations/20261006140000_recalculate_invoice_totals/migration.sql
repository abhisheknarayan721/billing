-- Every invoice's figures are recalculated from its lines, the way the app now
-- saves them: each line taxed at its own CGST/SGST rate, and the total rounded
-- to the nearest rupee. Invoices saved before either rule existed were showing
-- a tax their lines did not carry, and totals with paise and no round-off.

-- A line's rate was worked back out of its invoice's combined tax when the
-- line columns were added. That is only a real rate if charging it on the
-- subtotal gives back the tax actually saved (5% of 450.00 = 22.50). A flat
-- figure does not (5.00 on 773.18 came out as an odd 0.32%), so those lines
-- carry no GST, as their products do not.
UPDATE "invoice_item" AS ii
SET "cgstrate" = 0, "sgstrate" = 0
FROM "invoice" AS i
WHERE ii."inv_id" = i."inv_id"
  AND i."cgstamount" = 0 AND i."sgstamount" = 0 AND i."taxamount" <> 0
  AND ROUND(i."subtotal" * (ii."cgstrate" + ii."sgstrate") / 100, 2) <> i."taxamount";

-- Same maths as computeTotals in src/api/lib/invoice.ts. The invoice keeps a
-- rate only when all its lines share it. ROUND(x, 0) rounds half up for the
-- positive amounts an invoice holds, as ROUND_HALF_UP does.
WITH totals AS (
  SELECT
    "inv_id",
    SUM("linetotal") AS subtotal,
    SUM(ROUND("linetotal" * "cgstrate" / 100, 2)) AS cgstamount,
    SUM(ROUND("linetotal" * "sgstrate" / 100, 2)) AS sgstamount,
    CASE WHEN MIN("cgstrate") = MAX("cgstrate") THEN MIN("cgstrate") ELSE 0 END AS cgstrate,
    CASE WHEN MIN("sgstrate") = MAX("sgstrate") THEN MIN("sgstrate") ELSE 0 END AS sgstrate
  FROM "invoice_item"
  GROUP BY "inv_id"
)
UPDATE "invoice" AS i
SET "subtotal" = t.subtotal,
    "cgstrate" = t.cgstrate,
    "cgstamount" = t.cgstamount,
    "sgstrate" = t.sgstrate,
    "sgstamount" = t.sgstamount,
    "taxamount" = t.cgstamount + t.sgstamount,
    "totalamount" = ROUND(t.subtotal + t.cgstamount + t.sgstamount, 0)
FROM totals AS t
WHERE i."inv_id" = t."inv_id";
