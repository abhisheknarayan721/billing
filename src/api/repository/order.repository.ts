// Data access for `retailer_order` + `retailer_order_item`. Only layer that
// touches Prisma. Orders never move stock, so unlike invoices there is nothing
// to settle beyond the order and its lines.

import { prisma } from '@/lib/prisma'
import { computeOrderTotals } from '@/api/lib/order'
import type { OrderValues } from '@/lib/order'
import type { ListSearch } from '@/lib/search'
import type { Prisma } from '@/generated/prisma/client'

const DAY_MS = 24 * 60 * 60 * 1000

function toOrderData(values: OrderValues, retailername: string) {
  const totals = computeOrderTotals(values)
  return {
    totals,
    data: {
      ordernumber: values.ordernumber,
      orderdate: new Date(values.orderdate),
      ret_id: Number(values.ret_id),
      retailername,
      notes: values.notes === '' ? null : values.notes,
      totalamount: totals.totalamount,
      status: values.status,
    },
  }
}

export function insertOrder(values: OrderValues, retailername: string) {
  const { data, totals } = toOrderData(values, retailername)
  const now = new Date()

  return prisma.retailer_order.create({
    data: {
      ...data,
      createddate: now,
      updateddate: now,
      order_item: { create: totals.lines },
    },
    include: { order_item: true },
  })
}

/**
 * Rewrites an order and replaces its lines wholesale, as an invoice edit does.
 * Returns null when the id does not exist, so the caller can answer 404.
 */
export function updateOrder(id: number, values: OrderValues, retailername: string) {
  const { data, totals } = toOrderData(values, retailername)

  return prisma.$transaction(async (tx) => {
    const existing = await tx.retailer_order.findUnique({
      where: { ord_id: id },
      select: { ord_id: true },
    })
    if (!existing) return null

    return tx.retailer_order.update({
      where: { ord_id: id },
      data: {
        ...data,
        updateddate: new Date(),
        order_item: { deleteMany: {}, create: totals.lines },
      },
      include: { order_item: true },
    })
  })
}

export interface OrderSearch extends ListSearch {
  /** One of ORDER_STATUSES, or '' for every status. */
  status: string
}

/**
 * `q` matches the order number or the retailer's name. Dates are stored as UTC
 * midnight, so the upper bound is the start of the next day.
 */
function toOrderWhere(search: OrderSearch): Prisma.retailer_orderWhereInput {
  const where: Prisma.retailer_orderWhereInput = {}

  if (search.q !== '') {
    where.OR = [
      { ordernumber: { contains: search.q, mode: 'insensitive' } },
      { retailername: { contains: search.q, mode: 'insensitive' } },
    ]
  }
  if (search.from !== '' || search.to !== '') {
    where.orderdate = {
      ...(search.from !== '' && { gte: new Date(search.from) }),
      ...(search.to !== '' && { lt: new Date(Date.parse(search.to) + DAY_MS) }),
    }
  }
  if (search.status !== '') where.status = search.status

  return where
}

/** Newest first: the list is mostly used to see what has just come in. */
export function findOrders(search?: OrderSearch) {
  return prisma.retailer_order.findMany({
    where: search ? toOrderWhere(search) : undefined,
    orderBy: [{ orderdate: 'desc' }, { ord_id: 'desc' }],
    include: { _count: { select: { order_item: true } } },
  })
}

export function findOrderById(id: number) {
  return prisma.retailer_order.findUnique({
    where: { ord_id: id },
    // retailer is included for the printed order's address and contact lines.
    include: { order_item: { orderBy: { item_id: 'asc' } }, retailer: true },
  })
}

export function findLastOrderNumber() {
  return prisma.retailer_order.findFirst({
    orderBy: { ord_id: 'desc' },
    select: { ordernumber: true },
  })
}

/**
 * Removes an order; its lines go with it (ON DELETE CASCADE). Orders never
 * moved stock, so there is nothing to put back. Returns how many were removed.
 */
export async function deleteOrder(id: number) {
  const { count } = await prisma.retailer_order.deleteMany({ where: { ord_id: id } })
  return count
}
