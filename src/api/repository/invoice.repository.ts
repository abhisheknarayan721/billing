// Data access for `invoice` + `invoice_item`. Only layer that touches Prisma.
//
// Invoicing goods sends them out of the door, so saving an invoice also takes
// their quantities off the linked products' stock — the mirror image of a
// purchase, which puts them on. The invoice and the stock it moved must not be
// able to come apart, so every write here runs inside a single transaction.

import { prisma } from '@/lib/prisma'
import { type InvoiceValues, stockContribution } from '@/lib/invoice'
import { computeTotals } from '@/api/lib/invoice'
import type { ListSearch } from '@/lib/search'
import type { Prisma } from '@/generated/prisma/client'

type Tx = Prisma.TransactionClient

interface StockLine {
  p_id: number | null
  quantity: number
}

/**
 * Totals up what each product's stock should change by. `sign` is -1 for lines
 * this invoice is sending out and +1 for lines a previous version of it sent
 * out and is now giving back, so an edit nets the two off and can never
 * double-count. Lines with no product, and a cancelled invoice, move nothing.
 *
 * The same product on two lines is summed rather than written twice.
 */
function addStockDeltas(
  deltas: Map<number, number>,
  lines: StockLine[],
  status: string,
  sign: 1 | -1,
) {
  for (const line of lines) {
    if (line.p_id === null) continue

    const moved = stockContribution(status, line.quantity)
    if (moved === 0) continue

    deltas.set(line.p_id, (deltas.get(line.p_id) ?? 0) + sign * moved)
  }
}

/**
 * Applies the collected changes. `increment` is evaluated by Postgres, so two
 * invoices saved at the same time cannot read-modify-write over each other the
 * way `p_stock: current - n` would.
 *
 * Nothing stops stock going negative: an invoice records what was billed, and
 * refusing to bill it would not put the goods back on the shelf.
 */
async function applyStockDeltas(tx: Tx, deltas: Map<number, number>) {
  for (const [productId, delta] of deltas) {
    if (delta === 0) continue

    await tx.product.update({
      where: { p_id: productId },
      data: { p_stock: { increment: delta }, updateddate: new Date() },
    })
  }
}

/**
 * Copies each linked product's current MRP onto its line, so the bill keeps
 * the MRP it was raised with. Read inside the transaction, alongside the stock
 * moves. A hand-typed line, or a product with no MRP, gets null.
 */
async function withMrp<T extends { p_id: number | null }>(tx: Tx, lines: T[]) {
  const ids = [...new Set(lines.flatMap((line) => (line.p_id === null ? [] : [line.p_id])))]
  const products =
    ids.length === 0
      ? []
      : await tx.product.findMany({
          where: { p_id: { in: ids } },
          select: { p_id: true, p_mrp: true },
        })
  const mrpById = new Map(products.map((product) => [product.p_id, product.p_mrp]))

  return lines.map((line) => ({
    ...line,
    mrp: line.p_id === null ? null : (mrpById.get(line.p_id) ?? null),
  }))
}

export function insertInvoice(values: InvoiceValues, billtoaddress: string | null) {
  const totals = computeTotals(values)
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    // A nested create keeps the invoice and its line items together.
    const invoice = await tx.invoice.create({
      data: {
        invoicenumber: values.invoicenumber,
        invoicedate: new Date(values.invoicedate),
        ret_id: values.ret_id === '' ? null : Number(values.ret_id),
        billto: values.billto,
        billtoaddress,
        subtotal: totals.subtotal,
        cgstrate: totals.cgstrate,
        cgstamount: totals.cgstamount,
        sgstrate: totals.sgstrate,
        sgstamount: totals.sgstamount,
        taxamount: totals.taxamount,
        totalamount: totals.totalamount,
        status: values.status,
        createddate: now,
        updateddate: now,
        invoice_item: { create: await withMrp(tx, totals.lines) },
      },
      include: { invoice_item: true },
    })

    const deltas = new Map<number, number>()
    addStockDeltas(deltas, totals.lines, values.status, -1)
    await applyStockDeltas(tx, deltas)

    return invoice
  })
}

/**
 * Rewrites an invoice and its line items. The items are replaced wholesale
 * rather than matched up one by one: an edit can add, drop and reorder lines,
 * and `item_id` carries no meaning outside the invoice it belongs to. Stock is
 * settled the same way — everything the saved version took goes back, and what
 * this version takes comes off — so the net movement is the difference, however
 * the lines were rearranged.
 *
 * The existence check, the write and the stock moves share one transaction, so
 * an invoice can never be left with the old totals and the new items (or with
 * stock that disagrees with what it says was sold).
 *
 * Returns null when the id does not exist, so the caller can answer 404.
 */
export function updateInvoice(
  id: number,
  values: InvoiceValues,
  billtoaddress: string | null,
) {
  const totals = computeTotals(values)

  return prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findUnique({
      where: { inv_id: id },
      include: { invoice_item: true },
    })
    if (!existing) return null

    const invoice = await tx.invoice.update({
      where: { inv_id: id },
      data: {
        invoicenumber: values.invoicenumber,
        invoicedate: new Date(values.invoicedate),
        ret_id: values.ret_id === '' ? null : Number(values.ret_id),
        billto: values.billto,
        billtoaddress,
        subtotal: totals.subtotal,
        cgstrate: totals.cgstrate,
        cgstamount: totals.cgstamount,
        sgstrate: totals.sgstrate,
        sgstamount: totals.sgstamount,
        taxamount: totals.taxamount,
        totalamount: totals.totalamount,
        status: values.status,
        // createddate is left alone: it belongs to the original insert.
        updateddate: new Date(),
        invoice_item: { deleteMany: {}, create: await withMrp(tx, totals.lines) },
      },
      include: { invoice_item: true },
    })

    const deltas = new Map<number, number>()
    addStockDeltas(deltas, existing.invoice_item, existing.status, 1)
    addStockDeltas(deltas, totals.lines, values.status, -1)
    await applyStockDeltas(tx, deltas)

    return invoice
  })
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Invoice dates are stored as UTC midnight (see `toInvoiceValues`), so a
 * `YYYY-MM-DD` bound parses straight onto them; the upper bound is the start
 * of the next day so the whole "to" day is included.
 */
function toInvoiceWhere(search: ListSearch): Prisma.invoiceWhereInput {
  const where: Prisma.invoiceWhereInput = {}

  if (search.q !== '') {
    where.invoicenumber = { contains: search.q, mode: 'insensitive' }
  }
  if (search.from !== '' || search.to !== '') {
    where.invoicedate = {
      ...(search.from !== '' && { gte: new Date(search.from) }),
      ...(search.to !== '' && { lt: new Date(Date.parse(search.to) + DAY_MS) }),
    }
  }

  return where
}

export function findInvoices(search?: ListSearch) {
  return prisma.invoice.findMany({
    where: search ? toInvoiceWhere(search) : undefined,
    orderBy: { inv_id: 'asc' },
    include: { invoice_item: true },
  })
}

export function findInvoiceById(id: number) {
  return prisma.invoice.findUnique({
    where: { inv_id: id },
    // retailer is included so an invoice saved before billtoaddress existed can
    // still fall back to the linked customer's current address.
    include: { invoice_item: true, retailer: true },
  })
}

/** Just enough to fill the From / To pickers of the bulk print page. */
export function findInvoiceNumbers() {
  return prisma.invoice.findMany({
    orderBy: { inv_id: 'asc' },
    select: { inv_id: true, invoicenumber: true, status: true },
  })
}

/**
 * Every invoice from one id to another, inclusive, ready to render as bills.
 * Ids follow the order invoices were raised in, which is the numbering order.
 */
export function findInvoicesForPrint(fromId: number, toId: number, includeCancelled: boolean) {
  return prisma.invoice.findMany({
    where: {
      inv_id: { gte: Math.min(fromId, toId), lte: Math.max(fromId, toId) },
      ...(includeCancelled ? {} : { status: { not: 'Cancelled' } }),
    },
    orderBy: { inv_id: 'asc' },
    include: { invoice_item: true, retailer: true },
  })
}

export function findLastInvoiceNumber() {
  return prisma.invoice.findFirst({
    orderBy: { inv_id: 'desc' },
    select: { invoicenumber: true },
  })
}

/** Every invoice billed to one retailer, oldest first, for their ledger. */
export function findInvoicesByRetailer(retailerId: number) {
  return prisma.invoice.findMany({
    where: { ret_id: retailerId },
    orderBy: [{ invoicedate: 'asc' }, { inv_id: 'asc' }],
    select: {
      inv_id: true,
      invoicenumber: true,
      invoicedate: true,
      totalamount: true,
      status: true,
    },
  })
}

/**
 * What each retailer has been invoiced in all, keyed by ret_id. Cancelled
 * invoices are left out, as they are on the ledger statement.
 */
export function sumInvoiceTotalsByRetailer(retailerIds: number[]) {
  return prisma.invoice.groupBy({
    by: ['ret_id'],
    where: { ret_id: { in: retailerIds }, status: { not: 'Cancelled' } },
    _sum: { totalamount: true },
  })
}

/**
 * Every invoice line that billed one product, oldest invoice first, with the
 * invoice and its retailer, for the product's ledger. `from`/`to` are an
 * inclusive `YYYY-MM-DD` range on the invoice date; either may be blank.
 */
export function findInvoiceItemsByProduct(productId: number, from = '', to = '') {
  return prisma.invoice_item.findMany({
    where: {
      p_id: productId,
      ...((from !== '' || to !== '') && {
        invoice: {
          invoicedate: {
            ...(from !== '' && { gte: new Date(from) }),
            ...(to !== '' && { lt: new Date(Date.parse(to) + DAY_MS) }),
          },
        },
      }),
    },
    orderBy: [{ invoice: { invoicedate: 'asc' } }, { inv_id: 'asc' }, { item_id: 'asc' }],
    select: {
      item_id: true,
      quantity: true,
      unitprice: true,
      linetotal: true,
      invoice: {
        select: {
          inv_id: true,
          invoicenumber: true,
          invoicedate: true,
          billto: true,
          status: true,
          retailer: { select: { ret_id: true, retailername: true } },
        },
      },
    },
  })
}
