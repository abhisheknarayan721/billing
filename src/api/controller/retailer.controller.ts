// Translates HTTP <-> the retailer service. No Prisma and no business rules here.

import { created, ok, parseBody } from '@/api/lib/http'
import { withErrorHandling } from '@/api/middleware/with-error-handling'
import { createRetailer, listRetailers } from '@/api/services/retailer.service'

export const getRetailers = withErrorHandling(async () => {
  return ok(await listRetailers())
})

export const postRetailer = withErrorHandling(async (request: Request) => {
  const body = await parseBody(request)
  return created(await createRetailer(body))
})
