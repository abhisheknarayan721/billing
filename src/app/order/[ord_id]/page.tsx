import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import OrderSlip from '@/components/order/order-slip'
import { getOrder } from '@/api/services/order.service'

export const metadata = {
  title: 'Order',
}

export default async function OrderPrintPage(props: PageProps<'/order/[ord_id]'>) {
  const { ord_id } = await props.params

  // Reject non-numeric ids before they reach the database.
  if (!/^\d+$/.test(ord_id)) notFound()

  await connection()
  const order = await getOrder(Number(ord_id))
  if (!order) notFound()

  return <OrderSlip order={order} />
}
