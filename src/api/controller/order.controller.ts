// Translates HTTP <-> the order service. No Prisma and no business rules here.

import { created, ok, parseBody } from '@/api/lib/http'
import { withErrorHandling } from '@/api/middleware/with-error-handling'
import { createOrder, listOrders } from '@/api/services/order.service'

export const getOrders = withErrorHandling(async () => {
  return ok(await listOrders())
})

export const postOrder = withErrorHandling(async (request: Request) => {
  const body = await parseBody(request)
  return created(await createOrder(body))
})
