// Business rules for retailers. Both the REST controller and the server action
// call in here, so validation cannot drift between the two entry points.

import { validateParty } from '@/lib/ledger/party'
import { buildStatement } from '@/lib/ledger/statement'
import { normalizeParty } from '@/api/lib/party'
import {
  findInvoicesByRetailer,
  sumInvoiceTotalsByRetailer,
} from '@/api/repository/invoice.repository'
import { findPaymentsByName, sumPaymentsByName } from '@/api/repository/payment.repository'
import { ApiError, ValidationError } from '@/api/lib/http'
import {
  findRetailerById,
  findRetailers,
  insertRetailer,
  updateRetailer,
} from '@/api/repository/retailer.repository'

export const RETAILER_NAME_LABEL = 'Retailer Name'

/** Normalise and validate; shared by create and edit so the two cannot drift. */
function prepare(input: Record<string, unknown>) {
  const values = normalizeParty(input)
  const errors = validateParty(values, RETAILER_NAME_LABEL)

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors, 'Please correct the highlighted fields.')
  }

  return values
}

export async function createRetailer(input: Record<string, unknown>) {
  return insertRetailer(prepare(input))
}

export async function editRetailer(id: number, input: Record<string, unknown>) {
  const updated = await updateRetailer(id, prepare(input))
  if (!updated) throw new ApiError(`Retailer ${id} was not found.`, 404)
  return updated
}

/**
 * The retailer's ledger: their invoices and the payments recorded under their
 * name. Null when the retailer does not exist.
 */
export async function getRetailerStatement(id: number) {
  const retailer = await findRetailerById(id)
  if (!retailer) return null

  const [invoices, payments] = await Promise.all([
    findInvoicesByRetailer(id),
    findPaymentsByName(retailer.retailername),
  ])

  return { retailer, statement: buildStatement(invoices, payments) }
}

export async function listRetailers(q?: string) {
  return findRetailers(q)
}

/** Whole paise, so the sums match the statement's own arithmetic. */
const toPaise = (value: { toFixed(places: number): string } | null) =>
  value === null ? 0 : Math.round(Number(value.toFixed(2)) * 100)

/**
 * Each retailer with what they owe, in paise: the same rule as their ledger
 * statement (invoices not cancelled, minus payments under their name), worked
 * out with two grouped queries rather than one statement per retailer.
 * Negative means paid in advance.
 */
export async function listRetailersWithBalance(q?: string) {
  const retailers = await findRetailers(q)
  if (retailers.length === 0) return []

  const [invoiced, paid] = await Promise.all([
    sumInvoiceTotalsByRetailer(retailers.map((r) => r.ret_id)),
    sumPaymentsByName([...new Set(retailers.map((r) => r.retailername))]),
  ])

  const invoicedById = new Map(invoiced.map((row) => [row.ret_id, toPaise(row._sum.totalamount)]))
  const paidByName = new Map(paid.map((row) => [row.pay_name, toPaise(row._sum.pay_amt)]))

  return retailers.map((retailer) => {
    const invoicedPaise = invoicedById.get(retailer.ret_id) ?? 0
    const paidPaise = paidByName.get(retailer.retailername) ?? 0
    return { ...retailer, invoicedPaise, paidPaise, balancePaise: invoicedPaise - paidPaise }
  })
}

export async function getRetailer(id: number) {
  return findRetailerById(id)
}
