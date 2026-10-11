// Business rules for retailer orders. Both the REST controller and the server
// actions call in here, so validation cannot drift between the two.

import { ApiError, ValidationError } from '@/api/lib/http'
import { normalizeOrder } from '@/api/lib/order'
import {
  deleteOrder,
  findLastOrderNumber,
  findOrderById,
  findOrders,
  insertOrder,
  type OrderSearch,
  updateOrder,
} from '@/api/repository/order.repository'
import { findRetailerById } from '@/api/repository/retailer.repository'
import { validateOrder } from '@/lib/order'

/**
 * Normalise, validate, and look up the retailer, whose name is snapshotted
 * onto the order. A retailer id that does not exist is reported on the field.
 */
async function prepare(input: Record<string, unknown>) {
  const values = normalizeOrder(input)
  const errors = validateOrder(values)

  if (Object.keys(errors).length === 0) {
    const retailer = await findRetailerById(Number(values.ret_id))
    if (!retailer) errors.ret_id = 'Select a valid retailer.'
    else return { values, retailername: retailer.retailername }
  }

  throw new ValidationError(errors, 'Please correct the highlighted fields.')
}

/** ordernumber is UNIQUE; surface a clash on the field, not as a 500. */
function asNumberError(error: unknown, ordernumber: string) {
  if ((error as { code?: string } | null)?.code === 'P2002') {
    return new ValidationError(
      { ordernumber: `Order Number "${ordernumber}" is already used.` },
      'Please correct the highlighted fields.',
    )
  }
  return error
}

export async function createOrder(input: Record<string, unknown>) {
  const { values, retailername } = await prepare(input)

  try {
    return await insertOrder(values, retailername)
  } catch (error) {
    throw asNumberError(error, values.ordernumber)
  }
}

export async function editOrder(id: number, input: Record<string, unknown>) {
  const { values, retailername } = await prepare(input)

  try {
    const updated = await updateOrder(id, values, retailername)
    if (!updated) throw new ApiError(`Order ${id} was not found.`, 404)
    return updated
  } catch (error) {
    throw asNumberError(error, values.ordernumber)
  }
}

export async function removeOrder(id: number) {
  const removed = await deleteOrder(id)
  if (removed === 0) throw new ApiError(`Order ${id} was not found.`, 404)
}

export async function listOrders(search?: OrderSearch) {
  return findOrders(search)
}

export async function getOrder(id: number) {
  return findOrderById(id)
}

/** Suggests the next number by incrementing the trailing digits of the last one. */
export async function suggestOrderNumber(): Promise<string> {
  const last = await findLastOrderNumber()
  const digits = last?.ordernumber.match(/(\d+)\s*$/)?.[1]

  if (!digits) return 'ORD-00001'
  return `ORD-${String(Number(digits) + 1).padStart(digits.length, '0')}`
}
