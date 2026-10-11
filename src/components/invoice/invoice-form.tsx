'use client'

import React, { useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'

import {
  DEFAULT_LINE_RATE,
  EMPTY_INVOICE_STATE,
  EMPTY_LINE,
  INVOICE_STATUSES,
  type InvoiceFormState,
  type InvoiceLineValues,
  type InvoiceValues,
  lineErrorKey,
} from '@/lib/invoice'

export interface RetailerOption {
  ret_id: number
  retailername: string
}

export interface ProductOption {
  p_id: number
  p_name: string
  /** Serialised Decimal — a Prisma.Decimal cannot cross into a Client Component. */
  p_price: string | null
  /** The product's GST rates, copied onto a line when the product is picked. */
  p_cgst: string
  p_sgst: string
  /** Shown beside the line, since invoicing takes the quantity off it. */
  p_stock: number | null
}

interface InvoiceFormProps {
  /** Create clears itself after saving; edit keeps showing the saved invoice. */
  mode: 'create' | 'edit'
  initialValues: InvoiceValues
  retailers: RetailerOption[]
  products: ProductOption[]
  action: (state: InvoiceFormState, formData: FormData) => Promise<InvoiceFormState>
  /** A success carried over from another page (an update), shown until this form is submitted. */
  notice?: { message: string; invoiceId: number }
}

const inputClass =
  'input'
const labelClass = 'label'
const errorClass = 'mt-1 text-xs text-red-600'

/**
 * Preview arithmetic only, done in integer paise/cents to avoid float drift.
 * The server recomputes every figure with Decimal and ignores anything sent.
 */
function previewCents(quantity: string, unitprice: string): number {
  const q = Number(quantity)
  const p = Number(unitprice)
  if (!Number.isFinite(q) || !Number.isFinite(p)) return 0
  return Math.round(q * Math.round(p * 100))
}

const money = (cents: number) => (cents / 100).toFixed(2)

const InvoiceForm = ({
  mode,
  initialValues,
  retailers,
  products,
  action,
  notice,
}: InvoiceFormProps) => {
  const [actionState, formAction, pending] = useActionState(action, EMPTY_INVOICE_STATE)
  // Until this form is used, a carried-over notice reads like one of its own saves.
  const state: InvoiceFormState =
    actionState.status === 'idle' && notice
      ? { ...actionState, message: notice.message, savedInvoiceId: notice.invoiceId, status: 'success' }
      : actionState

  const [invoiceNumber, setInvoiceNumber] = useState(initialValues.invoicenumber)
  const [invoiceDate, setInvoiceDate] = useState(initialValues.invoicedate)
  const [retId, setRetId] = useState(initialValues.ret_id)
  const [billTo, setBillTo] = useState(initialValues.billto)
  const [status, setStatus] = useState(initialValues.status)
  const [items, setItems] = useState<InvoiceLineValues[]>(initialValues.items)
  const handled = useRef<string | undefined>(undefined)

  // Clear the form once per successful save and roll the suggested number on,
  // but only when creating — an edit keeps showing the invoice it just saved.
  // Local state survives a rejected submission either way, so typed values stay
  // put. The date is kept as the page supplied it rather than blanked, since
  // the next invoice is almost always being raised on the same day.
  useEffect(() => {
    // actionState, not state: a carried-over notice is not a save of this form.
    if (
      mode === 'create' &&
      actionState.status === 'success' &&
      actionState.message !== handled.current
    ) {
      handled.current = actionState.message
      setInvoiceNumber(actionState.nextInvoiceNumber ?? '')
      setRetId('')
      setBillTo('')
      setItems([{ ...EMPTY_LINE }])
    }
  }, [actionState, mode])

  const updateLine = (index: number, patch: Partial<InvoiceLineValues>) => {
    setItems((current) =>
      current.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    )
  }

  const onPickProduct = (index: number, productId: string) => {
    const product = products.find((p) => String(p.p_id) === productId)
    updateLine(index, {
      p_id: productId,
      productname: product?.p_name ?? '',
      unitprice: product?.p_price ?? items[index].unitprice,
      // The product's rates are a starting point; they can be changed per line.
      cgstrate: product?.p_cgst ?? items[index].cgstrate,
      sgstrate: product?.p_sgst ?? items[index].sgstrate,
    })
  }

  const onPickRetailer = (value: string) => {
    setRetId(value)
    const retailer = retailers.find((r) => String(r.ret_id) === value)
    if (retailer) setBillTo(retailer.retailername)
  }

  const subtotalCents = items.reduce(
    (sum, line) => sum + previewCents(line.quantity, line.unitprice),
    0,
  )
  // Preview only, like every other figure here — the server recomputes each
  // line's tax with Decimal and ignores what the browser worked out. Same rule
  // as the server: every line's tax is rounded before the lines are summed.
  const taxCentsOf = (key: 'cgstrate' | 'sgstrate') =>
    items.reduce((sum, line) => {
      const rate = Number(line[key] || 0)
      if (!Number.isFinite(rate)) return sum
      return sum + Math.round((previewCents(line.quantity, line.unitprice) * rate) / 100)
    }, 0)
  const cgstCents = taxCentsOf('cgstrate')
  const sgstCents = taxCentsOf('sgstrate')
  const taxCents = cgstCents + sgstCents
  // Same rule as the server: GST is subtracted from the subtotal, and the
  // total is rounded to the nearest whole rupee.
  const unroundedCents = subtotalCents - taxCents
  const totalCents = Math.round(unroundedCents / 100) * 100
  const roundOffCents = totalCents - unroundedCents

  return (
    <section className="page max-w-4xl">
      <div className="page-header">
        <h2 className="page-title">
          {mode === 'create' ? 'Create Invoice' : `Edit Invoice ${initialValues.invoicenumber}`}
        </h2>
        <Link href="/invoice/list" className="text-sm link">
          All invoices
        </Link>
      </div>

      {state.message && (
        <p
          role="status"
          className={`mb-6 ${
            state.status === 'success'
              ? 'alert-success'
              : 'alert-error'
          }`}
        >
          {state.message}
        </p>
      )}

      {state.status === 'success' && state.savedInvoiceId !== undefined && (
        <p className="-mt-3 mb-6">
          <Link
            href={`/invoice/${state.savedInvoiceId}`}
            className="text-sm link"
          >
            Print bill
          </Link>
        </p>
      )}

      <form action={formAction} noValidate>
        {/* A new invoice always starts as a Draft; only the edit page offers
            the Status picker, pre-set to the saved status so an edit cannot
            quietly knock a Paid invoice back to Draft. */}
        {mode === 'create' && <input type="hidden" name="status" value={initialValues.status} />}
        {/* Tells the server to read each line's CGST/SGST rates as percentages
            of its amount rather than the flat taxamount an API caller may send. */}
        <input type="hidden" name="taxmode" value="rate" />

        <div className="card grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2 sm:p-6">
          <div>
            <label htmlFor="invoicenumber" className={labelClass}>
              Invoice Number<span className="ml-0.5 text-red-600">*</span>
            </label>
            <input
              id="invoicenumber"
              name="invoicenumber"
              value={invoiceNumber}
              onChange={(event) => setInvoiceNumber(event.target.value)}
              maxLength={100}
              disabled={pending}
              className={inputClass}
            />
            {state.errors.invoicenumber && (
              <p className={errorClass}>{state.errors.invoicenumber}</p>
            )}
          </div>

          <div>
            <label htmlFor="invoicedate" className={labelClass}>
              Invoice Date<span className="ml-0.5 text-red-600">*</span>
            </label>
            <input
              id="invoicedate"
              name="invoicedate"
              type="date"
              value={invoiceDate}
              onChange={(event) => setInvoiceDate(event.target.value)}
              disabled={pending}
              className={inputClass}
            />
            {state.errors.invoicedate && (
              <p className={errorClass}>{state.errors.invoicedate}</p>
            )}
          </div>

          <div>
            <label htmlFor="ret_id" className={labelClass}>
              Retailer
            </label>
            <select
              id="ret_id"
              name="ret_id"
              value={retId}
              onChange={(event) => onPickRetailer(event.target.value)}
              disabled={pending}
              className={inputClass}
            >
              <option value="">- none -</option>
              {retailers.map((retailer) => (
                <option key={retailer.ret_id} value={retailer.ret_id}>
                  {retailer.retailername}
                </option>
              ))}
            </select>
            {state.errors.ret_id && <p className={errorClass}>{state.errors.ret_id}</p>}
          </div>

          <div>
            <label htmlFor="billto" className={labelClass}>
              Bill To<span className="ml-0.5 text-red-600">*</span>
            </label>
            <input
              id="billto"
              name="billto"
              value={billTo}
              onChange={(event) => setBillTo(event.target.value)}
              maxLength={250}
              disabled={pending}
              className={inputClass}
            />
            {state.errors.billto && <p className={errorClass}>{state.errors.billto}</p>}
          </div>

          {mode === 'edit' && (
            <div>
              <label htmlFor="status" className={labelClass}>
                Status<span className="ml-0.5 text-red-600">*</span>
              </label>
              <select
                id="status"
                name="status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                disabled={pending}
                className={inputClass}
              >
                {INVOICE_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {state.errors.status && <p className={errorClass}>{state.errors.status}</p>}
              {status !== initialValues.status &&
                (status === 'Cancelled' || initialValues.status === 'Cancelled') && (
                  <p className="mt-1 text-xs text-amber-700">
                    {status === 'Cancelled'
                      ? 'Saving puts this invoice’s goods back into stock and drops it from the retailer’s balance.'
                      : 'Saving takes this invoice’s goods out of stock again and adds it back to the retailer’s balance.'}
                  </p>
                )}
            </div>
          )}

         
        </div>

        <h3 className="mb-2 mt-8 text-sm font-semibold text-slate-900">Line Items</h3>
        {state.errors.items && <p className={`mb-2 ${errorClass}`}>{state.errors.items}</p>}

        <div className="space-y-3">
          {items.map((line, index) => {
            const selectedProduct = products.find((p) => String(p.p_id) === line.p_id)
            // What this line leaves behind, so overselling is visible before
            // the invoice is saved rather than after.
            const stockAfter =
              selectedProduct === undefined || !Number.isFinite(Number(line.quantity))
                ? null
                : (selectedProduct.p_stock ?? 0) - Number(line.quantity || 0)

            return (
            <div
              key={index}
              // Product, Qty, Unit Price, CGST %, SGST % share the row; the line
              // total and Remove sit on their own row below, at the right.
              className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.25fr)_minmax(0,1.25fr)]"
            >
              <div>
                <label className={labelClass} htmlFor={`item_productname_${index}`}>
                  Product<span className="ml-0.5 text-red-600">*</span>
                </label>
                <select
                  id={`item_productname_${index}`}
                  value={line.p_id}
                  onChange={(event) => onPickProduct(index, event.target.value)}
                  disabled={pending}
                  className={inputClass}
                >
                  <option value="">- select product -</option>
                  {products.map((product) => (
                    <option key={product.p_id} value={product.p_id}>
                      {product.p_name}
                    </option>
                  ))}
                </select>
                <input type="hidden" name="item_p_id" value={line.p_id} />
                {/* The name is still saved on the line, filled from the picked product. */}
                <input type="hidden" name="item_productname" value={line.productname} />
                {selectedProduct && (
                  <p className="mt-1 text-xs text-slate-500">
                    In stock: {selectedProduct.p_stock ?? 0}
                    {stockAfter !== null && ` -> ${stockAfter} after this invoice`}
                  </p>
                )}
                {state.errors[lineErrorKey(index, 'productname')] && (
                  <p className={errorClass}>
                    {state.errors[lineErrorKey(index, 'productname')]}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass} htmlFor={`item_quantity_${index}`}>
                  Qty<span className="ml-0.5 text-red-600">*</span>
                </label>
                <input
                  id={`item_quantity_${index}`}
                  name="item_quantity"
                  type="number"
                  step="1"
                  min={1}
                  value={line.quantity}
                  onChange={(event) => updateLine(index, { quantity: event.target.value })}
                  disabled={pending}
                  className={inputClass}
                />
                {state.errors[lineErrorKey(index, 'quantity')] && (
                  <p className={errorClass}>
                    {state.errors[lineErrorKey(index, 'quantity')]}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass} htmlFor={`item_unitprice_${index}`}>
                  Unit Price<span className="ml-0.5 text-red-600">*</span>
                </label>
                <input
                  id={`item_unitprice_${index}`}
                  name="item_unitprice"
                  type="number"
                  step="0.01"
                  min={0}
                  value={line.unitprice}
                  onChange={(event) => updateLine(index, { unitprice: event.target.value })}
                  disabled={pending}
                  className={inputClass}
                />
                {state.errors[lineErrorKey(index, 'unitprice')] && (
                  <p className={errorClass}>
                    {state.errors[lineErrorKey(index, 'unitprice')]}
                  </p>
                )}
              </div>

              {(['cgstrate', 'sgstrate'] as const).map((field) => (
                <div key={field}>
                  <label className={labelClass} htmlFor={`item_${field}_${index}`}>
                    {field === 'cgstrate' ? 'CGST %' : 'SGST %'}
                  </label>
                  <input
                    id={`item_${field}_${index}`}
                    name={`item_${field}`}
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                    value={line[field]}
                    onChange={(event) => updateLine(index, { [field]: event.target.value })}
                    // A cleared rate means no GST, so it reads 0.00 rather than blank.
                    onBlur={(event) => {
                      if (event.target.value.trim() === '') {
                        updateLine(index, { [field]: DEFAULT_LINE_RATE })
                      }
                    }}
                    disabled={pending}
                    placeholder="0"
                    title="Charged on this line's amount. Enter 0 for none."
                    className={inputClass}
                  />
                  {state.errors[lineErrorKey(index, field)] && (
                    <p className={errorClass}>{state.errors[lineErrorKey(index, field)]}</p>
                  )}
                </div>
              ))}

              <div className="flex items-center justify-end gap-3 col-span-full">
                <span className="text-sm text-slate-600">
                  Amount:{' '}
                  <span
                    className="font-semibold tabular-nums text-slate-900"
                    data-testid={`line-total-${index}`}
                  >
                    {money(previewCents(line.quantity, line.unitprice))}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                  disabled={pending || items.length === 1}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Remove line ${index + 1}`}
                >
                  Remove
                </button>
              </div>
            </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => setItems((current) => [...current, { ...EMPTY_LINE }])}
          disabled={pending}
          className="mt-3 rounded-lg border border-dashed border-sky-400 bg-sky-50/50 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50 disabled:opacity-50"
        >
          + Add line
        </button>
        <dl className="card ml-auto mt-6 w-full space-y-2 p-5 text-sm sm:max-w-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Subtotal</dt>
            <dd className="tabular-nums" data-testid="subtotal">
              {money(subtotalCents)}
            </dd>
          </div>
          {/* The sum of every line's CGST and SGST, at each line's own rates. */}
          <div className="flex justify-between">
            <dt className="text-slate-600">CGST</dt>
            <dd className="tabular-nums" data-testid="cgst">
              {money(cgstCents)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">SGST</dt>
            <dd className="tabular-nums" data-testid="sgst">
              {money(sgstCents)}
            </dd>
          </div>
          {state.errors.taxamount && <p className={errorClass}>{state.errors.taxamount}</p>}
          <div className="flex justify-between">
            <dt className="text-slate-600">Round Off</dt>
            <dd className="tabular-nums" data-testid="roundoff">
              {roundOffCents > 0 ? '+' : ''}
              {money(roundOffCents)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
            <dt>Total</dt>
            <dd className="tabular-nums" data-testid="total">
              {money(totalCents)}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="btn-primary"
          >
            {pending ? 'Saving...' : mode === 'create' ? 'Save Invoice' : 'Update Invoice'}
          </button>
          {mode === 'edit' && (
            <Link href="/invoice/list" className="text-sm text-slate-600 hover:underline">
              Cancel
            </Link>
          )}
        </div>
      </form>
    </section>
  )
}

export default InvoiceForm
