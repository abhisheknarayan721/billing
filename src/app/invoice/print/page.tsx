import Form from 'next/form'
import Link from 'next/link'
import { connection } from 'next/server'

import Bill from '@/components/invoice/bill'
import PrintButton from '@/components/invoice/print-button'
import { listInvoiceNumbers, listInvoicesForPrint } from '@/api/services/invoice.service'

export const metadata = {
  title: 'Print Invoices',
}

/** A browser prints this many bills comfortably in one go. */
const MAX_BILLS = 200

function readId(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  return raw && /^\d+$/.test(raw) ? Number(raw) : undefined
}

export default async function InvoicePrintPage(props: PageProps<'/invoice/print'>) {
  // Must reflect the database at request time, not build time.
  await connection()
  const params = await props.searchParams
  const fromId = readId(params.from)
  const toId = readId(params.to)
  // Cancelled bills are left out unless asked for; an unticked box sends nothing.
  const includeCancelled = params.cancelled === '1'

  const numbers = await listInvoiceNumbers()
  const invoices =
    fromId === undefined || toId === undefined
      ? null
      : await listInvoicesForPrint(fromId, toId, includeCancelled)

  const shown = invoices?.slice(0, MAX_BILLS) ?? []
  const firstId = numbers[0]?.inv_id
  const lastId = numbers.at(-1)?.inv_id

  return (
    <section className="page print:max-w-none">
      <div className="print:hidden">
        <div className="page-header">
          <div>
            <h2 className="page-title">Print Invoices</h2>
            <p className="mt-1 text-sm text-slate-500">
              Pick a range of invoice numbers and print every bill in it at once.
            </p>
          </div>
          <Link href="/invoice/list" className="btn-secondary">
            All invoices
          </Link>
        </div>

        {numbers.length === 0 ? (
          <p className="empty-state">
            No invoices yet.{' '}
            <Link href="/invoice" className="link">
              Create one
            </Link>
          </p>
        ) : (
          // GET form: the range sits in the URL, so it can be reloaded or bookmarked.
          <Form
            action="/invoice/print"
            className="filter-bar grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]"
          >
            <div>
              <label htmlFor="print-from" className="label">
                From invoice
              </label>
              <select
                id="print-from"
                name="from"
                defaultValue={String(fromId ?? firstId)}
                className="input"
              >
                {numbers.map((row) => (
                  <option key={row.inv_id} value={row.inv_id}>
                    {row.invoicenumber}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="print-to" className="label">
                To invoice
              </label>
              <select
                id="print-to"
                name="to"
                defaultValue={String(toId ?? lastId)}
                className="input"
              >
                {numbers.map((row) => (
                  <option key={row.inv_id} value={row.inv_id}>
                    {row.invoicenumber}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="cancelled"
                value="1"
                defaultChecked={includeCancelled}
                className="h-4 w-4 rounded border-slate-300 accent-sky-600"
              />
              Include cancelled
            </label>
            <button type="submit" className="btn-primary">
              Show bills
            </button>
          </Form>
        )}

        {invoices !== null && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-5 py-4">
            <p className="text-sm text-sky-900">
              {invoices.length === 0 ? (
                'No invoices in this range.'
              ) : (
                <>
                  <span className="font-semibold">{shown.length}</span> bill
                  {shown.length === 1 ? '' : 's'} ready —{' '}
                  {shown[0].invoicenumber} to {shown.at(-1)?.invoicenumber}. Each prints on its own
                  page.
                  {invoices.length > MAX_BILLS &&
                    ` Only the first ${MAX_BILLS} of ${invoices.length} are shown; print the rest as a second range.`}
                </>
              )}
            </p>
            {shown.length > 0 && <PrintButton label={`Print ${shown.length} bill${shown.length === 1 ? '' : 's'}`} />}
          </div>
        )}
      </div>

      <div className="space-y-8 print:space-y-0">
        {shown.map((invoice, index) => (
          // Every bill after the first starts a new sheet of paper.
          <div key={invoice.inv_id} className={index > 0 ? 'print:break-before-page' : undefined}>
            <Bill invoice={invoice} toolbar={false} />
          </div>
        ))}
      </div>
    </section>
  )
}
