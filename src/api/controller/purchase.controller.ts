// Translates HTTP <-> the purchase service. No Prisma and no business rules here.

import { ApiError, created, ok, parseBody } from '@/api/lib/http'
import { withErrorHandling } from '@/api/middleware/with-error-handling'
import {
  createPurchase,
  editPurchase,
  listPurchases,
} from '@/api/services/purchase.service'

export const getPurchases = withErrorHandling(async () => {
  return ok(await listPurchases())
})

export const postPurchase = withErrorHandling(async (request: Request) => {
  const body = await parseBody(request)
  return created(await createPurchase(body))
})

/**
 * Edits the purchase named by `pur_id` in the body, so the collection endpoint
 * serves updates too and there is no second route file to keep in step.
 */
export const putPurchase = withErrorHandling(async (request: Request) => {
  const body = await parseBody(request)
  const id = String(body.pur_id ?? '').trim()

  if (!/^\d+$/.test(id)) {
    throw new ApiError('A numeric pur_id is required to update a purchase.', 400)
  }

  return ok(await editPurchase(Number(id), body))
})
