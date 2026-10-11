// Data access for the `retailer` table. This is the only layer that touches Prisma.

import { prisma } from '@/lib/prisma'
import type { PartyValues } from '@/lib/ledger/party'
import { partySearchConditions, toPartyRow, toPartyUpdateRow } from '@/api/lib/party'

export function insertRetailer(values: PartyValues) {
  return prisma.retailer.create({
    data: { retailername: values.name, ...toPartyRow(values) },
  })
}

/**
 * Returns null when the id does not exist, so the caller can answer 404
 * instead of surfacing a raw Prisma "record not found".
 */
export async function updateRetailer(id: number, values: PartyValues) {
  const existing = await prisma.retailer.findUnique({ where: { ret_id: id } })
  if (!existing) return null

  return prisma.retailer.update({
    where: { ret_id: id },
    data: { retailername: values.name, ...toPartyUpdateRow(values) },
  })
}

/** `q` blank lists everything; otherwise it is matched in the name and contact columns. */
export function findRetailers(q = '') {
  return prisma.retailer.findMany({
    where:
      q === ''
        ? undefined
        : {
            OR: [
              { retailername: { contains: q, mode: 'insensitive' } },
              ...partySearchConditions(q),
            ],
          },
    orderBy: { ret_id: 'asc' },
  })
}

export function findRetailerById(id: number) {
  return prisma.retailer.findUnique({ where: { ret_id: id } })
}
