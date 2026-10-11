// Translates HTTP <-> the invoice service. No Prisma and no business rules here.

import { created, ok, parseBody } from '@/api/lib/http'
import { withErrorHandling } from '@/api/middleware/with-error-handling'
import { createInvoice, listInvoices } from '@/api/services/invoice.service'

export const getInvoices = withErrorHandling(async () => {
  return ok(await listInvoices())
})

export const postInvoice = withErrorHandling(async (request: Request) => {
  const body = await parseBody(request)
  return created(await createInvoice(body))
})
