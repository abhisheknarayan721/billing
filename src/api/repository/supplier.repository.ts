// Data access for the `supplier` table. This is the only layer that touches Prisma.

import { prisma } from '@/lib/prisma'
import type { PartyValues } from '@/lib/ledger/party'
import { partySearchConditions, toPartyRow, toPartyUpdateRow } from '@/api/lib/party'

export function insertSupplier(values: PartyValues) {
  return prisma.supplier.create({
    data: { suppliername: values.name, ...toPartyRow(values) },
  })
}

/**
 * Returns null when the id does not exist, so the caller can answer 404
 * instead of surfacing a raw Prisma "record not found".
 */
export async function updateSupplier(id: number, values: PartyValues) {
  const existing = await prisma.supplier.findUnique({ where: { sup_id: id } })
  if (!existing) return null

  return prisma.supplier.update({
    where: { sup_id: id },
    data: { suppliername: values.name, ...toPartyUpdateRow(values) },
  })
}

/** `q` blank lists everything; otherwise it is matched in the name and contact columns. */
export function findSuppliers(q = '') {
  return prisma.supplier.findMany({
    where:
      q === ''
        ? undefined
        : {
            OR: [
              { suppliername: { contains: q, mode: 'insensitive' } },
              ...partySearchConditions(q),
            ],
          },
    orderBy: { sup_id: 'asc' },
  })
}

export function findSupplierById(id: number) {
  return prisma.supplier.findUnique({ where: { sup_id: id } })
}
