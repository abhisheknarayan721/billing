import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import EntityForm from '@/components/form/entity-form'
import { toProductRecord } from '@/components/product/product-records'
import { PRODUCT_FIELDS } from '@/lib/product'
import { updateProduct } from '@/app/product/actions'
import { getProduct } from '@/api/services/product.service'

export const metadata = {
  title: 'Edit Product',
}

export default async function ProductEditPage(
  props: PageProps<'/product/[p_id]/edit'>,
) {
  const { p_id } = await props.params

  // Reject non-numeric ids before they reach the database.
  if (!/^\d+$/.test(p_id)) notFound()

  // The row must be read at request time, not frozen at build time.
  await connection()

  const product = await getProduct(Number(p_id))
  if (!product) notFound()

  return (
    <EntityForm
      entity="Product"
      fields={PRODUCT_FIELDS}
      record={toProductRecord(product)}
      listHref="/product"
      // Bound on the server, so the id the update runs against never travels
      // through the form where it could be tampered with.
      action={updateProduct.bind(null, product.p_id)}
    />
  )
}
