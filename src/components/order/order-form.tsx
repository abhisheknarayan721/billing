'use client'

import React, { useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'

import {
  EMPTY_ORDER_LINE,
  EMPTY_ORDER_STATE,
  NOTES_MAX_LENGTH,
  ORDER_STATUSES,
  type OrderFormState,
  type OrderLineValues,
  type OrderValues,
  orderLineErrorKey,
} from '@/lib/order'

export interface OrderRetailerOption {
  ret_id: number
  retailername: string
}

export interface OrderProductOption {
  p_id: number
  p_name: string
  /** Serialised Decimal — a Prisma.Decimal cannot cross into a Client Component. */
  p_price: string | null
  /** Shown beside the line so a short order can be spotted before it is invoiced. */
  p_stock: number | null
}

interface OrderFormProps {
  /** Create clears itself after saving; edit goes back to the order list. */
  mode: 'create' | 'edit'
  initialValues: OrderValues
  retailers: OrderRetailerOption[]
  products: OrderProductOption[]
  action: (state: OrderFormState, formData: FormData) => Promise<OrderFormState>
  /** Only admins can add retailers; others are told to ask one. */
  canAddRetailer: boolean
}

const errorClass = 'mt-1 text-xs text-red-600'

/** Preview arithmetic only, in integer paise; the server recomputes with Decimal. */
function previewCents(quantity: string, unitprice: string): number {
  const q = Number(quantity)
  const p = Number(unitprice)
  if (!Number.isFinite(q) || !Number.isFinite(p)) return 0
  return Math.round(q * Math.round(p * 100))
}

const money = (cents: number) => (cents / 100).toFixed(2)

const Required = () => <span className="ml-0.5 text-red-600">*</span>

const OrderForm = ({
  mode,
  initialValues,
  retailers,
  products,
  action,
  canAddRetailer,
}: OrderFormProps) => {
  const [state, formAction, pending] = useActionState(action, EMPTY_ORDER_STATE)

  const [orderNumber, setOrderNumber] = useState(initialValues.ordernumber)
  const [orderDate, setOrderDate] = useState(initialValues.orderdate)
  const [retId, setRetId] = useState(initialValues.ret_id)
  const [notes, setNotes] = useState(initialValues.notes)
  const [status, setStatus] = useState(initialValues.status)
  const [items, setItems] = useState<OrderLineValues[]>(initialValues.items)
  const handled = useRef<string | undefined>(undefined)

  // Clear the form once per successful create and roll the number on. The
  // order date is kept, since the next order is usually taken the same day.
  useEffect(() => {
    if (mode === 'create' && state.status === 'success' && state.message !== handled.current) {
      handled.current = state.message
      setOrderNumber(state.nextOrderNumber ?? '')
      setRetId('')
      setNotes('')
      setItems([{ ...EMPTY_ORDER_LINE }])
    }
  }, [state, mode])

  const updateLine = (index: number, patch: Partial<OrderLineValues>) => {
    setItems((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  const onPickProduct = (index: number, productId: string) => {
    const product = products.find((p) => String(p.p_id) === productId)
    updateLine(index, {
      p_id: productId,
      productname: product?.p_name ?? '',
      unitprice: product?.p_price ?? items[index].unitprice,
    })
  }

  const totalCents = items.reduce((sum, line) => sum + previewCents(line.quantity, line.unitprice), 0)

  return (
    <section className="page max-w-4xl">
      <div className="page-header">
        <h2 className="page-title">
          {mode === 'create' ? 'New Order' : `Edit Order ${initialValues.ordernumber}`}
        </h2>
        <Link href="/order/list" className="text-sm link">
          All orders
        </Link>
      </div>

      {state.message && (
        <p
          role="status"
          className={`mb-6 ${state.status === 'success' ? 'alert-success' : 'alert-error'}`}
        >
          {state.message}
        </p>
      )}

      <form action={formAction} noValidate>
        {/* A new order always starts Pending; the edit page offers the picker. */}
        {mode === 'create' && <input type="hidden" name="status" value={initialValues.status} />}

        <div className="card grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2 sm:p-6">
          <div className="sm:col-span-2">
            <label htmlFor="ret_id" className="label">
              Retailer<Required />
            </label>
            <select
              id="ret_id"
              name="ret_id"
              value={retId}
              onChange={(event) => setRetId(event.target.value)}
              disabled={pending}
              className="input"
            >
              <option value="">- select retailer -</option>
              {retailers.map((retailer) => (
                <option key={retailer.ret_id} value={retailer.ret_id}>
                  {retailer.retailername}
                </option>
              ))}
            </select>
            {state.errors.ret_id && <p className={errorClass}>{state.errors.ret_id}</p>}
            {retailers.length === 0 && (
              <p className="mt-1 text-xs text-slate-500">
                No retailers yet.{' '}
                {canAddRetailer ? (
                  <>
                    <Link href="/ledger/retailer" className="link">
                      Add a retailer
                    </Link>{' '}
                    first.
                  </>
                ) : (
                  'Ask an admin to add one.'
                )}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="ordernumber" className="label">
              Order Number<Required />
            </label>
            <input
              id="ordernumber"
              name="ordernumber"
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              maxLength={100}
              disabled={pending}
              className="input"
            />
            {state.errors.ordernumber && <p className={errorClass}>{state.errors.ordernumber}</p>}
          </div>

          <div>
            <label htmlFor="orderdate" className="label">
              Order Date<Required />
            </label>
            <input
              id="orderdate"
              name="orderdate"
              type="date"
              value={orderDate}
              onChange={(event) => setOrderDate(event.target.value)}
              disabled={pending}
              className="input"
            />
            {state.errors.orderdate && <p className={errorClass}>{state.errors.orderdate}</p>}
          </div>

          {mode === 'edit' && (
            <div>
              <label htmlFor="status" className="label">
                Status<Required />
              </label>
              <select
                id="status"
                name="status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                disabled={pending}
                className="input"
              >
                {ORDER_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {state.errors.status && <p className={errorClass}>{state.errors.status}</p>}
            </div>
          )}

          <div className="sm:col-span-2">
            <label htmlFor="notes" className="label">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={NOTES_MAX_LENGTH}
              disabled={pending}
              placeholder="e.g. taken over phone, deliver to back gate"
              className="input"
            />
            {state.errors.notes && <p className={errorClass}>{state.errors.notes}</p>}
          </div>
        </div>

        <h3 className="mb-2 mt-8 text-sm font-semibold text-slate-900">Items Ordered</h3>
        {state.errors.items && <p className={`mb-2 ${errorClass}`}>{state.errors.items}</p>}

        <div className="space-y-3">
          {items.map((line, index) => {
            const selectedProduct = products.find((p) => String(p.p_id) === line.p_id)
            const short =
              selectedProduct !== undefined &&
              Number(line.quantity) > (selectedProduct.p_stock ?? 0)

            return (
              <div
                key={index}
                className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto] sm:items-start"
              >
                <div>
                  <label className="label" htmlFor={`item_product_${index}`}>
                    Product<Required />
                  </label>
                  <select
                    id={`item_product_${index}`}
                    value={line.p_id}
                    onChange={(event) => onPickProduct(index, event.target.value)}
                    disabled={pending}
                    className="input"
                  >
                    <option value="">- select product -</option>
                    {products.map((product) => (
                      <option key={product.p_id} value={product.p_id}>
                        {product.p_name}
                      </option>
                    ))}
                  </select>
                  <input type="hidden" name="item_p_id" value={line.p_id} />
                  <input type="hidden" name="item_productname" value={line.productname} />
                  {selectedProduct && (
                    <p className={`mt-1 text-xs ${short ? 'text-amber-700' : 'text-slate-500'}`}>
                      In stock: {selectedProduct.p_stock ?? 0}
                      {short && ' — not enough to fill this line'}
                    </p>
                  )}
                  {state.errors[orderLineErrorKey(index, 'productname')] && (
                    <p className={errorClass}>{state.errors[orderLineErrorKey(index, 'productname')]}</p>
                  )}
                </div>

                <div>
                  <label className="label" htmlFor={`item_quantity_${index}`}>
                    Qty<Required />
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
                    className="input"
                  />
                  {state.errors[orderLineErrorKey(index, 'quantity')] && (
                    <p className={errorClass}>{state.errors[orderLineErrorKey(index, 'quantity')]}</p>
                  )}
                </div>

                <div>
                  <label className="label" htmlFor={`item_unitprice_${index}`}>
                    Unit Price<Required />
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
                    className="input"
                  />
                  {state.errors[orderLineErrorKey(index, 'unitprice')] && (
                    <p className={errorClass}>{state.errors[orderLineErrorKey(index, 'unitprice')]}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 sm:flex-col sm:items-end sm:gap-2 sm:pt-6">
                  <span className="text-sm font-semibold tabular-nums text-slate-900">
                    {money(previewCents(line.quantity, line.unitprice))}
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
          onClick={() => setItems((current) => [...current, { ...EMPTY_ORDER_LINE }])}
          disabled={pending}
          className="mt-3 rounded-lg border border-dashed border-sky-400 bg-sky-50/50 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50 disabled:opacity-50"
        >
          + Add line
        </button>

        <dl className="card ml-auto mt-6 flex w-full justify-between p-5 text-base font-bold text-slate-900 sm:max-w-sm">
          <dt>Total Amount</dt>
          <dd className="tabular-nums">{money(totalCents)}</dd>
        </dl>

        <div className="mt-6 flex items-center gap-3">
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? 'Saving...' : mode === 'create' ? 'Save Order' : 'Update Order'}
          </button>
          {mode === 'edit' && (
            <Link href="/order/list" className="text-sm text-slate-600 hover:underline">
              Cancel
            </Link>
          )}
        </div>
      </form>
    </section>
  )
}

export default OrderForm
