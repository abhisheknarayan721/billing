// Normalising and money maths for purchases.

import { Prisma } from '@/generated/prisma/client'
import type {
  PurchaseFormValues,
  PurchaseLineValues,
  PurchaseValues,
} from '@/lib/purchase'

const text = (value: unknown) => String(value ?? '').trim()

export function normalizePurchase(input: Record<string, unknown>): PurchaseValues {
  return {
    purchasedby: text(input.purchasedby),
    p_id: text(input.p_id),
    productname: text(input.productname),
    quantity: text(input.quantity),
    unitprice: text(input.unitprice),
    invoicenumber: text(input.invoicenumber),
    invoicedate: text(input.invoicedate),
    status: text(input.status) || 'Received',
  }
}

function normalizeLine(input: unknown): PurchaseLineValues {
  const line = (input ?? {}) as Record<string, unknown>

  return {
    p_id: text(line.p_id),
    productname: text(line.productname),
    quantity: text(line.quantity),
    unitprice: text(line.unitprice),
  }
}

/**
 * A multi-line submission. `lines` that is not an array becomes an empty one
 * rather than throwing, so a malformed payload comes back as the "add at least
 * one product line" field error instead of a 500.
 */
export function normalizePurchaseForm(
  input: Record<string, unknown>,
): PurchaseFormValues {
  return {
    purchasedby: text(input.purchasedby),
    invoicenumber: text(input.invoicenumber),
    invoicedate: text(input.invoicedate),
    status: text(input.status) || 'Received',
    lines: Array.isArray(input.lines) ? input.lines.map(normalizeLine) : [],
  }
}

/**
 * Recomputed server-side from quantity x unit price; whatever total the client
 * sent is ignored. Prisma.Decimal (decimal.js) is used rather than a JS number
 * so money never picks up binary float error.
 */
export function computeTotal(values: PurchaseValues): Prisma.Decimal {
  return new Prisma.Decimal(values.unitprice || 0)
    .mul(Number(values.quantity) || 0)
    .toDecimalPlaces(2)
}

/** Maps validated form values onto the columns of the `purchase` table. */
export function toPurchaseRow(values: PurchaseValues) {
  return {
    purchasedby: values.purchasedby,
    p_id: values.p_id === '' ? null : Number(values.p_id),
    productname: values.productname,
    quantity: Number(values.quantity),
    unitprice: new Prisma.Decimal(values.unitprice).toDecimalPlaces(2),
    totalamount: computeTotal(values),
    // Optional column, so a blank stays NULL rather than becoming an empty
    // string — otherwise "no invoice number" and "an empty one" look the same.
    invoicenumber: values.invoicenumber === '' ? null : values.invoicenumber,
    invoicedate: new Date(values.invoicedate),
    status: values.status,
  }
}

/**
 * Maps a stored row back into form values so the edit form can be populated.
 * Decimal and Date are flattened to the strings their inputs expect, which also
 * makes the result safe to hand to a Client Component.
 */
export function toPurchaseValues(row: {
  purchasedby: string | null
  p_id: number | null
  productname: string | null
  quantity: number | null
  unitprice: Prisma.Decimal | null
  invoicenumber: string | null
  invoicedate: Date | null
  status: string | null
}): PurchaseValues {
  return {
    purchasedby: row.purchasedby ?? '',
    p_id: row.p_id === null ? '' : String(row.p_id),
    productname: row.productname ?? '',
    quantity: row.quantity === null ? '' : String(row.quantity),
    unitprice: row.unitprice === null ? '' : row.unitprice.toFixed(2),
    invoicenumber: row.invoicenumber ?? '',
    invoicedate: row.invoicedate === null ? '' : row.invoicedate.toISOString().slice(0, 10),
    status: row.status ?? 'Received',
  }
}
