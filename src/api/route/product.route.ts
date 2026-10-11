// HTTP method bindings for /api/products.
// The file under src/app/api re-exports these; it cannot live here because
// only `route.ts` files inside src/app become routes.

export { getProducts as GET, postProduct as POST } from '@/api/controller/product.controller'
