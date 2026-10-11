import type { Prisma } from '@/generated/prisma/client'

/**
 * Decimal and Date cannot cross into a Client Component, so only the plain
 * fields the order form needs are passed through.
 */
export function toOrderFormOptions(
  retailers: { ret_id: number; retailername: string }[],
  products: { p_id: number; p_name: string; p_price: Prisma.Decimal | null; p_stock: number | null }[],
) {
  return {
    retailers: retailers.map((r) => ({ ret_id: r.ret_id, retailername: r.retailername })),
    products: products.map((p) => ({
      p_id: p.p_id,
      p_name: p.p_name,
      p_price: p.p_price === null ? null : p.p_price.toFixed(2),
      p_stock: p.p_stock,
    })),
  }
}
