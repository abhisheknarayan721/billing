import type { ProductOption } from '@/components/purchase/purchase-form'

interface ProductRow {
  p_id: number
  p_name: string
  p_stock: number | null
}

/**
 * Only the plain fields the form needs are passed through. The catalogue price
 * is deliberately not among them: a purchase records what the goods cost, which
 * has nothing to do with what they sell for, so the selling price is neither
 * offered as a default nor changed by a purchase. Shared by the new-purchase
 * and edit pages so the two cannot drift.
 */
export function toProductOptions(products: ProductRow[]): ProductOption[] {
  return products.map((product) => ({
    p_id: product.p_id,
    p_name: product.p_name,
    p_stock: product.p_stock,
  }))
}

/** Today in the same UTC-based form the date inputs and `formatDate` use. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
