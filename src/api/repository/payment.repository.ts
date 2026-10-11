// Data access for the `payment` table. This is the only layer that touches Prisma.

import { prisma } from '@/lib/prisma'
import type { PaymentValues } from '@/lib/payment'
import type { ListSearch } from '@/lib/search'
import { toPaymentRow, toPaymentUpdateRow } from '@/api/lib/payment'
import type { Prisma } from '@/generated/prisma/client'

export function insertPayment(values: PaymentValues) {
  return prisma.payment.create({ data: toPaymentRow(values) })
}

/**
 * Returns null when the id does not exist, so the caller can answer 404
 * instead of surfacing a raw Prisma "record not found".
 */
export async function updatePayment(id: number, values: PaymentValues) {
  const existing = await prisma.payment.findUnique({ where: { pay_id: id } })
  if (!existing) return null

  return prisma.payment.update({
    where: { pay_id: id },
    data: toPaymentUpdateRow(values),
  })
}

/** Midnight at the start of a `YYYY-MM-DD` day, in the server's time zone. */
function startOfDay(date: string, addDays = 0): Date {
  const day = new Date(`${date}T00:00:00`)
  day.setDate(day.getDate() + addDays)
  return day
}

/**
 * `createddate` is a real moment (unlike an invoice date, which is a bare day
 * stored as UTC midnight), so the range is cut at local midnight — the same
 * zone the list displays it in. The upper bound is the start of the next day
 * so the whole "to" day is included.
 */
function toPaymentWhere(search: ListSearch): Prisma.paymentWhereInput {
  const where: Prisma.paymentWhereInput = {}

  if (search.q !== '') {
    where.OR = [
      { pay_name: { contains: search.q, mode: 'insensitive' } },
      { pay_method: { contains: search.q, mode: 'insensitive' } },
    ]
  }
  if (search.from !== '' || search.to !== '') {
    where.createddate = {
      ...(search.from !== '' && { gte: startOfDay(search.from) }),
      ...(search.to !== '' && { lt: startOfDay(search.to, 1) }),
    }
  }

  return where
}

/** Newest first: the payment just taken is the one most often looked for. */
export function findPayments(search?: ListSearch) {
  return prisma.payment.findMany({
    where: search ? toPaymentWhere(search) : undefined,
    orderBy: { pay_id: 'desc' },
  })
}

export function findPaymentById(id: number) {
  return prisma.payment.findUnique({ where: { pay_id: id } })
}

/**
 * Payments recorded under exactly this name. A payment stores the party's name,
 * not its id, so this is how a ledger finds them.
 */
export function findPaymentsByName(name: string) {
  return prisma.payment.findMany({
    where: { pay_name: name },
    orderBy: [{ createddate: 'asc' }, { pay_id: 'asc' }],
  })
}

/** What has been paid under each of these names, keyed by pay_name. */
export function sumPaymentsByName(names: string[]) {
  return prisma.payment.groupBy({
    by: ['pay_name'],
    where: { pay_name: { in: names } },
    _sum: { pay_amt: true },
  })
}
