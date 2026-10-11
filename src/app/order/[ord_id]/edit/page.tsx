import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import OrderForm from '@/components/order/order-form'
import { toOrderFormOptions } from '@/components/order/options'
import { updateOrder } from '@/app/order/actions'
import { toOrderValues } from '@/api/lib/order'
import { getOrder } from '@/api/services/order.service'
import { listProducts } from '@/api/services/product.service'
import { listRetailers } from '@/api/services/retailer.service'
import { DEFAULT_PRODUCT_SEARCH } from '@/lib/product'
import { requireUser } from '@/lib/auth/session'

export const metadata = {
  title: 'Edit Order',
}

export default async function OrderEditPage(props: PageProps<'/order/[ord_id]/edit'>) {
  const { ord_id } = await props.params

  // Reject non-numeric ids before they reach the database.
  if (!/^\d+$/.test(ord_id)) notFound()

  await connection()

  const [user, order, retailers, products] = await Promise.all([
    requireUser(),
    getOrder(Number(ord_id)),
    listRetailers(),
    listProducts(DEFAULT_PRODUCT_SEARCH),
  ])

  if (!order) notFound()

  return (
    <OrderForm
      mode="edit"
      initialValues={toOrderValues(order)}
      {...toOrderFormOptions(retailers, products)}
      // Bound on the server, so the id never travels through the form.
      action={updateOrder.bind(null, order.ord_id)}
      canAddRetailer={user.role === 'admin'}
    />
  )
}
