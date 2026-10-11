import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import InvoiceForm from '@/components/invoice/invoice-form'
import { updateInvoice } from '@/app/invoice/actions'
import { getInvoice } from '@/api/services/invoice.service'
import { listProducts } from '@/api/services/product.service'
import { DEFAULT_PRODUCT_SEARCH } from '@/lib/product'
import { listRetailers } from '@/api/services/retailer.service'
import { toInvoiceValues } from '@/api/lib/invoice'

export const metadata = {
  title: 'Edit Invoice',
}

export default async function InvoiceEditPage(
  props: PageProps<'/invoice/[inv_id]/edit'>,
) {
  const { inv_id } = await props.params

  // Reject non-numeric ids before they reach the database.
  if (!/^\d+$/.test(inv_id)) notFound()

  // The invoice and the two option lists must be read at request time, not
  // frozen at build time.
  await connection()

  const [invoice, retailers, products] = await Promise.all([
    getInvoice(Number(inv_id)),
    listRetailers(),
    // By name, so the product dropdown reads alphabetically.
    listProducts(DEFAULT_PRODUCT_SEARCH),
  ])

  if (!invoice) notFound()

  return (
    <InvoiceForm
      mode="edit"
      initialValues={toInvoiceValues(invoice)}
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
      // Bound on the server, so the id the update runs against never travels
      // through the form where it could be tampered with.
      action={updateInvoice.bind(null, invoice.inv_id)}
    />
  )
}
