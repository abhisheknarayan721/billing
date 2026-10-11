'use server'

import { revalidatePath } from 'next/cache'

import { ValidationError } from '@/api/lib/http'
import {
  createProduct as createProductRecord,
  editProduct as editProductRecord,
} from '@/api/services/product.service'
import {
  EMPTY_FORM_STATE,
  readRecordId,
  type FormState,
  type FormValues,
} from '@/lib/form/field'
import { requireAdmin } from '@/lib/auth/session'
import { readProductForm } from '@/lib/product'

function toErrorState(
  error: unknown,
  values: FormValues,
  fallback: string,
  tag: string,
): FormState {
  if (error instanceof ValidationError) {
    return { status: 'error', errors: error.errors, values, message: error.message }
  }
  console.error(tag, error)
  return { status: 'error', errors: {}, values, message: fallback }
}

/** Every page that shows a product row is now stale. */
function revalidateProducts() {
  revalidatePath('/product')
  revalidatePath('/product/[p_id]/edit', 'page')
}

/**
 * Insert or update, decided by the hidden record id the form posts: the entry
 * form serves both modes, so it posts to one action. The id comes from the
 * browser, so it is only ever used to look a row up — the service answers 404
 * if it names nothing.
 */
export async function saveProduct(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin()

  const values = readProductForm(formData)
  const id = readRecordId(formData)

  if (id === undefined) {
    return {
      status: 'error',
      errors: {},
      values,
      message: 'Could not tell which product to update. Please pick it again.',
    }
  }

  try {
    if (id === null) {
      const record = await createProductRecord(values)
      revalidateProducts()
      return {
        ...EMPTY_FORM_STATE,
        status: 'success',
        message: `Product "${record.p_name}" saved (ID ${record.p_id}).`,
      }
    }

    const record = await editProductRecord(id, values)
    revalidateProducts()
    return {
      ...EMPTY_FORM_STATE,
      status: 'success',
      message: `Product "${record.p_name}" updated (ID ${record.p_id}).`,
    }
  } catch (error) {
    return toErrorState(
      error,
      values,
      'Could not save the product. Please try again.',
      '[saveProduct]',
    )
  }
}

/**
 * `p_id` is bound on the server when the edit page renders it, so the id the
 * update runs against never travels through the form where it could be
 * tampered with.
 */
export async function updateProduct(
  productId: number,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin()

  const values = readProductForm(formData)

  try {
    const record = await editProductRecord(productId, values)
    revalidateProducts()
    return {
      ...EMPTY_FORM_STATE,
      status: 'success',
      message: `Product "${record.p_name}" updated (ID ${record.p_id}).`,
      // Echoed so the form shows what was saved while the page re-renders.
      values,
    }
  } catch (error) {
    return toErrorState(
      error,
      values,
      'Could not update the product. Please try again.',
      '[updateProduct]',
    )
  }
}
