// HTTP method bindings for /api/invoices.
// The file under src/app/api re-exports these; it cannot live here because
// only `route.ts` files inside src/app become routes.

export { getInvoices as GET, postInvoice as POST } from '@/api/controller/invoice.controller'
