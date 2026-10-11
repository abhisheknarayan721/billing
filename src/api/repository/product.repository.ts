// Data access for the `product` table. This is the only layer that touches Prisma.

import { prisma } from '@/lib/prisma'
import type { ProductSearch, ProductValues } from '@/lib/product'
import { toProductRow, toProductUpdateRow } from '@/api/lib/product'

export function insertProduct(values: ProductValues) {
  return prisma.product.create({ data: toProductRow(values) })
}

/**
 * Returns null when the id does not exist, so the caller can answer 404
 * instead of surfacing a raw Prisma "record not found".
 */
export async function updateProduct(id: number, values: ProductValues) {
  const existing = await prisma.product.findUnique({ where: { p_id: id } })
  if (!existing) return null

  return prisma.product.update({
    where: { p_id: id },
    data: toProductUpdateRow(values),
  })
}

/** Without a search, every product in the order they were added (the pickers' order). */
export function findProducts(search?: ProductSearch) {
  if (!search) return prisma.product.findMany({ orderBy: { p_id: 'asc' } })

  return prisma.product.findMany({
    where: search.q === '' ? undefined : { p_name: { contains: search.q, mode: 'insensitive' } },
    // p_id breaks ties, so two products with the same name keep a stable order.
    orderBy: [{ p_name: search.sort === 'name_desc' ? 'desc' : 'asc' }, { p_id: 'asc' }],
  })
}

export function findProductById(id: number) {
  return prisma.product.findUnique({ where: { p_id: id } })
}
