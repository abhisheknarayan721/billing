// Field contract for the `purchase` table.
//
// A purchase is the counterpart to an invoice: goods coming IN rather than
// going out. Saving a line adds its quantity to the linked product's stock.
//
// One supplier bill often covers several products, so the FORM works in lines
// while the TABLE still stores one row per line — the rows a single submission
// produces share their supplier, invoice number, date and status.
// `PurchaseValues` is the shape of one stored row (and of the REST payload);
// `PurchaseFormValues` is the shape of the form that produces them.
//
// A line either points at a catalogue product (`p_id`, whose stock moves and
// whose name is snapshotted so renaming it later does not rewrite purchase
// history) or is typed by hand — a one-off with no catalogue entry, stored with
// a null `p_id` and moving no stock.
//
//   purchasedby   VARCHAR(250)
//   p_id          INT          -> FK to product, the row whose stock moves
//   productname   VARCHAR(250)
//   quantity      INT          -> int4, capped at 2147483647
//   unitprice     DECIMAL(18,2)
//   totalamount   DECIMAL(18,2) -> never read from the client, always recomputed
//   invoicenumber VARCHAR(100)
//   invoicedate   TIMESTAMP
//   status        VARCHAR(50)

import { type NumericRule, validateNumeric } from '@/lib/form/field'

export const PURCHASE_STATUSES = ['Received', 'Ordered', 'Cancelled'] as const
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number]

/** DECIMAL(18,2): 16 digits before the point, 2 after, never negative. */
export const MONEY_RULE: NumericRule = { min: 0, decimals: 2, maxIntegerDigits: 16 }
export const QUANTITY_RULE: NumericRule = { integer: true, min: 1, max: 2147483647 }

/** One stored `purchase` row. */
export interface PurchaseValues {
  purchasedby: string
  p_id: string
  productname: string
  quantity: string
  unitprice: string
  invoicenumber: string
  invoicedate: string
  status: string
}

/** One product line as the form holds it, before the shared fields are added. */
export interface PurchaseLineValues {
  p_id: string
  productname: string
  quantity: string
  unitprice: string
}

/** The whole form: the fields every line shares, plus the lines themselves. */
export interface PurchaseFormValues {
  purchasedby: string
  invoicenumber: string
  invoicedate: string
  status: string
  lines: PurchaseLineValues[]
}

export interface PurchaseFormState {
  /** Ids of the rows just saved, so the form can link straight to their edit pages. */
  savedPurchaseIds?: number[]
  status: 'idle' | 'success' | 'error'
  message?: string
  errors: Record<string, string>
  values?: PurchaseFormValues
}

export const EMPTY_PURCHASE_STATE: PurchaseFormState = { status: 'idle', errors: {} }

export const EMPTY_PURCHASE_LINE: PurchaseLineValues = {
  p_id: '',
  productname: '',
  quantity: '1',
  unitprice: '',
}

export const EMPTY_PURCHASE_FORM: PurchaseFormValues = {
  purchasedby: '',
  invoicenumber: '',
  invoicedate: '',
  status: 'Received',
  lines: [{ ...EMPTY_PURCHASE_LINE }],
}

/** Errors on a line are keyed by position, so each row shows only its own. */
export function lineErrorKey(index: number, field: keyof PurchaseLineValues) {
  return `lines.${index}.${field}`
}

/**
 * How much this purchase contributes to the product's stock. A cancelled
 * purchase never delivered anything, so it contributes nothing — and because
 * edits are applied as (new contribution - old contribution), switching a saved
 * purchase to Cancelled takes the stock back off again. A hand-typed line has
 * no product behind it, so its contribution goes nowhere either way.
 */
export function stockContribution(status: string, quantity: number): number {
  if (status === 'Cancelled') return 0
  return Number.isFinite(quantity) ? quantity : 0
}

/** Checks for one product line, wherever it came from. */
function validateLine(
  line: PurchaseLineValues,
  errors: Record<string, string>,
  key: (field: keyof PurchaseLineValues) => string,
) {
  if (line.p_id !== '' && !/^\d+$/.test(line.p_id)) {
    errors[key('p_id')] = 'Select a valid product.'
  }

  // A line is either a catalogue product or typed by hand; the name identifies
  // it either way, so the name is what has to be there.
  if (line.productname === '') {
    errors[key('productname')] = 'Product is required.'
  } else if (line.productname.length > 250) {
    errors[key('productname')] = 'Product name must be 250 characters or fewer.'
  }

  const quantityError = validateNumeric(line.quantity, 'Quantity', QUANTITY_RULE)
  if (line.quantity === '') {
    errors[key('quantity')] = 'Quantity is required.'
  } else if (quantityError) {
    errors[key('quantity')] = quantityError
  }

  const priceError = validateNumeric(line.unitprice, 'Unit Price', MONEY_RULE)
  if (line.unitprice === '') {
    errors[key('unitprice')] = 'Unit Price is required.'
  } else if (priceError) {
    errors[key('unitprice')] = priceError
  }
}

/** Checks for the fields a whole purchase shares, however it arrived. */
function validateShared(
  values: {
    purchasedby: string
    invoicenumber: string
    invoicedate: string
    status: string
  },
  errors: Record<string, string>,
) {
  if (values.purchasedby === '') {
    errors.purchasedby = 'Purchased By is required.'
  } else if (values.purchasedby.length > 250) {
    errors.purchasedby = 'Purchased By must be 250 characters or fewer.'
  }

  if (values.invoicenumber !== '' && values.invoicenumber.length > 100) {
    errors.invoicenumber = 'Invoice Number must be 100 characters or fewer.'
  }

  if (values.invoicedate === '') {
    errors.invoicedate = 'Purchase Date is required.'
  } else if (Number.isNaN(Date.parse(values.invoicedate))) {
    errors.invoicedate = 'Enter a valid date.'
  }

  if (!PURCHASE_STATUSES.includes(values.status as PurchaseStatus)) {
    errors.status = 'Select a valid status.'
  }
}

/** Validates one stored row: the REST payload, and an edit of a single row. */
export function validatePurchase(values: PurchaseValues): Record<string, string> {
  const errors: Record<string, string> = {}

  validateShared(values, errors)
  validateLine(values, errors, (field) => field)

  return errors
}

/** Validates a multi-line submission before any of its rows are written. */
export function validatePurchaseForm(
  values: PurchaseFormValues,
): Record<string, string> {
  const errors: Record<string, string> = {}

  validateShared(values, errors)

  if (values.lines.length === 0) {
    errors.lines = 'Add at least one product line.'
  }

  values.lines.forEach((line, index) => {
    validateLine(line, errors, (field) => lineErrorKey(index, field))
  })

  return errors
}

/** Expands a submitted form into the rows it saves, one per line. */
export function toPurchaseRows(values: PurchaseFormValues): PurchaseValues[] {
  return values.lines.map((line) => ({
    purchasedby: values.purchasedby,
    p_id: line.p_id,
    productname: line.productname,
    quantity: line.quantity,
    unitprice: line.unitprice,
    invoicenumber: values.invoicenumber,
    invoicedate: values.invoicedate,
    status: values.status,
  }))
}

/** The reverse, for the edit page: one stored row shown as a one-line form. */
export function toPurchaseForm(values: PurchaseValues): PurchaseFormValues {
  return {
    purchasedby: values.purchasedby,
    invoicenumber: values.invoicenumber,
    invoicedate: values.invoicedate,
    status: values.status,
    lines: [
      {
        p_id: values.p_id,
        productname: values.productname,
        quantity: values.quantity,
        unitprice: values.unitprice,
      },
    ],
  }
}

/** Lines arrive as parallel repeated fields, zipped back together by index. */
export function readPurchaseForm(formData: FormData): PurchaseFormValues {
  const text = (key: string) => String(formData.get(key) ?? '').trim()
  const all = (key: string) => formData.getAll(key).map((value) => String(value).trim())

  const productIds = all('item_p_id')
  const productnames = all('item_productname')
  const quantities = all('item_quantity')
  const unitprices = all('item_unitprice')

  return {
    purchasedby: text('purchasedby'),
    invoicenumber: text('invoicenumber'),
    invoicedate: text('invoicedate'),
    status: text('status'),
    lines: productnames.map((productname, index) => ({
      p_id: productIds[index] ?? '',
      productname,
      quantity: quantities[index] ?? '',
      unitprice: unitprices[index] ?? '',
    })),
  }
}
