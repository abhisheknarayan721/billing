'use server'

import { revalidatePath } from 'next/cache'

import { ValidationError } from '@/api/lib/http'
import {
  createPayment as createPaymentRecord,
  editPayment as editPaymentRecord,
} from '@/api/services/payment.service'
import { requireAdmin } from '@/lib/auth/session'
import { formatMoney } from '@/lib/company'
import {
  EMPTY_PAYMENT_STATE,
  readPaymentForm,
  type PaymentFormState,
  type PaymentValues,
} from '@/lib/payment'

function toErrorState(
  error: unknown,
  values: PaymentValues,
  fallback: string,
  tag: string,
): PaymentFormState {
  if (error instanceof ValidationError) {
    return { status: 'error', errors: error.errors, values, message: error.message }
  }
  console.error(tag, error)
  return { status: 'error', errors: {}, values, message: fallback }
}

/** Every page that shows a payment row is now stale. */
function revalidatePayments() {
  revalidatePath('/payment')
  revalidatePath('/payment/list')
  revalidatePath('/payment/[pay_id]/edit', 'page')
}

export async function createPayment(
  _prevState: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  await requireAdmin()

  const values = readPaymentForm(formData)

  try {
    const record = await createPaymentRecord(values)
    revalidatePayments()
    return {
      ...EMPTY_PAYMENT_STATE,
      status: 'success',
      message: `Payment of ${formatMoney(record.pay_amt ?? 0)} from "${record.pay_name}" saved (ID ${record.pay_id}).`,
    }
  } catch (error) {
    return toErrorState(
      error,
      values,
      'Could not save the payment. Please try again.',
      '[createPayment]',
    )
  }
}

/**
 * `pay_id` is bound on the server when the edit page renders it, so the id the
 * update runs against never travels through the form where it could be
 * tampered with.
 */
export async function updatePayment(
  paymentId: number,
  _prevState: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  await requireAdmin()

  const values = readPaymentForm(formData)

  try {
    const record = await editPaymentRecord(paymentId, values)
    revalidatePayments()
    return {
      ...EMPTY_PAYMENT_STATE,
      status: 'success',
      message: `Payment ${record.pay_id} updated.`,
      // Echoed so the form shows what was saved while the page re-renders.
      values,
    }
  } catch (error) {
    return toErrorState(
      error,
      values,
      'Could not update the payment. Please try again.',
      '[updatePayment]',
    )
  }
}
