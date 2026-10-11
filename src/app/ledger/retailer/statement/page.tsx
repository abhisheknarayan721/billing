import Image from 'next/image'
import Link from 'next/link'
import { connection } from 'next/server'

import PrintButton from '@/components/invoice/print-button'
import PartyPicker from '@/components/ledger/party-picker'
import { getRetailerStatement, listRetailers } from '@/api/services/retailer.service'
import { formatAddress } from '@/lib/address'
import { COMPANY, formatDateTime, formatMoney } from '@/lib/company'
import { formatBalance } from '@/lib/ledger/statement'

export const metadata = {
  title: 'Retailer Ledger',
}

function formatDay(day: string) {
  if (day === '') return '-'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00Z`))
}

const rupees = (paise: number) => formatMoney(paise / 100)


export default async function RetailerStatementPage(
  props: PageProps<'/ledger/retailer/statement'>,
) {
  // Must reflect the database at request time, not build time.
  await connection()

  const raw = (await props.searchParams).ret_id
  const param = Array.isArray(raw) ? raw[0] : raw
  const selectedId = param && /^\d+$/.test(param) ? Number(param) : undefined

  const [retailers, result] = await Promise.all([
    listRetailers(),
    selectedId === undefined ? null : getRetailerStatement(selectedId),
  ])

  const retailerAddress = result ? formatAddress(result.retailer) : ''

  return (
    <section className="page max-w-5xl print:max-w-none print:px-0 print:py-0">
      {/* Screen-only toolbar and picker — print:hidden keeps them off the paper. */}
      <div className="page-header print:hidden">
        <h2 className="page-title">Retailer Ledger</h2>
        <div className="flex items-center gap-4">
          <Link href="/ledger/retailer/list" className="text-sm link">
            All retailers
          </Link>
          {result && <PrintButton label="Print ledger" />}
        </div>
      </div>

      <div className="print:hidden">
        <PartyPicker
          action="/ledger/retailer/statement"
          name="ret_id"
          label="Retailer"
          options={retailers.map((row) => ({ id: row.ret_id, name: row.retailername }))}
          selectedId={result ? selectedId : undefined}
        />
      </div>

      {selectedId === undefined ? (
        <p className="empty-state">
          Choose a retailer to see their invoices and payments.
        </p>
      ) : result === null ? (
        <p className="alert-error">That retailer was not found.</p>
      ) : (
        <>
          {/* Paper-only letterhead: who the statement is from, for and when. */}
          <header className="mb-6 hidden print:block">
            <h1 className="mb-6 text-center text-2xl font-bold tracking-wide text-slate-900">
              STATEMENT OF ACCOUNT
            </h1>
            <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-6">
              <div className="flex items-start gap-4">
                <Image src={COMPANY.logo} alt="" width={56} height={56} className="h-14 w-14 shrink-0" />
                <div className="text-xs leading-5 text-slate-600">
                  <p className="text-base font-semibold text-slate-900">{COMPANY.name}</p>
                  {COMPANY.addressLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
              <div className="text-right text-xs leading-5 text-slate-600">
                <p className="text-sm font-medium text-slate-900">Retailer Ledger</p>
                <p>As of {formatDateTime(new Date())}</p>
              </div>
            </div>
            <div className="pt-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Account Of
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {result.retailer.retailername}
              </p>
              {retailerAddress && (
                <p className="mt-0.5 whitespace-pre-line text-xs leading-5 text-slate-600">
                  {retailerAddress}
                </p>
              )}
              {(result.retailer.phonenumber || result.retailer.taxnumber) && (
                <p className="mt-0.5 text-xs leading-5 text-slate-600">
                  {[
                    result.retailer.phonenumber && `Phone: ${result.retailer.phonenumber}`,
                    result.retailer.taxnumber && `Tax No: ${result.retailer.taxnumber}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>
          </header>

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 print:grid-cols-3">
            {[
              { label: 'Total invoiced', value: rupees(result.statement.totalDebitPaise) },
              { label: 'Total received', value: rupees(result.statement.totalCreditPaise) },
              {
                label: result.statement.balancePaise < 0 ? 'Advance' : 'Balance due',
                value: rupees(Math.abs(result.statement.balancePaise)),
              },
            ].map((tile) => (
              <div key={tile.label} className="card p-5">
                <p className="text-xs uppercase tracking-wide text-slate-500">{tile.label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                  {tile.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mb-3 text-sm text-slate-600 print:hidden">
            <span className="font-medium text-slate-900">{result.retailer.retailername}</span>
            {result.retailer.phonenumber && <> · {result.retailer.phonenumber}</>}
            {result.retailer.city && <> · {result.retailer.city}</>}
            {' · '}
            <Link
              href={`/ledger/retailer/${result.retailer.ret_id}/edit`}
              className="link"
            >
              Edit details
            </Link>
          </div>

          {result.statement.entries.length === 0 ? (
            <p className="empty-state">No invoices or payments yet.</p>
          ) : (
            <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="font-semibold">Date</th>
                  <th className="font-semibold">Particulars</th>
                  <th className="text-right font-semibold">Debit (Invoice)</th>
                  <th className="text-right font-semibold">Credit (Payment)</th>
                  <th className="text-right font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody>
                {result.statement.entries.map((entry) => (
                  <tr
                    key={entry.key}
                    className={`${entry.counted ? '' : 'text-slate-400'}`}
                  >
                    <td className="whitespace-nowrap">{formatDay(entry.day)}</td>
                    <td>
                      <Link
                        href={
                          entry.kind === 'invoice'
                            ? `/invoice/${entry.id}`
                            : `/payment/${entry.id}/edit`
                        }
                        className={`hover:underline ${entry.counted ? 'text-sky-700 print:text-slate-900' : 'line-through'}`}
                      >
                        {entry.particulars}
                      </Link>
                      {entry.status && entry.status !== 'Sent' && entry.status !== 'Paid' && (
                        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                          {entry.status}
                        </span>
                      )}
                    </td>
                    <td className="text-right tabular-nums">
                      {entry.kind === 'invoice' ? rupees(entry.debitPaise) : ''}
                    </td>
                    <td className="text-right tabular-nums">
                      {entry.kind === 'payment' ? rupees(entry.creditPaise) : ''}
                    </td>
                    <td className="text-right tabular-nums whitespace-nowrap">
                      {formatBalance(entry.balancePaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td colSpan={2} className="text-right">
                    Total
                  </td>
                  <td className="text-right tabular-nums">
                    {rupees(result.statement.totalDebitPaise)}
                  </td>
                  <td className="text-right tabular-nums">
                    {rupees(result.statement.totalCreditPaise)}
                  </td>
                  <td className="text-right tabular-nums whitespace-nowrap">
                    {formatBalance(result.statement.balancePaise)}
                  </td>
                </tr>
              </tfoot>
            </table>
            </div>
          )}
        </>
      )}
    </section>
  )
}
