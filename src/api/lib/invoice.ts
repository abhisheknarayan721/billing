// Normalising and money maths for invoices.

import { Prisma } from '@/generated/prisma/client'
import {
  DEFAULT_LINE_RATE,
  EMPTY_LINE,
  type InvoiceLineValues,
  type InvoiceValues,
} from '@/lib/invoice'

export function normalizeInvoice(input: Record<string, unknown>): InvoiceValues {
  const text = (value: unknown) => String(value ?? '').trim()
  const rawItems = Array.isArray(input.items) ? input.items : []

  // Rates belong to each line now. A caller still sending invoice-level
  // `cgstrate` / `sgstrate` has them applied to every line that does not give
  // its own, and one still sending a single combined `taxrate` has it split
  // evenly into CGST and SGST, as GST within a state is.
  const legacyRate = text(input.taxrate)
  const halfOfLegacy = () =>
    Number.isFinite(Number(legacyRate)) ? String(Number(legacyRate) / 2) : legacyRate
  const invoiceRate = (value: unknown) =>
    text(value) !== '' || legacyRate === '' ? text(value) : halfOfLegacy()
  const cgstFallback = invoiceRate(input.cgstrate)
  const sgstFallback = invoiceRate(input.sgstrate)

  return {
    invoicenumber: text(input.invoicenumber),
    invoicedate: text(input.invoicedate),
    ret_id: text(input.ret_id),
    billto: text(input.billto),
    // An API caller that sends only `taxamount` gets the old behaviour: a flat
    // figure, taken as given.
    taxmode: text(input.taxmode) === 'rate' ? 'rate' : 'amount',
    taxamount: text(input.taxamount),
    status: text(input.status) || 'Draft',
    items: rawItems.map((raw): InvoiceLineValues => {
      const item = (raw ?? {}) as Record<string, unknown>
      return {
        p_id: text(item.p_id),
        productname: text(item.productname),
        quantity: text(item.quantity) || EMPTY_LINE.quantity,
        unitprice: text(item.unitprice),
        // A blank rate is no GST, saved as 0.00.
        cgstrate: text(item.cgstrate) || cgstFallback || DEFAULT_LINE_RATE,
        sgstrate: text(item.sgstrate) || sgstFallback || DEFAULT_LINE_RATE,
      }
    }),
  }
}

/**
 * Maps a stored invoice and its items back into form values, so the edit page
 * can populate the form. Decimal and Date are flattened to the strings their
 * inputs expect, which also makes the result safe to hand to a Client
 * Component.
 */
export function toInvoiceValues(row: {
  invoicenumber: string
  invoicedate: Date
  ret_id: number | null
  billto: string
  taxamount: Prisma.Decimal
  status: string
  invoice_item: {
    p_id: number | null
    productname: string
    quantity: number
    unitprice: Prisma.Decimal
    cgstrate: Prisma.Decimal
    sgstrate: Prisma.Decimal
  }[]
}): InvoiceValues {
  // Lines saved before rates moved onto them were given their invoice's rates
  // by the migration that added the columns, so they reopen charging the same.
  return {
    invoicenumber: row.invoicenumber,
    invoicedate: row.invoicedate.toISOString().slice(0, 10),
    ret_id: row.ret_id === null ? '' : String(row.ret_id),
    billto: row.billto,
    taxmode: 'rate',
    taxamount: row.taxamount.toFixed(2),
    status: row.status,
    // An invoice always has at least one line, but a row saved before that rule
    // existed would otherwise open with no line at all to edit.
    items:
      row.invoice_item.length === 0
        ? [{ ...EMPTY_LINE }]
        : row.invoice_item.map((item) => ({
            p_id: item.p_id === null ? '' : String(item.p_id),
            productname: item.productname,
            quantity: String(item.quantity),
            unitprice: item.unitprice.toFixed(2),
            cgstrate: item.cgstrate.toFixed(2),
            sgstrate: item.sgstrate.toFixed(2),
          })),
  }
}

export interface InvoiceTotals {
  /** Exactly the invoice_item columns, so they can be written as they are. */
  lines: {
    p_id: number | null
    productname: string
    quantity: number
    unitprice: Prisma.Decimal
    cgstrate: Prisma.Decimal
    sgstrate: Prisma.Decimal
    linetotal: Prisma.Decimal
  }[]
  subtotal: Prisma.Decimal
  /** The rate every line shares, or 0 when the lines differ (see `commonRate`). */
  cgstrate: Prisma.Decimal
  cgstamount: Prisma.Decimal
  sgstrate: Prisma.Decimal
  sgstamount: Prisma.Decimal
  /** Always cgstamount + sgstamount, except for a flat figure from the API. */
  taxamount: Prisma.Decimal
  totalamount: Prisma.Decimal
}

/**
 * The invoice row keeps one CGST and one SGST rate. With rates now set per
 * line that is only meaningful when every line agrees, so mixed rates store 0.
 */
function commonRate(rates: Prisma.Decimal[]): Prisma.Decimal {
  const [first] = rates
  return first !== undefined && rates.every((rate) => rate.equals(first))
    ? first
    : new Prisma.Decimal(0)
}

/**
 * Recomputed server-side from quantity x unit price. Prisma.Decimal (decimal.js)
 * is used rather than JS numbers so money never picks up binary float error —
 * 0.1 + 0.2 must be 0.30, not 0.30000000000000004.
 */
export function computeTotals(values: InvoiceValues): InvoiceTotals {
  const byRate = values.taxmode === 'rate'
  const rate = (value: string) => new Prisma.Decimal(byRate && value !== '' ? value : 0)

  const lines = values.items.map((line) => {
    const unitprice = new Prisma.Decimal(line.unitprice)
    const quantity = Number(line.quantity)
    return {
      p_id: line.p_id === '' ? null : Number(line.p_id),
      productname: line.productname,
      quantity,
      unitprice,
      cgstrate: rate(line.cgstrate),
      sgstrate: rate(line.sgstrate),
      linetotal: unitprice.mul(quantity).toDecimalPlaces(2),
    }
  })

  const sum = (amounts: Prisma.Decimal[]) =>
    amounts.reduce((total, amount) => total.add(amount), new Prisma.Decimal(0)).toDecimalPlaces(2)

  const subtotal = sum(lines.map((line) => line.linetotal))

  // Each line is taxed at its own rates, applied here rather than trusting the
  // figures the browser previewed, for the same reason the line totals are
  // recomputed. Every line's tax is rounded on its own before summing.
  const taxOf = (line: (typeof lines)[number], key: 'cgstrate' | 'sgstrate') =>
    line.linetotal.mul(line[key]).div(100).toDecimalPlaces(2)
  const cgstamount = sum(lines.map((line) => taxOf(line, 'cgstrate')))
  const sgstamount = sum(lines.map((line) => taxOf(line, 'sgstrate')))
  const taxamount = byRate
    ? cgstamount.add(sgstamount)
    : new Prisma.Decimal(values.taxamount === '' ? 0 : values.taxamount).toDecimalPlaces(2)

  // GST is added to the subtotal. The grand total is rounded to the nearest
  // whole rupee (half up). The round-off is not stored: it is always
  // totalamount - (subtotal + taxamount).
  return {
    lines,
    subtotal,
    cgstrate: commonRate(lines.map((line) => line.cgstrate)),
    cgstamount,
    sgstrate: commonRate(lines.map((line) => line.sgstrate)),
    sgstamount,
    taxamount,
    totalamount: subtotal.add(taxamount).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP),
  }
}
