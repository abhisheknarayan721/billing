import Link from 'next/link'
import { connection } from 'next/server'

import { getDashboardSummary } from '@/api/services/dashboard.service'
import { LOW_STOCK_LEVEL } from '@/api/repository/dashboard.repository'
import { COMPANY, formatDate, formatMoney } from '@/lib/company'

const quickActions = [
  { label: 'New Invoice', description: 'Bill a retailer', href: '/invoice', icon: '🧾', tone: 'bg-sky-50 text-sky-600' },
  { label: 'Add Purchase', description: 'Record stock bought in', href: '/purchase', icon: '📦', tone: 'bg-amber-50 text-amber-600' },
  { label: 'Add Payment', description: 'Log money received or paid', href: '/payment', icon: '💳', tone: 'bg-emerald-50 text-emerald-600' },
  { label: 'Add Product', description: 'Add an item to the catalogue', href: '/product', icon: '🏷️', tone: 'bg-violet-50 text-violet-600' },
  { label: 'Add Retailer', description: 'Register a new customer', href: '/ledger/retailer', icon: '🏪', tone: 'bg-rose-50 text-rose-600' },
  { label: 'Retailer Ledger', description: 'View a customer statement', href: '/ledger/retailer/statement', icon: '📒', tone: 'bg-slate-100 text-slate-600' },
]

const statusTone: Record<string, string> = {
  Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Sent: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  Draft: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  Cancelled: 'bg-rose-50 text-rose-700 ring-rose-600/20',
}

export default async function HomePage() {
  // Figures must reflect the database at request time, not build time.
  await connection()
  const summary = await getDashboardSummary()

  const stats = [
    { label: 'Total Sales', value: formatMoney(summary.invoiceTotal ?? 0), note: `${summary.invoiceCount} invoices`, href: '/invoice/list' },
    { label: 'Payments', value: formatMoney(summary.paymentTotal ?? 0), note: 'All recorded payments', href: '/payment/list' },
    { label: 'Retailers', value: summary.retailerCount, note: `${summary.supplierCount} suppliers`, href: '/ledger/retailer/list' },
    {
      label: 'Products',
      value: summary.productCount,
      note: summary.lowStockCount > 0 ? `${summary.lowStockCount} low on stock (≤ ${LOW_STOCK_LEVEL})` : 'Stock levels healthy',
      href: '/product',
      alert: summary.lowStockCount > 0,
    },
  ]

  return (
    <div className="page space-y-8">
      {/* Welcome banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-600 px-8 py-10 text-white shadow-lg">
        <div aria-hidden="true" className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
        <div aria-hidden="true" className="absolute -bottom-20 right-24 h-48 w-48 rounded-full bg-white/10" />
        <div className="relative">
          <p className="text-sm font-medium text-sky-100">
            {formatDate(new Date())}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Welcome back to {COMPANY.name}
          </h1>
          <p className="mt-2 max-w-xl text-sky-100">
            Manage invoices, purchases, payments and stock — all in one place.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/invoice"
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-sky-700 shadow hover:bg-sky-50"
            >
              + Create Invoice
            </Link>
            <Link
              href="/invoice/list"
              className="rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              View all invoices
            </Link>
          </div>
        </div>
      </section>

      {/* Key figures */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{stat.value}</p>
            <p className={`mt-1 text-xs ${stat.alert ? 'font-medium text-amber-600' : 'text-slate-500'}`}>
              {stat.note}
            </p>
          </Link>
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Quick actions */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Quick actions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow-md"
              >
                <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl ${action.tone}`}>
                  {action.icon}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{action.label}</span>
                  <span className="block text-xs text-slate-500">{action.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent invoices */}
        <section className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent invoices</h2>
            <Link href="/invoice/list" className="text-sm link">
              View all &rarr;
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {summary.recentInvoices.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-slate-500">No invoices yet.</p>
                <Link href="/invoice" className="mt-2 inline-block text-sm link">
                  Create your first invoice
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Invoice</th>
                    <th className="px-4 py-3 font-semibold">Bill To</th>
                    <th className="hidden px-4 py-3 font-semibold sm:table-cell">Date</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.recentInvoices.map((invoice) => (
                    <tr key={invoice.inv_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/invoice/${invoice.inv_id}`} className="font-medium link">
                          {invoice.invoicenumber}
                        </Link>
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${statusTone[invoice.status] ?? statusTone.Draft}`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{invoice.billto}</td>
                      <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{formatDate(invoice.invoicedate)}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">
                        {formatMoney(invoice.totalamount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
