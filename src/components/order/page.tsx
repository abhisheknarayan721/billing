import React from 'react'
import { connection } from 'next/server'

import OrderForm from '@/components/order/order-form'
import { createOrder } from '@/app/order/actions'
import { suggestOrderNumber } from '@/api/services/order.service'
import { listProducts } from '@/api/services/product.service'
import { listRetailers } from '@/api/services/retailer.service'
import { toOrderFormOptions } from '@/components/order/options'
import { EMPTY_ORDER } from '@/lib/order'
import { DEFAULT_PRODUCT_SEARCH } from '@/lib/product'
import { requireUser } from '@/lib/auth/session'

const Order = async () => {
  // Retailers, products and the suggested number must be read at request time,
  // not frozen at build time.
  await connection()

  const [user, retailers, products, ordernumber] = await Promise.all([
    requireUser(),
    listRetailers(),
    // By name, so the product dropdown reads alphabetically.
    listProducts(DEFAULT_PRODUCT_SEARCH),
    suggestOrderNumber(),
  ])

  return (
    <OrderForm
      mode="create"
      initialValues={{
        ...EMPTY_ORDER,
        ordernumber,
        // Dated on the server so SSR markup and hydration agree.
        orderdate: new Date().toISOString().slice(0, 10),
      }}
      {...toOrderFormOptions(retailers, products)}
      action={createOrder}
      canAddRetailer={user.role === 'admin'}
    />
  )
}

export default Order
