// Mapping between the product field contract and database rows.

import { normalizeInput } from '@/lib/form/field'
import { PRODUCT_FIELDS, type ProductValues } from '@/lib/product'
import { toTitleCase } from '@/lib/text'

export function normalizeProduct(input: Record<string, unknown>): ProductValues {
  return normalizeInput(input, PRODUCT_FIELDS)
}

function productColumns(values: ProductValues) {
  // p_stock is the one column with a DEFAULT (0). Sending an explicit NULL
  // would override it, so a blank value omits the key and lets Postgres apply
  // the default on insert — and on an edit it leaves the stock untouched, which
  // is what should happen, since purchases are what move it. p_price and
  // p_mrp are nullable with no default, so blank is a real NULL.
  const stock = values.p_stock === '' ? {} : { p_stock: Number(values.p_stock) }

  return {
    // Stored in Title Case whatever case it was typed in.
    p_name: toTitleCase(values.p_name),
    // Passed as a string so DECIMAL(18,2) keeps full precision — going via a
    // JS number would round anything past 15 significant digits.
    p_price: values.p_price === '' ? null : values.p_price,
    p_mrp: values.p_mrp === '' ? null : values.p_mrp,
    // NOT NULL, so a cleared rate is saved as 0.00 rather than rejected.
    p_cgst: values.p_cgst === '' ? '0' : values.p_cgst,
    p_sgst: values.p_sgst === '' ? '0' : values.p_sgst,
    ...stock,
  }
}

export function toProductRow(values: ProductValues) {
  const now = new Date()
  return { ...productColumns(values), createddate: now, updateddate: now }
}

/** The same columns for an edit: createddate belongs to the original insert. */
export function toProductUpdateRow(values: ProductValues) {
  return { ...productColumns(values), updateddate: new Date() }
}
