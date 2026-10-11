// HTTP method bindings for /api/payments.
// The file under src/app/api re-exports these; it cannot live here because
// only `route.ts` files inside src/app become routes.

export { getPayments as GET, postPayment as POST } from '@/api/controller/payment.controller'
