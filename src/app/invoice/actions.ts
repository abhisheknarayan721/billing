'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { ValidationError } from '@/api/lib/http'
import {
  createInvoice as createInvoiceRecord,
  editInvoice as editInvoiceRecord,
  suggestInvoiceNumber,
} from '@/api/services/invoice.service'
import { requireAdmin } from '@/lib/auth/session'
import {
  EMPTY_INVOICE_STATE,
  type InvoiceFormState,
  type InvoiceValues,
  readInvoiceForm,
} from '@/lib/invoice'

function toErrorState(
  error: unknown,
  values: InvoiceValues,
  fallback: string,
  context: string,
): InvoiceFormState {
  if (error instanceof ValidationError) {
    return { status: 'error', errors: error.errors, values, message: error.message }
  }
  console.error(context, error)
  return { status: 'error', errors: {}, values, message: fallback }
}

/**
 * Anything showing this invoice, or the list it appears in, is now stale — and
 * so is anything showing product stock, since invoicing goods takes them off it.
 */
function revalidateInvoice(id: number) {
  revalidatePath('/invoice')
  revalidatePath('/invoice/list')
  revalidatePath(`/invoice/${id}`)
  revalidatePath(`/invoice/${id}/edit`)
  revalidatePath('/product')
  revalidatePath('/product/[p_id]/edit', 'page')
  revalidatePath('/purchase')
}

export async function createInvoice(
  _prevState: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  await requireAdmin()

  const values = readInvoiceForm(formData)

  try {
    const record = await createInvoiceRecord({ ...values })
    revalidateInvoice(record.inv_id)
    return {
      ...EMPTY_INVOICE_STATE,
      nextInvoiceNumber: await suggestInvoiceNumber(),
      savedInvoiceId: record.inv_id,
      status: 'success',
      message: `Invoice ${record.invoicenumber} saved (ID ${record.inv_id}) — total ${record.totalamount.toFixed(2)}.`,
    }
  } catch (error) {
    return toErrorState(
      error,
      values,
      'Could not save the invoice. Please try again.',
      '[createInvoice]',
    )
  }
}

/**
 * `inv_id` is bound on the server when the edit page renders it, so the id the
 * update runs against never travels through the form where it could be tampered
 * with. Saving replaces the invoice's line items with the ones submitted.
 *
 * On success it goes back to a fresh Create Invoice form, which says which
 * invoice was updated. A rejected update stays on the edit page with its errors.
 */
export async function updateInvoice(
  invoiceId: number,
  _prevState: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  await requireAdmin()

  const values = readInvoiceForm(formData)

  let savedId: number
  try {
    const record = await editInvoiceRecord(invoiceId, { ...values })
    revalidateInvoice(record.inv_id)
    savedId = record.inv_id
  } catch (error) {
    return toErrorState(
      error,
      values,
      'Could not update the invoice. Please try again.',
      '[updateInvoice]',
    )
  }

  // Outside the try: redirect() works by throwing, which the catch would swallow.
  redirect(`/invoice?updated=${savedId}`)
}
