// Field contract for the `retailer_order` + `retailer_order_item` tables.
//
// An order is what a retailer has asked for; it is invoiced later. Orders carry
// no GST — tax is charged on the invoice — and never move stock. As with
// invoices, line totals and the order total are recomputed on the server; the
// browser figures are a preview only.

import { validateNumeric } from '@/lib/form/field'
import { MONEY_RULE, QUANTITY_RULE } from '@/lib/invoice'

export const ORDER_STATUSES = ['Pending', 'Confirmed', 'Invoiced', 'Cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const ORDER_STATUS_TONE: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Confirmed: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  Invoiced: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Cancelled: 'bg-rose-50 text-rose-700 ring-rose-600/20',
}

export interface OrderLineValues {
  p_id: string
  productname: string
  quantity: string
  unitprice: string
}

export interface OrderValues {
  ordernumber: string
  orderdate: string
  ret_id: string
  notes: string
  status: string
  items: OrderLineValues[]
}

export interface OrderFormState {
  /** Suggested number for the next order, returned after a successful save. */
  nextOrderNumber?: string
  status: 'idle' | 'success' | 'error'
  message?: string
  errors: Record<string, string>
  values?: OrderValues
}

export const EMPTY_ORDER_STATE: OrderFormState = { status: 'idle', errors: {} }

export const EMPTY_ORDER_LINE: OrderLineValues = {
  p_id: '',
  productname: '',
  quantity: '1',
  unitprice: '',
}

/** The number and date are filled in by the page, on the server. */
export const EMPTY_ORDER: OrderValues = {
  ordernumber: '',
  orderdate: '',
  ret_id: '',
  notes: '',
  status: 'Pending',
  items: [{ ...EMPTY_ORDER_LINE }],
}

export const NOTES_MAX_LENGTH = 1000

export function orderLineErrorKey(index: number, field: keyof OrderLineValues) {
  return `items.${index}.${field}`
}

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))

export function validateOrder(values: OrderValues): Record<string, string> {
  const errors: Record<string, string> = {}

  if (values.ordernumber === '') {
    errors.ordernumber = 'Order Number is required.'
  } else if (values.ordernumber.length > 100) {
    errors.ordernumber = 'Order Number must be 100 characters or fewer.'
  }

  if (values.orderdate === '') {
    errors.orderdate = 'Order Date is required.'
  } else if (!isDate(values.orderdate)) {
    errors.orderdate = 'Enter a valid date.'
  }

  // Every order comes from a retailer, so unlike an invoice one must be picked.
  if (values.ret_id === '') {
    errors.ret_id = 'Retailer is required.'
  } else if (!/^\d+$/.test(values.ret_id)) {
    errors.ret_id = 'Select a valid retailer.'
  }

  if (values.notes.length > NOTES_MAX_LENGTH) {
    errors.notes = `Notes must be ${NOTES_MAX_LENGTH} characters or fewer.`
  }

  if (!ORDER_STATUSES.includes(values.status as OrderStatus)) {
    errors.status = 'Select a valid status.'
  }

  if (values.items.length === 0) {
    errors.items = 'Add at least one line item.'
  }

  values.items.forEach((line, index) => {
    if (line.productname === '') {
      errors[orderLineErrorKey(index, 'productname')] = 'Product is required.'
    } else if (line.productname.length > 250) {
      errors[orderLineErrorKey(index, 'productname')] = 'Product name must be 250 characters or fewer.'
    }

    if (line.p_id !== '' && !/^\d+$/.test(line.p_id)) {
      errors[orderLineErrorKey(index, 'productname')] = 'Select a valid product.'
    }

    const quantityError = validateNumeric(line.quantity, 'Quantity', QUANTITY_RULE)
    if (line.quantity === '') {
      errors[orderLineErrorKey(index, 'quantity')] = 'Quantity is required.'
    } else if (quantityError) {
      errors[orderLineErrorKey(index, 'quantity')] = quantityError
    }

    const priceError = validateNumeric(line.unitprice, 'Unit Price', MONEY_RULE)
    if (line.unitprice === '') {
      errors[orderLineErrorKey(index, 'unitprice')] = 'Unit Price is required.'
    } else if (priceError) {
      errors[orderLineErrorKey(index, 'unitprice')] = priceError
    }
  })

  return errors
}

/** Line items arrive as parallel repeated fields, zipped back together by index. */
export function readOrderForm(formData: FormData): OrderValues {
  const text = (key: string) => String(formData.get(key) ?? '').trim()
  const all = (key: string) => formData.getAll(key).map((v) => String(v).trim())

  const productnames = all('item_productname')
  const productIds = all('item_p_id')
  const quantities = all('item_quantity')
  const unitprices = all('item_unitprice')

  return {
    ordernumber: text('ordernumber'),
    orderdate: text('orderdate'),
    ret_id: text('ret_id'),
    notes: text('notes'),
    status: text('status'),
    items: productnames.map((productname, index) => ({
      productname,
      p_id: productIds[index] ?? '',
      quantity: quantities[index] ?? '',
      unitprice: unitprices[index] ?? '',
    })),
  }
}
