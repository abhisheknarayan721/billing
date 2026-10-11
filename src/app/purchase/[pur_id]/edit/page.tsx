import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import PurchaseForm from '@/components/purchase/purchase-form'
import { toProductOptions } from '@/components/purchase/product-options'
import { toSupplierOptions } from '@/components/purchase/supplier-options'
import { updatePurchase } from '@/app/purchase/actions'
import { getPurchase } from '@/api/services/purchase.service'
import { listProducts } from '@/api/services/product.service'
import { listSuppliers } from '@/api/services/supplier.service'
import { toPurchaseValues } from '@/api/lib/purchase'
import { toPurchaseForm } from '@/lib/purchase'

export const metadata = {
  title: 'Edit Purchase',
}

export default async function PurchaseEditPage(
  props: PageProps<'/purchase/[pur_id]/edit'>,
) {
  const { pur_id } = await props.params

  // Reject non-numeric ids before they reach the database.
  if (!/^\d+$/.test(pur_id)) notFound()

  // The row and the stock figures beside each product must be read at request
  // time, not frozen at build time.
  await connection()

  const id = Number(pur_id)
  const [purchase, products, suppliers] = await Promise.all([
    getPurchase(id),
    listProducts(),
    listSuppliers(),
  ])

  if (!purchase) notFound()

  return (
    <PurchaseForm
      heading={`Edit Purchase #${purchase.pur_id}`}
      submitLabel="Update Purchase"
      mode="edit"
      products={toProductOptions(products)}
      suppliers={toSupplierOptions(suppliers)}
      initialValues={toPurchaseForm(toPurchaseValues(purchase))}
      // Bound on the server, so the id the update runs against never travels
      // through the form where it could be tampered with.
      action={updatePurchase.bind(null, id)}
    />
  )
}
