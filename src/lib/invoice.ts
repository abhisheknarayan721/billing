// Field contract for the `invoice` + `invoice_item` tables.
//
// Totals are NEVER taken from the client: subtotal, line totals and the grand
// total are recomputed on the server from quantity x unit price. The browser
// figures shown while typing are a preview only.

import { type NumericRule, validateNumeric } from '@/lib/form/field'

export const INVOICE_STATUSES = ['Draft', 'Sent', 'Paid', 'Cancelled'] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

/**
 * Tax is charged either line by line, as each line's CGST + SGST percentages of
 * its amount, or as a flat figure. The invoice stores the summed CGST and SGST
 * amounts; `taxamount` is always their sum. A flat figure (API callers only) is
 * stored as `taxamount` with no CGST/SGST split.
 */
export type TaxMode = 'rate' | 'amount'

/** A line's rates until a product is picked, which fills in that product's. */
export const DEFAULT_LINE_RATE = '0.00'

/** A percentage, so 0-100 with the same two decimal places money has. */
export const TAX_RATE_RULE: NumericRule = { min: 0, max: 100, decimals: 2 }

/** DECIMAL(18,2): 16 digits before the point, 2 after, never negative. */
export const MONEY_RULE: NumericRule = { min: 0, decimals: 2, maxIntegerDigits: 16 }
export const QUANTITY_RULE: NumericRule = { integer: true, min: 1, max: 2147483647 }

export interface InvoiceLineValues {
  p_id: string
  productname: string
  quantity: string
  unitprice: string
  /** Percentages of this line's amount, used when taxmode is 'rate'. */
  cgstrate: string
  sgstrate: string
}

export interface InvoiceValues {
  invoicenumber: string
  invoicedate: string
  ret_id: string
  billto: string
  /** Whether tax comes from the lines' CGST/SGST rates or the flat `taxamount`. */
  taxmode: TaxMode
  /** Flat figure, used when taxmode is 'amount'. */
  taxamount: string
  status: string
  items: InvoiceLineValues[]
}

export interface InvoiceFormState {
  /** Suggested number for the next invoice, returned after a successful save. */
  nextInvoiceNumber?: string
  /** Id of the invoice just saved, so the form can link to its printable bill. */
  savedInvoiceId?: number
  status: 'idle' | 'success' | 'error'
  message?: string
  errors: Record<string, string>
  values?: InvoiceValues
}

export const EMPTY_INVOICE_STATE: InvoiceFormState = { status: 'idle', errors: {} }

export const EMPTY_LINE: InvoiceLineValues = {
  p_id: '',
  productname: '',
  quantity: '1',
  unitprice: '',
  cgstrate: DEFAULT_LINE_RATE,
  sgstrate: DEFAULT_LINE_RATE,
}

/**
 * A blank invoice. The number and the date are filled in by the page that
 * renders the form: both come from the server, so the value in the SSR markup
 * and the value after hydration agree.
 */
export const EMPTY_INVOICE: InvoiceValues = {
  invoicenumber: '',
  invoicedate: '',
  ret_id: '',
  billto: '',
  taxmode: 'rate',
  taxamount: '',
  status: 'Draft',
  items: [{ ...EMPTY_LINE }],
}

/**
 * How much of a line leaves stock when the invoice is saved. A cancelled
 * invoice never shipped, so it takes nothing — and because an edit is applied
 * as (what the saved version took back) minus (what this version takes),
 * cancelling a saved invoice puts its goods back on the shelf.
 *
 * Only lines pointing at a catalogue product move anything; a hand-typed line
 * has no product whose stock could change.
 */
export function stockContribution(status: string, quantity: number): number {
  if (status === 'Cancelled') return 0
  return Number.isFinite(quantity) ? quantity : 0
}

export function lineErrorKey(index: number, field: keyof InvoiceLineValues) {
  return `items.${index}.${field}`
}

export function validateInvoice(values: InvoiceValues): Record<string, string> {
  const errors: Record<string, string> = {}

  if (values.invoicenumber === '') {
    errors.invoicenumber = 'Invoice Number is required.'
  } else if (values.invoicenumber.length > 100) {
    errors.invoicenumber = 'Invoice Number must be 100 characters or fewer.'
  }

  if (values.invoicedate === '') {
    errors.invoicedate = 'Invoice Date is required.'
  } else if (Number.isNaN(Date.parse(values.invoicedate))) {
    errors.invoicedate = 'Enter a valid date.'
  }

  if (values.billto === '') {
    errors.billto = 'Bill To is required.'
  } else if (values.billto.length > 250) {
    errors.billto = 'Bill To must be 250 characters or fewer.'
  }

  if (values.ret_id !== '' && !/^\d+$/.test(values.ret_id)) {
    errors.ret_id = 'Select a valid retailer.'
  }

  if (values.taxmode === 'amount' && values.taxamount !== '') {
    const error = validateNumeric(values.taxamount, 'Tax Amount', MONEY_RULE)
    if (error) errors.taxamount = error
  }

  if (!INVOICE_STATUSES.includes(values.status as InvoiceStatus)) {
    errors.status = 'Select a valid status.'
  }

  if (values.items.length === 0) {
    errors.items = 'Add at least one line item.'
  }

  values.items.forEach((line, index) => {
    if (line.productname === '') {
      errors[lineErrorKey(index, 'productname')] = 'Product is required.'
    } else if (line.productname.length > 250) {
      errors[lineErrorKey(index, 'productname')] = 'Product name must be 250 characters or fewer.'
    }

    const quantityError = validateNumeric(line.quantity, 'Quantity', QUANTITY_RULE)
    if (line.quantity === '') {
      errors[lineErrorKey(index, 'quantity')] = 'Quantity is required.'
    } else if (quantityError) {
      errors[lineErrorKey(index, 'quantity')] = quantityError
    }

    const priceError = validateNumeric(line.unitprice, 'Unit Price', MONEY_RULE)
    if (line.unitprice === '') {
      errors[lineErrorKey(index, 'unitprice')] = 'Unit Price is required.'
    } else if (priceError) {
      errors[lineErrorKey(index, 'unitprice')] = priceError
    }

    if (values.taxmode === 'rate') {
      for (const [field, label] of [['cgstrate', 'CGST'], ['sgstrate', 'SGST']] as const) {
        if (line[field] === '') continue
        const error = validateNumeric(line[field], label, TAX_RATE_RULE)
        if (error) errors[lineErrorKey(index, field)] = error
      }
    }

    if (line.p_id !== '' && !/^\d+$/.test(line.p_id)) {
      errors[lineErrorKey(index, 'p_id')] = 'Select a valid product.'
    }
  })

  return errors
}

/** Line items arrive as parallel repeated fields, zipped back together by index. */
export function readInvoiceForm(formData: FormData): InvoiceValues {
  const text = (key: string) => String(formData.get(key) ?? '').trim()
  const all = (key: string) => formData.getAll(key).map((v) => String(v).trim())

  const productnames = all('item_productname')
  const quantities = all('item_quantity')
  const unitprices = all('item_unitprice')
  const productIds = all('item_p_id')
  const cgstrates = all('item_cgstrate')
  const sgstrates = all('item_sgstrate')

  return {
    invoicenumber: text('invoicenumber'),
    invoicedate: text('invoicedate'),
    ret_id: text('ret_id'),
    billto: text('billto'),
    taxmode: text('taxmode') === 'amount' ? 'amount' : 'rate',
    taxamount: text('taxamount'),
    status: text('status'),
    items: productnames.map((productname, index) => ({
      productname,
      quantity: quantities[index] ?? '',
      unitprice: unitprices[index] ?? '',
      p_id: productIds[index] ?? '',
      cgstrate: cgstrates[index] ?? '',
      sgstrate: sgstrates[index] ?? '',
    })),
  }
}
