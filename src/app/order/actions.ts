'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { ApiError, ValidationError } from '@/api/lib/http'
import {
  createOrder as createOrderRecord,
  editOrder as editOrderRecord,
  removeOrder,
  suggestOrderNumber,
} from '@/api/services/order.service'
import { requireUser } from '@/lib/auth/session'
import {
  EMPTY_ORDER_STATE,
  type OrderFormState,
  type OrderValues,
  readOrderForm,
} from '@/lib/order'

function toErrorState(
  error: unknown,
  values: OrderValues,
  fallback: string,
  context: string,
): OrderFormState {
  if (error instanceof ValidationError) {
    return { status: 'error', errors: error.errors, values, message: error.message }
  }
  console.error(context, error)
  return { status: 'error', errors: {}, values, message: fallback }
}

function revalidateOrder(id: number) {
  revalidatePath('/order')
  revalidatePath('/order/list')
  revalidatePath(`/order/${id}`)
  revalidatePath(`/order/${id}/edit`)
}

export async function createOrder(
  _prevState: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  await requireUser()

  const values = readOrderForm(formData)

  try {
    const record = await createOrderRecord({ ...values })
    revalidateOrder(record.ord_id)
    return {
      ...EMPTY_ORDER_STATE,
      nextOrderNumber: await suggestOrderNumber(),
      status: 'success',
      message: `Order ${record.ordernumber} from ${record.retailername} saved — total ${record.totalamount.toFixed(2)}.`,
    }
  } catch (error) {
    return toErrorState(error, values, 'Could not save the order. Please try again.', '[createOrder]')
  }
}

/**
 * `ord_id` is bound on the server when the edit page renders, so the id the
 * update runs against never travels through the form. On success it goes back
 * to the order list, which says which order was updated.
 */
export async function updateOrder(
  orderId: number,
  _prevState: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  await requireUser()

  const values = readOrderForm(formData)

  let savedId: number
  try {
    const record = await editOrderRecord(orderId, { ...values })
    revalidateOrder(record.ord_id)
    savedId = record.ord_id
  } catch (error) {
    return toErrorState(error, values, 'Could not update the order. Please try again.', '[updateOrder]')
  }

  // Outside the try: redirect() works by throwing, which the catch would swallow.
  redirect(`/order/list?updated=${savedId}`)
}

/**
 * `ord_id` is bound on the server by the list page, like an update's. An order
 * already gone (deleted in another tab) is treated as done, not as an error.
 * The list re-renders in place, keeping its filters, without the row.
 */
export async function deleteOrder(orderId: number) {
  await requireUser()

  try {
    await removeOrder(orderId)
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error
  }
  revalidateOrder(orderId)
}
