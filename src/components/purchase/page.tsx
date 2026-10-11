import { connection } from 'next/server'

import PurchaseForm from '@/components/purchase/purchase-form'
import { toProductOptions, todayISO } from '@/components/purchase/product-options'
import { toSupplierOptions } from '@/components/purchase/supplier-options'
import { createPurchase } from '@/app/purchase/actions'
import { listProducts } from '@/api/services/product.service'
import { listSuppliers } from '@/api/services/supplier.service'
import { EMPTY_PURCHASE_FORM, EMPTY_PURCHASE_LINE } from '@/lib/purchase'

const Purchase = async () => {
  // The product list and its stock figures must reflect the database at request
  // time. Without this the page is prerendered and both freeze at build time.
  // Preferred over `export const dynamic`, which Next 16 drops once Cache
  // Components is enabled.
  await connection()

  const [products, suppliers] = await Promise.all([listProducts(), listSuppliers()])

  return (
    <PurchaseForm
      heading="Add Purchase"
      submitLabel="Save Purchase"
      mode="create"
      products={toProductOptions(products)}
      suppliers={toSupplierOptions(suppliers)}
      // Dated on the server so the value is identical in the SSR markup and
      // after hydration, whatever the browser's clock says.
      initialValues={{
        ...EMPTY_PURCHASE_FORM,
        invoicedate: todayISO(),
        lines: [{ ...EMPTY_PURCHASE_LINE }],
      }}
      action={createPurchase}
    />
  )
}

export default Purchase
