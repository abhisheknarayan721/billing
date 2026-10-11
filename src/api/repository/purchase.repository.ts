// Data access for the `purchase` table. This is the only layer that touches
// Prisma.
//
// Saving a purchase also moves stock on the linked product, and the two writes
// must not be able to come apart — a purchase recorded without its stock (or
// stock credited without a purchase to explain it) would silently corrupt the
// inventory. Every write here therefore runs inside a single transaction, and
// the row-level helpers below take the transaction client so that one bill's
// update and its added lines share a single one.

import { prisma } from '@/lib/prisma'
import { type PurchaseValues, stockContribution } from '@/lib/purchase'
import { toPurchaseRow } from '@/api/lib/purchase'
import type { Prisma } from '@/generated/prisma/client'

type Tx = Prisma.TransactionClient

/**
 * Applies a signed change to one product's stock. `increment` is evaluated by
 * Postgres, so two purchases saved at the same time cannot read-modify-write
 * over each other the way `p_stock: current + n` would.
 */
async function moveStock(tx: Tx, productId: number | null, delta: number) {
  if (productId === null || delta === 0) return

  await tx.product.update({
    where: { p_id: productId },
    data: { p_stock: { increment: delta }, updateddate: new Date() },
  })
}

/** Writes one line and credits the stock it delivered. */
async function createRow(tx: Tx, values: PurchaseValues, now: Date) {
  const row = toPurchaseRow(values)

  const purchase = await tx.purchase.create({
    data: { ...row, createddate: now, updateddate: now },
  })

  await moveStock(tx, row.p_id, stockContribution(row.status, row.quantity))

  return purchase
}

/**
 * Rewrites one stored line. Stock is adjusted by the DIFFERENCE between what
 * this purchase used to contribute and what it contributes now, so editing a
 * saved purchase can never double-count. Changing the product moves the full
 * quantity from the old product to the new one.
 *
 * Returns null when the id does not exist, so the caller can answer 404.
 */
async function updateRow(tx: Tx, id: number, values: PurchaseValues) {
  const row = toPurchaseRow(values)

  const existing = await tx.purchase.findUnique({ where: { pur_id: id } })
  if (!existing) return null

  const before = stockContribution(existing.status ?? '', existing.quantity ?? 0)
  const after = stockContribution(row.status, row.quantity)

  if (existing.p_id === row.p_id) {
    await moveStock(tx, row.p_id, after - before)
  } else {
    // Different products: take the old quantity back off the product that was
    // previously credited before crediting the new one.
    await moveStock(tx, existing.p_id, -before)
    await moveStock(tx, row.p_id, after)
  }

  return tx.purchase.update({
    where: { pur_id: id },
    data: { ...row, updateddate: new Date() },
  })
}

/**
 * Saves every line of one supplier bill as its own row. They go in a single
 * transaction so a bill is never half-recorded: if line three is rejected, the
 * stock credited by lines one and two is rolled back with them.
 *
 * Lines are written in order, and a product listed twice is simply credited
 * twice — two deliveries of the same thing on one bill are a real thing.
 */
export function insertPurchases(list: PurchaseValues[]) {
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    const saved = []
    for (const values of list) {
      saved.push(await createRow(tx, values, now))
    }
    return saved
  })
}

export async function insertPurchase(values: PurchaseValues) {
  const [purchase] = await insertPurchases([values])
  return purchase
}

export function updatePurchase(id: number, values: PurchaseValues) {
  return prisma.$transaction((tx) => updateRow(tx, id, values))
}

/**
 * Editing a saved line and adding more products to the same bill in one go: the
 * stored row is rewritten and the extra lines are inserted as rows of their own,
 * all in one transaction. If any of it fails, none of the stock moves stick.
 *
 * Returns null when the edited id does not exist, so the caller can answer 404
 * without having written the additions.
 */
export function updatePurchaseWithAdditions(
  id: number,
  values: PurchaseValues,
  additions: PurchaseValues[],
) {
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    const updated = await updateRow(tx, id, values)
    if (!updated) return null

    const added = []
    for (const addition of additions) {
      added.push(await createRow(tx, addition, now))
    }

    return { updated, added }
  })
}

export function findPurchases() {
  return prisma.purchase.findMany({ orderBy: { pur_id: 'desc' } })
}

export function findPurchaseById(id: number) {
  return prisma.purchase.findUnique({ where: { pur_id: id } })
}
