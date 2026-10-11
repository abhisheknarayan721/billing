// Translates HTTP <-> the supplier service. No Prisma and no business rules here.

import { created, ok, parseBody } from '@/api/lib/http'
import { withErrorHandling } from '@/api/middleware/with-error-handling'
import { createSupplier, listSuppliers } from '@/api/services/supplier.service'

export const getSuppliers = withErrorHandling(async () => {
  return ok(await listSuppliers())
})

export const postSupplier = withErrorHandling(async (request: Request) => {
  const body = await parseBody(request)
  return created(await createSupplier(body))
})
