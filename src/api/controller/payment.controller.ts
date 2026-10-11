// Translates HTTP <-> the payment service. No Prisma and no business rules here.

import { created, ok, parseBody } from '@/api/lib/http'
import { withErrorHandling } from '@/api/middleware/with-error-handling'
import { createPayment, listPayments } from '@/api/services/payment.service'

export const getPayments = withErrorHandling(async () => {
  return ok(await listPayments())
})

export const postPayment = withErrorHandling(async (request: Request) => {
  const body = await parseBody(request)
  return created(await createPayment(body))
})
