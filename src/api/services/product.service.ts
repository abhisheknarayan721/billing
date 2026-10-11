// Business rules for products. Both the REST controller and the server action
// call in here, so validation cannot drift between the two entry points.

import { type ProductSearch, validateProduct } from '@/lib/product'
import { normalizeProduct } from '@/api/lib/product'
import { ApiError, ValidationError } from '@/api/lib/http'
import {
  findProductById,
  findProducts,
  insertProduct,
  updateProduct,
} from '@/api/repository/product.repository'
import { findInvoiceItemsByProduct } from '@/api/repository/invoice.repository'

/** Normalise and validate; shared by create and edit so the two cannot drift. */
function prepare(input: Record<string, unknown>) {
  const values = normalizeProduct(input)
  const errors = validateProduct(values)

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors, 'Please correct the highlighted fields.')
  }

  return values
}

export async function createProduct(input: Record<string, unknown>) {
  return insertProduct(prepare(input))
}

export async function editProduct(id: number, input: Record<string, unknown>) {
  const updated = await updateProduct(id, prepare(input))
  if (!updated) throw new ApiError(`Product ${id} was not found.`, 404)
  return updated
}

export async function listProducts(search?: ProductSearch) {
  return findProducts(search)
}

export async function getProduct(id: number) {
  return findProductById(id)
}

/**
 * One product and every invoice it was billed on. Null when the product does
 * not exist. `from`/`to` limit it to invoices dated in that inclusive
 * `YYYY-MM-DD` range; either may be blank. Cancelled invoices are listed but
 * left out of the totals, as on the retailer ledger.
 */
export async function getProductLedger(id: number, from = '', to = '') {
  const product = await findProductById(id)
  if (!product) return null

  const items = await findInvoiceItemsByProduct(id, from, to)
  const counted = items.filter((item) => item.invoice.status !== 'Cancelled')

  return {
    product,
    items,
    totalQuantity: counted.reduce((sum, item) => sum + item.quantity, 0),
    totalAmountPaise: counted.reduce(
      (sum, item) => sum + Math.round(Number(item.linetotal.toFixed(2)) * 100),
      0,
    ),
  }
}
