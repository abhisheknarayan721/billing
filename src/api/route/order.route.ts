// HTTP method bindings for /api/orders.
// The file under src/app/api re-exports these; it cannot live here because
// only `route.ts` files inside src/app become routes.

export { getOrders as GET, postOrder as POST } from '@/api/controller/order.controller'
