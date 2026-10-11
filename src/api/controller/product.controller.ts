// Translates HTTP <-> the product service. No Prisma and no business rules here.

import { created, ok, parseBody } from '@/api/lib/http'
import { withErrorHandling } from '@/api/middleware/with-error-handling'
import { createProduct, listProducts } from '@/api/services/product.service'

export const getProducts = withErrorHandling(async () => {
  return ok(await listProducts())
})

export const postProduct = withErrorHandling(async (request: Request) => {
  const body = await parseBody(request)
  return created(await createProduct(body))
})
