import React from 'react'
import { connection } from 'next/server'

import InvoiceForm from '@/components/invoice/invoice-form'
import SearchBar from '@/components/form/search-bar'
import { createInvoice } from '@/app/invoice/actions'
import { listProducts } from '@/api/services/product.service'
import { DEFAULT_PRODUCT_SEARCH } from '@/lib/product'
import { listRetailers } from '@/api/services/retailer.service'
import { getInvoice, suggestInvoiceNumber } from '@/api/services/invoice.service'
import { EMPTY_INVOICE } from '@/lib/invoice'

interface InvoiceProps {
  /** An invoice just updated, announced above the fresh form. */
  updatedId?: number
}

const Invoice = async ({ updatedId }: InvoiceProps) => {
  // Retailers, products and the suggested number must reflect the database at
  // request time. Without this the page is prerendered and those lists freeze
  // at build time. Preferred over `export const dynamic`, which Next 16 drops
  // once Cache Components is enabled.
  await connection()

  const [retailers, products, invoicenumber, updated] = await Promise.all([
    listRetailers(),
    // By name, so the product dropdown reads alphabetically.
    listProducts(DEFAULT_PRODUCT_SEARCH),
    suggestInvoiceNumber(),
    updatedId === undefined ? null : getInvoice(updatedId),
  ])

  return (
    <>
      {/* Sits above the form; searching opens the filtered invoice list. */}
      <div className="page max-w-4xl">
        <SearchBar
          action="/invoice/list"
          textLabel="Invoice number"
          textPlaceholder="e.g. INV-0012"
        />
      </div>
      <InvoiceForm
        mode="create"
        initialValues={{
          ...EMPTY_INVOICE,
          invoicenumber,
          // Dated on the server so the value is identical in the SSR markup and
          // after hydration, whatever the browser's clock says.
          invoicedate: new Date().toISOString().slice(0, 10),
        }}
        // Decimal and Date are not serialisable across the server/client
        // boundary, so only the plain fields the form needs are passed through.
        retailers={retailers.map((r) => ({
          ret_id: r.ret_id,
          retailername: r.retailername,
        }))}
        products={products.map((p) => ({
          p_id: p.p_id,
          p_name: p.p_name,
          p_price: p.p_price === null ? null : p.p_price.toFixed(2),
          p_cgst: p.p_cgst.toFixed(2),
          p_sgst: p.p_sgst.toFixed(2),
          p_stock: p.p_stock,
        }))}
        action={createInvoice}
        notice={
          updated
            ? {
                message: `Invoice ${updated.invoicenumber} updated — total ${updated.totalamount.toFixed(2)}.`,
                invoiceId: updated.inv_id,
              }
            : undefined
        }
      />
    </>
  )
}

export default Invoice
