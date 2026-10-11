'use server'

import { revalidatePath } from 'next/cache'

import { ValidationError } from '@/api/lib/http'
import {
  createPurchases as createPurchaseRecords,
  editPurchaseLines as editPurchaseRecords,
} from '@/api/services/purchase.service'
import { requireAdmin } from '@/lib/auth/session'
import {
  EMPTY_PURCHASE_STATE,
  readPurchaseForm,
  type PurchaseFormState,
  type PurchaseFormValues,
} from '@/lib/purchase'

/**
 * Validation, persistence and the stock adjustment live in
 * src/api/services/purchase.service, so the form and the REST endpoints under
 * /api/purchases share one implementation. These actions only translate between
 * FormData and the shape useActionState expects.
 */
function toErrorState(
  error: unknown,
  values: PurchaseFormValues,
  fallback: string,
  context: string,
): PurchaseFormState {
  if (error instanceof ValidationError) {
    return { status: 'error', errors: error.errors, values, message: error.message }
  }
  console.error(context, error)
  return { status: 'error', errors: {}, values, message: fallback }
}

/** Stock moved, so anything showing a product or a purchase is now stale. */
function revalidatePurchase(ids: number[]) {
  revalidatePath('/purchase')
  revalidatePath('/purchase/list')
  revalidatePath('/product')
  revalidatePath('/product/[p_id]/edit', 'page')
  for (const id of ids) revalidatePath(`/purchase/${id}/edit`)
}

/** "3 lines", "1 line" — used in the messages below. */
function lineCount(count: number) {
  return `${count} ${count === 1 ? 'line' : 'lines'}`
}

export async function createPurchase(
  _prevState: PurchaseFormState,
  formData: FormData,
): Promise<PurchaseFormState> {
  await requireAdmin()

  const values = readPurchaseForm(formData)

  try {
    const records = await createPurchaseRecords({ ...values })
    revalidatePurchase(records.map((record) => record.pur_id))

    // Only catalogue lines move stock; hand-typed ones have no product behind
    // them, and a cancelled bill delivered nothing at all.
    const credited = records.filter(
      (record) => record.p_id !== null && record.status !== 'Cancelled',
    )

    return {
      ...EMPTY_PURCHASE_STATE,
      savedPurchaseIds: records.map((record) => record.pur_id),
      status: 'success',
      message:
        `Purchase saved — ${lineCount(records.length)} recorded. ` +
        (credited.length === 0
          ? 'No stock was added.'
          : `Stock added to ${credited
              .map((record) => `"${record.productname}" (+${record.quantity})`)
              .join(', ')}.`),
    }
  } catch (error) {
    return toErrorState(
      error,
      values,
      'Could not save the purchase. Please try again.',
      '[createPurchase]',
    )
  }
}

/**
 * `pur_id` is bound on the server when the edit page renders it, so the id the
 * update runs against never travels through the form where it could be tampered
 * with.
 *
 * The first line rewrites that row; any further lines are products added to the
 * same bill, which — one row per line being how a purchase is stored — become
 * rows of their own.
 */
export async function updatePurchase(
  purchaseId: number,
  _prevState: PurchaseFormState,
  formData: FormData,
): Promise<PurchaseFormState> {
  await requireAdmin()

  const values = readPurchaseForm(formData)

  try {
    const { updated, added } = await editPurchaseRecords(purchaseId, { ...values })
    revalidatePurchase([updated.pur_id, ...added.map((record) => record.pur_id)])

    return {
      ...EMPTY_PURCHASE_STATE,
      savedPurchaseIds: [updated.pur_id, ...added.map((record) => record.pur_id)],
      status: 'success',
      // The stock figures are deltas here, so they are deliberately not quoted
      // back — the product page shows the authoritative numbers.
      message:
        `Purchase ${updated.pur_id} updated — "${updated.productname}" stock adjusted to match.` +
        (added.length === 0
          ? ''
          : ` ${lineCount(added.length)} added to the same bill (ID ${added
              .map((record) => record.pur_id)
              .join(', ')}).`),
      values,
    }
  } catch (error) {
    return toErrorState(
      error,
      values,
      'Could not update the purchase. Please try again.',
      '[updatePurchase]',
    )
  }
}
