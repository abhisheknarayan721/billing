// HTTP method bindings for /api/ledger/suppliers.
// The file under src/app/api re-exports these; it cannot live here because
// only `route.ts` files inside src/app become routes.

export { getSuppliers as GET, postSupplier as POST } from '@/api/controller/supplier.controller'
