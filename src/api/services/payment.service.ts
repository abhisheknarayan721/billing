// Business rules for payments. Both the REST controller and the server action
// call in here, so validation cannot drift between the two entry points.

import { validatePayment } from '@/lib/payment'
import type { ListSearch } from '@/lib/search'
import type { SelectOption } from '@/lib/form/field'
import { normalizePayment, toPartyOptions } from '@/api/lib/payment'
import { ApiError, ValidationError } from '@/api/lib/http'
import {
  findPaymentById,
  findPayments,
  insertPayment,
  updatePayment,
} from '@/api/repository/payment.repository'
import { findSuppliers } from '@/api/repository/supplier.repository'
import { findRetailers } from '@/api/repository/retailer.repository'

/**
 * Who a payment can be recorded against: every current supplier and retailer.
 * `keepName` adds the name an existing payment already carries, so a payment
 * whose party was since renamed or removed can still be edited without being
 * forced onto someone else.
 */
export async function listPaymentParties(keepName?: string): Promise<SelectOption[]> {
  const [suppliers, retailers] = await Promise.all([findSuppliers(), findRetailers()])
  const options = toPartyOptions(suppliers, retailers)

  if (keepName && !options.some((option) => option.value === keepName)) {
    options.unshift({ value: keepName, label: `${keepName} (current)` })
  }
  return options
}

/** Normalise and validate against the live party list; shared by create and edit. */
async function prepare(input: Record<string, unknown>, keepName?: string) {
  const values = normalizePayment(input)
  const errors = validatePayment(values, await listPaymentParties(keepName))

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors, 'Please correct the highlighted fields.')
  }

  return values
}

export async function createPayment(input: Record<string, unknown>) {
  return insertPayment(await prepare(input))
}

export async function editPayment(id: number, input: Record<string, unknown>) {
  const existing = await findPaymentById(id)
  if (!existing) throw new ApiError(`Payment ${id} was not found.`, 404)

  const updated = await updatePayment(id, await prepare(input, existing.pay_name))
  if (!updated) throw new ApiError(`Payment ${id} was not found.`, 404)
  return updated
}

export async function listPayments(search?: ListSearch) {
  return findPayments(search)
}

export async function getPayment(id: number) {
  return findPaymentById(id)
}
