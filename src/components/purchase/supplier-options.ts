import type { SupplierOption } from '@/components/purchase/purchase-form'

interface SupplierRow {
  sup_id: number
  suppliername: string
}

/**
 * Only the two fields the form needs cross the server/client boundary — the
 * rest of a supplier row (address, tax number, timestamps) has no business in
 * the client bundle. Shared by the new-purchase and edit pages so the two
 * cannot drift.
 */
export function toSupplierOptions(suppliers: SupplierRow[]): SupplierOption[] {
  return suppliers.map((supplier) => ({
    sup_id: supplier.sup_id,
    suppliername: supplier.suppliername,
  }))
}
