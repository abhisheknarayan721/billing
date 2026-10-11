// HTTP method bindings for /api/purchases.
// The file under src/app/api re-exports these; it cannot live here because
// only `route.ts` files inside src/app become routes.

export {
  getPurchases as GET,
  postPurchase as POST,
  putPurchase as PUT,
} from '@/api/controller/purchase.controller'
