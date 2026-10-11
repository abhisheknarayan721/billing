// Business rules for invoices. Both the REST controller and the server action
// call in here, so validation cannot drift between the two entry points.

import { ApiError, ValidationError } from '@/api/lib/http'
import { normalizeInvoice } from '@/api/lib/invoice'
import {
  findInvoiceById,
  findInvoiceNumbers,
  findInvoices,
  findInvoicesPage as findInvoicePage,
  findInvoicesForPrint,
  findLastInvoiceNumber,
  insertInvoice,
  updateInvoice,
} from '@/api/repository/invoice.repository'
import { validateInvoice } from '@/lib/invoice'
import type { ListSearch } from '@/lib/search'
import { formatAddress } from '@/lib/address'
import { findRetailerById } from '@/api/repository/retailer.repository'

/** Prisma's unique-constraint violation. */
function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'P2002'
}

/**
 * Normalise, validate, and snapshot the customer address. The address is taken
 * at save time so reprinting an old invoice shows it as it was when billed, not
 * as it is today — and re-taken on an edit, since the edit may have moved the
 * invoice to a different customer.
 *
 * Shared by create and edit so the two cannot drift.
 */
async function prepare(input: Record<string, unknown>) {
  const values = normalizeInvoice(input)
  const errors = validateInvoice(values)

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors, 'Please correct the highlighted fields.')
  }

  const retailer =
    values.ret_id === '' ? null : await findRetailerById(Number(values.ret_id))

  return { values, billtoaddress: retailer ? formatAddress(retailer) || null : null }
}

/**
 * invoicenumber carries a UNIQUE constraint; surface it on the field rather
 * than as an opaque 500. Keeping an invoice's own number is not a violation,
 * since the row being updated is the row that holds it.
 */
function asNumberError(error: unknown, invoicenumber: string) {
  if (isUniqueViolation(error)) {
    return new ValidationError(
      { invoicenumber: `Invoice Number "${invoicenumber}" is already used.` },
      'Please correct the highlighted fields.',
    )
  }
  return error
}

export async function createInvoice(input: Record<string, unknown>) {
  const { values, billtoaddress } = await prepare(input)

  try {
    return await insertInvoice(values, billtoaddress)
  } catch (error) {
    throw asNumberError(error, values.invoicenumber)
  }
}

export async function editInvoice(id: number, input: Record<string, unknown>) {
  const { values, billtoaddress } = await prepare(input)

  try {
    const updated = await updateInvoice(id, values, billtoaddress)
    if (!updated) throw new ApiError(`Invoice ${id} was not found.`, 404)
    return updated
  } catch (error) {
    throw asNumberError(error, values.invoicenumber)
  }
}

export async function listInvoices(search?: ListSearch) {
  return findInvoices(search)
}

export async function listInvoicePage(search: ListSearch, skip: number, take: number) {
  return findInvoicePage(search, skip, take)
}

/** Suggests the next number by incrementing the trailing digits of the last one. */
export async function suggestInvoiceNumber(): Promise<string> {
  const last = await findLastInvoiceNumber()
  const digits = last?.invoicenumber.match(/(\d+)\s*$/)?.[1]

  if (!digits) return 'INV-00001'
  return `INV-${String(Number(digits) + 1).padStart(digits.length, '0')}`
}

export async function listInvoiceNumbers() {
  return findInvoiceNumbers()
}

export async function listInvoicesForPrint(
  fromId: number,
  toId: number,
  includeCancelled: boolean,
) {
  return findInvoicesForPrint(fromId, toId, includeCancelled)
}

export async function getInvoice(id: number) {
  return findInvoiceById(id)
}
