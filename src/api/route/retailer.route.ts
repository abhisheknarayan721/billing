// HTTP method bindings for /api/ledger/retailers.
// The file under src/app/api re-exports these; it cannot live here because
// only `route.ts` files inside src/app become routes.

export { getRetailers as GET, postRetailer as POST } from '@/api/controller/retailer.controller'
