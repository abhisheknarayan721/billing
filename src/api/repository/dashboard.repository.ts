// Data access for the home dashboard. Only layer that touches Prisma.
//
// Read-only summaries across tables, run in parallel since none depends on
// another.

import { prisma } from '@/lib/prisma'

/** Products at or below this stock level are flagged on the dashboard. */
export const LOW_STOCK_LEVEL = 5

export async function findDashboardSummary() {
  const [
    retailerCount,
    supplierCount,
    productCount,
    lowStockCount,
    invoiceTotals,
    paymentTotals,
    recentInvoices,
  ] = await Promise.all([
    prisma.retailer.count(),
    prisma.supplier.count(),
    prisma.product.count(),
    prisma.product.count({ where: { p_stock: { lte: LOW_STOCK_LEVEL } } }),
    prisma.invoice.aggregate({ _count: true, _sum: { totalamount: true } }),
    prisma.payment.aggregate({ _sum: { pay_amt: true } }),
    prisma.invoice.findMany({
      orderBy: { inv_id: 'desc' },
      take: 5,
      select: {
        inv_id: true,
        invoicenumber: true,
        invoicedate: true,
        billto: true,
        totalamount: true,
        status: true,
      },
    }),
  ])

  return {
    retailerCount,
    supplierCount,
    productCount,
    lowStockCount,
    invoiceCount: invoiceTotals._count,
    invoiceTotal: invoiceTotals._sum.totalamount,
    paymentTotal: paymentTotals._sum.pay_amt,
    recentInvoices,
  }
}
