import type { EntityRecord } from '@/components/form/entity-form'

export interface ProductRow {
  p_id: number
  p_name: string
  p_price: { toFixed(places: number): string } | null
  p_mrp: { toFixed(places: number): string } | null
  p_cgst: { toFixed(places: number): string }
  p_sgst: { toFixed(places: number): string }
  p_stock: number | null
}

/**
 * Decimal is not serialisable across the server/client boundary, so the price
 * is flattened to the string the number input expects. Shared by the add and
 * edit pages so the two cannot drift.
 */
export function toProductRecord(product: ProductRow): EntityRecord {
  return {
    id: product.p_id,
    label: product.p_name,
    values: {
      p_name: product.p_name,
      p_price: product.p_price === null ? '' : product.p_price.toFixed(2),
      p_mrp: product.p_mrp === null ? '' : product.p_mrp.toFixed(2),
      p_cgst: product.p_cgst.toFixed(2),
      p_sgst: product.p_sgst.toFixed(2),
      p_stock: product.p_stock === null ? '' : String(product.p_stock),
    },
  }
}
