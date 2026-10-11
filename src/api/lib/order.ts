// Normalising and money maths for retailer orders.

import { Prisma } from '@/generated/prisma/client'
import { EMPTY_ORDER_LINE, type OrderLineValues, type OrderValues } from '@/lib/order'

export function normalizeOrder(input: Record<string, unknown>): OrderValues {
  const text = (value: unknown) => String(value ?? '').trim()
  const rawItems = Array.isArray(input.items) ? input.items : []

  return {
    ordernumber: text(input.ordernumber),
    orderdate: text(input.orderdate),
    ret_id: text(input.ret_id),
    notes: text(input.notes),
    status: text(input.status) || 'Pending',
    items: rawItems.map((raw): OrderLineValues => {
      const item = (raw ?? {}) as Record<string, unknown>
      return {
        p_id: text(item.p_id),
        productname: text(item.productname),
        quantity: text(item.quantity) || EMPTY_ORDER_LINE.quantity,
        unitprice: text(item.unitprice),
      }
    }),
  }
}

/**
 * Maps a stored order back into form values for the edit page. Decimal and
 * Date are flattened to strings, which also makes the result safe to hand to a
 * Client Component.
 */
export function toOrderValues(row: {
  ordernumber: string
  orderdate: Date
  ret_id: number | null
  notes: string | null
  status: string
  order_item: {
    p_id: number | null
    productname: string
    quantity: number
    unitprice: Prisma.Decimal
  }[]
}): OrderValues {
  return {
    ordernumber: row.ordernumber,
    orderdate: row.orderdate.toISOString().slice(0, 10),
    ret_id: row.ret_id === null ? '' : String(row.ret_id),
    notes: row.notes ?? '',
    status: row.status,
    items:
      row.order_item.length === 0
        ? [{ ...EMPTY_ORDER_LINE }]
        : row.order_item.map((item) => ({
            p_id: item.p_id === null ? '' : String(item.p_id),
            productname: item.productname,
            quantity: String(item.quantity),
            unitprice: item.unitprice.toFixed(2),
          })),
  }
}

/**
 * Recomputed server-side from quantity x unit price with Prisma.Decimal, so
 * money never picks up binary float error. No tax: that belongs on the invoice.
 */
export function computeOrderTotals(values: OrderValues) {
  const lines = values.items.map((line) => {
    const unitprice = new Prisma.Decimal(line.unitprice)
    const quantity = Number(line.quantity)
    return {
      p_id: line.p_id === '' ? null : Number(line.p_id),
      productname: line.productname,
      quantity,
      unitprice,
      linetotal: unitprice.mul(quantity).toDecimalPlaces(2),
    }
  })

  const totalamount = lines
    .reduce((total, line) => total.add(line.linetotal), new Prisma.Decimal(0))
    .toDecimalPlaces(2)

  return { lines, totalamount }
}
