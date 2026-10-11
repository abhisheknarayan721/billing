// Business rules for purchases. Both the REST controller and the server actions
// call in here, so validation cannot drift between the two entry points.

import { ApiError, ValidationError } from '@/api/lib/http'
import { normalizePurchase, normalizePurchaseForm } from '@/api/lib/purchase'
import {
  findPurchaseById,
  findPurchases,
  insertPurchase,
  insertPurchases,
  updatePurchase as updatePurchaseRow,
  updatePurchaseWithAdditions,
} from '@/api/repository/purchase.repository'
import { findProductById } from '@/api/repository/product.repository'
import {
  lineErrorKey,
  toPurchaseRows,
  validatePurchase,
  validatePurchaseForm,
  type PurchaseValues,
} from '@/lib/purchase'

/** Prisma's "related record not found" — here, a p_id with no product behind it. */
function isMissingRelation(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  return code === 'P2025' || code === 'P2003'
}

/**
 * Settles what name a row is stored under. A line pointing at the catalogue has
 * its name snapshotted from the product, so the stored row always agrees with
 * the product whose stock it credited; a hand-typed line keeps the name as
 * entered, since there is no catalogue entry to disagree with.
 *
 * The product is looked up before the write rather than left to the foreign
 * key, so a stale dropdown option comes back as a field error on that line
 * instead of an opaque 500.
 */
async function resolveProduct(
  values: PurchaseValues,
  errorKey: string,
): Promise<PurchaseValues> {
  if (values.p_id === '') return values

  const product = await findProductById(Number(values.p_id))
  if (!product) {
    throw new ValidationError(
      { [errorKey]: 'That product no longer exists.' },
      'Please correct the highlighted fields.',
    )
  }

  return { ...values, productname: product.p_name }
}

/** Shared front half of create and update for a single row. */
async function prepare(input: Record<string, unknown>) {
  const values = normalizePurchase(input)
  const errors = validatePurchase(values)

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors, 'Please correct the highlighted fields.')
  }

  return resolveProduct(values, 'p_id')
}

export async function createPurchase(input: Record<string, unknown>) {
  const values = await prepare(input)

  try {
    return await insertPurchase(values)
  } catch (error) {
    if (isMissingRelation(error)) {
      throw new ValidationError(
        { p_id: 'That product no longer exists.' },
        'Please correct the highlighted fields.',
      )
    }
    throw error
  }
}

/**
 * Validates a multi-line submission and settles every product on it BEFORE
 * anything is written, so a bad line cannot leave the first half of the bill
 * saved.
 */
async function prepareLines(input: Record<string, unknown>) {
  const values = normalizePurchaseForm(input)
  const errors = validatePurchaseForm(values)

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors, 'Please correct the highlighted fields.')
  }

  return Promise.all(
    toPurchaseRows(values).map((row, index) =>
      resolveProduct(row, lineErrorKey(index, 'p_id')),
    ),
  )
}

/** A stale dropdown option, reported against the whole line set. */
function asLineError(error: unknown) {
  if (isMissingRelation(error)) {
    return new ValidationError(
      { lines: 'One of those products no longer exists.' },
      'Please correct the highlighted fields.',
    )
  }
  return error
}

/** One supplier bill covering several products; the rows go in one transaction. */
export async function createPurchases(input: Record<string, unknown>) {
  const rows = await prepareLines(input)

  try {
    return await insertPurchases(rows)
  } catch (error) {
    throw asLineError(error)
  }
}

/**
 * Editing a saved line, with any further lines added to the same bill. The
 * stored row keeps the first line and the rest become rows of their own — one
 * row per product is how a purchase is stored, so adding products to a bill
 * means adding rows to it.
 */
export async function editPurchaseLines(id: number, input: Record<string, unknown>) {
  const [first, ...additions] = await prepareLines(input)

  try {
    const result = await updatePurchaseWithAdditions(id, first, additions)
    if (!result) throw new ApiError(`Purchase ${id} was not found.`, 404)
    return result
  } catch (error) {
    throw asLineError(error)
  }
}

export async function editPurchase(id: number, input: Record<string, unknown>) {
  const values = await prepare(input)

  try {
    const updated = await updatePurchaseRow(id, values)
    if (!updated) throw new ApiError(`Purchase ${id} was not found.`, 404)
    return updated
  } catch (error) {
    if (isMissingRelation(error)) {
      throw new ValidationError(
        { p_id: 'That product no longer exists.' },
        'Please correct the highlighted fields.',
      )
    }
    throw error
  }
}

export async function listPurchases() {
  return findPurchases()
}

export async function getPurchase(id: number) {
  return findPurchaseById(id)
}
