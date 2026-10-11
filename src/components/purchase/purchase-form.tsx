'use client'

import React, { useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'

import {
  EMPTY_PURCHASE_FORM,
  EMPTY_PURCHASE_LINE,
  EMPTY_PURCHASE_STATE,
  PURCHASE_STATUSES,
  lineErrorKey,
  type PurchaseFormState,
  type PurchaseFormValues,
  type PurchaseLineValues,
} from '@/lib/purchase'

/**
 * No price here on purpose. A product's price is what it SELLS for; a purchase
 * records what it COST. The two are unrelated numbers, so the catalogue price
 * is never offered on this form and a purchase never writes back to it — the
 * only thing a purchase changes on a product is its stock.
 */
export interface ProductOption {
  p_id: number
  p_name: string
  p_stock: number | null
}

export interface SupplierOption {
  sup_id: number
  suppliername: string
}

interface PurchaseFormProps {
  heading: string
  submitLabel: string
  /**
   * Create takes a whole supplier bill — as many product lines as it covers —
   * and clears itself after saving. Edit opens one saved row as the first line
   * and keeps showing it; further lines added there are products added to the
   * same bill, saved as rows of their own.
   */
  mode: 'create' | 'edit'
  products: ProductOption[]
  suppliers: SupplierOption[]
  initialValues: PurchaseFormValues
  action: (state: PurchaseFormState, formData: FormData) => Promise<PurchaseFormState>
}

const inputClass =
  'input read-only:bg-slate-50'
const labelClass = 'label'
const errorClass = 'mt-1 text-xs text-red-600'

/**
 * Preview arithmetic only, done in integer paise/cents to avoid float drift.
 * The server recomputes every total with Decimal and ignores anything sent.
 */
function previewCents(quantity: string, unitprice: string): number {
  const q = Number(quantity)
  const p = Number(unitprice)
  if (!Number.isFinite(q) || !Number.isFinite(p)) return 0
  return Math.round(q * Math.round(p * 100))
}

function money(cents: number): string {
  return (cents / 100).toFixed(2)
}

const PurchaseForm = ({
  heading,
  submitLabel,
  mode,
  products,
  suppliers,
  initialValues,
  action,
}: PurchaseFormProps) => {
  const [state, formAction, pending] = useActionState(action, EMPTY_PURCHASE_STATE)

  const [values, setValues] = useState<PurchaseFormValues>(initialValues)
  const handled = useRef<string | undefined>(undefined)

  // Clear the form once per successful save, but only when creating. Local
  // state survives a rejected submission either way, so typed values stay put.
  // The date is kept as the page supplied it rather than blanked, since the
  // next purchase is almost always being entered on the same day.
  useEffect(() => {
    if (
      mode === 'create' &&
      state.status === 'success' &&
      state.message !== handled.current
    ) {
      handled.current = state.message
      setValues({
        ...EMPTY_PURCHASE_FORM,
        invoicedate: initialValues.invoicedate,
        // Fresh line objects rather than the ones on the constant, which the
        // next keystroke would otherwise be editing.
        lines: [{ ...EMPTY_PURCHASE_LINE }],
      })
    }
  }, [state, mode, initialValues])

  const update = (patch: Partial<PurchaseFormValues>) =>
    setValues((current) => ({ ...current, ...patch }))

  const updateLine = (index: number, patch: Partial<PurchaseLineValues>) =>
    setValues((current) => ({
      ...current,
      lines: current.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    }))

  const addLine = () =>
    setValues((current) => ({
      ...current,
      lines: [...current.lines, { ...EMPTY_PURCHASE_LINE }],
    }))

  const removeLine = (index: number) =>
    setValues((current) => ({
      ...current,
      lines: current.lines.filter((_, i) => i !== index),
    }))

  // Picking a product fills in the name and nothing else: the unit price is
  // always what this supplier charged on this bill, typed in by hand. As on the
  // invoice, lines come only from the catalogue — there is no hand-typed name.
  const onPickProduct = (index: number, productId: string) => {
    const product = products.find((p) => String(p.p_id) === productId)
    updateLine(index, {
      p_id: productId,
      productname: product?.p_name ?? '',
    })
  }

  // The column stores the supplier's name rather than an id, so the options are
  // names and duplicates collapse. A value already on the row that no longer
  // matches a supplier — a renamed one, or free text from before this was a
  // select — is kept as an option of its own, otherwise editing an unrelated
  // field would silently blank it.
  const supplierNames = Array.from(
    new Set(
      values.purchasedby === ''
        ? suppliers.map((supplier) => supplier.suppliername)
        : [values.purchasedby, ...suppliers.map((supplier) => supplier.suppliername)],
    ),
  )

  const totalCents = values.lines.reduce(
    (sum, line) => sum + previewCents(line.quantity, line.unitprice),
    0,
  )

  const savedIds = state.savedPurchaseIds ?? []

  return (
    <section className="page max-w-4xl">
      <div className="page-header">
        <h2 className="page-title">{heading}</h2>
        <Link href="/purchase/list" className="text-sm link">
          All purchases
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

      {state.status === 'success' &&
        (savedIds.length > 1 || (mode === 'create' && savedIds.length === 1)) && (
          <p className="-mt-3 mb-6">
            {savedIds.length === 1 ? (
              <Link
                href={`/purchase/${savedIds[0]}/edit`}
                className="text-sm link"
              >
                Edit that purchase
              </Link>
            ) : (
              // Each line is its own row, so there is no single page to edit them
              // on — the list is where they can be opened one at a time.
              <Link
                href="/purchase/list"
                className="text-sm link"
              >
                See those {savedIds.length} lines in the list
              </Link>
            )}
          </p>
        )}

      {products.length === 0 && (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          There are no products yet.{' '}
          <Link href="/product" className="font-medium underline">
            Add a product
          </Link>{' '}
          first, then record the purchase against it.
        </p>
      )}

      <form action={formAction} noValidate>
        <div className="card grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2 sm:p-6">
          <div className="sm:col-span-2">
            <label htmlFor="purchasedby" className={labelClass}>
              Purchased By<span className="ml-0.5 text-red-600">*</span>
            </label>
            <select
              id="purchasedby"
              name="purchasedby"
              value={values.purchasedby}
              onChange={(event) => update({ purchasedby: event.target.value })}
              disabled={pending}
              className={inputClass}
            >
              <option value="">- select a supplier -</option>
              {supplierNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {suppliers.length === 0 && (
              <p className="mt-1 text-xs text-slate-500">
                No suppliers yet —{' '}
                <Link href="/ledger/supplier" className="underline">
                  add one
                </Link>
                .
              </p>
            )}
            {state.errors.purchasedby && (
              <p className={errorClass}>{state.errors.purchasedby}</p>
            )}
          </div>

          <div>
            <label htmlFor="invoicenumber" className={labelClass}>
              Invoice Number
            </label>
            <input
              id="invoicenumber"
              name="invoicenumber"
              value={values.invoicenumber}
              onChange={(event) => update({ invoicenumber: event.target.value })}
              maxLength={100}
              disabled={pending}
              placeholder="Number on the supplier bill"
              className={inputClass}
            />
            {state.errors.invoicenumber && (
              <p className={errorClass}>{state.errors.invoicenumber}</p>
            )}
          </div>

          <div>
            <label htmlFor="invoicedate" className={labelClass}>
              Purchase Date<span className="ml-0.5 text-red-600">*</span>
            </label>
            <input
              id="invoicedate"
              name="invoicedate"
              type="date"
              value={values.invoicedate}
              onChange={(event) => update({ invoicedate: event.target.value })}
              disabled={pending}
              className={inputClass}
            />
            {state.errors.invoicedate && (
              <p className={errorClass}>{state.errors.invoicedate}</p>
            )}
          </div>

          <div>
            <label htmlFor="status" className={labelClass}>
              Status
            </label>
            <select
              id="status"
              name="status"
              value={values.status}
              onChange={(event) => update({ status: event.target.value })}
              disabled={pending}
              className={inputClass}
            >
              {PURCHASE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            {state.errors.status && <p className={errorClass}>{state.errors.status}</p>}
            <p className="mt-1 text-xs text-slate-500">
              Cancelled purchases do not add to stock.
            </p>
          </div>
        </div>

        <h3 className="mb-2 mt-8 text-sm font-semibold text-slate-900">
          {values.lines.length === 1 ? 'Product' : 'Products'}
        </h3>
        {state.errors.lines && <p className={`mb-2 ${errorClass}`}>{state.errors.lines}</p>}

        <div className="space-y-3">
          {values.lines.map((line, index) => {
            const selected = products.find((p) => String(p.p_id) === line.p_id)

            return (
              <div
                key={index}
                className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-12"
              >
                <div className="sm:col-span-5">
                  <label className={labelClass} htmlFor={`item_product_${index}`}>
                    Product<span className="ml-0.5 text-red-600">*</span>
                  </label>
                  <select
                    id={`item_product_${index}`}
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
                  {/* The name is still saved on the line, filled from the picked
                      product. Every line posts it, or the parallel line arrays
                      would misalign. */}
                  <input type="hidden" name="item_productname" value={line.productname} />
                  {selected ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Current stock: {selected.p_stock ?? 0}
                    </p>
                  ) : (
                    // A purchase saved by hand before this change still carries
                    // its typed name; it is kept unless a product is picked.
                    line.productname !== '' && (
                      <p className="mt-1 text-xs text-slate-500">
                        Saved as: {line.productname}
                      </p>
                    )
                  )}
                  {state.errors[lineErrorKey(index, 'productname')] && (
                    <p className={errorClass}>
                      {state.errors[lineErrorKey(index, 'productname')]}
                    </p>
                  )}
                  {state.errors[lineErrorKey(index, 'p_id')] && (
                    <p className={errorClass}>
                      {state.errors[lineErrorKey(index, 'p_id')]}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
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
                    onChange={(event) =>
                      updateLine(index, { quantity: event.target.value })
                    }
                    disabled={pending}
                    className={inputClass}
                  />
                  {state.errors[lineErrorKey(index, 'quantity')] && (
                    <p className={errorClass}>
                      {state.errors[lineErrorKey(index, 'quantity')]}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-3">
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
                    onChange={(event) =>
                      updateLine(index, { unitprice: event.target.value })
                    }
                    disabled={pending}
                    placeholder="Cost on this bill"
                    className={inputClass}
                  />
                  {state.errors[lineErrorKey(index, 'unitprice')] && (
                    <p className={errorClass}>
                      {state.errors[lineErrorKey(index, 'unitprice')]}
                    </p>
                  )}
                </div>

                <div className="flex items-end justify-between gap-2 sm:col-span-2">
                  <span className="text-sm tabular-nums text-slate-700">
                    {money(previewCents(line.quantity, line.unitprice))}
                  </span>
                  {/* The first line of an edit IS the saved row, and dropping
                      it would be deleting the purchase — which this form does
                      not do. Only the lines being added can be removed again. */}
                  {(mode === 'create' || index > 0) && (
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      disabled={pending || values.lines.length === 1}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Remove line ${index + 1}`}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={addLine}
              disabled={pending}
              className="btn-secondary"
            >
              Add product
            </button>
            {mode === 'edit' && values.lines.length > 1 && (
              <p className="mt-1 text-xs text-slate-500">
                The first line updates this purchase; the{' '}
                {values.lines.length === 2 ? 'other' : `other ${values.lines.length - 1}`}{' '}
                will be saved as new lines on the same bill.
              </p>
            )}
          </div>
          <p className="text-sm text-slate-700">
            Total:{' '}
            <span className="font-semibold tabular-nums text-slate-900">
              {money(totalCents)}
            </span>
          </p>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="btn-primary"
          >
            {pending ? 'Saving...' : submitLabel}
          </button>
          {mode === 'edit' && (
            <Link href="/purchase/list" className="text-sm text-slate-600 hover:underline">
              Cancel
            </Link>
          )}
        </div>
      </form>
    </section>
  )
}

export default PurchaseForm
