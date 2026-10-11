'use server'

import { revalidatePath } from 'next/cache'

import { ValidationError } from '@/api/lib/http'
import {
  createSupplier as createSupplierRecord,
  editSupplier as editSupplierRecord,
} from '@/api/services/supplier.service'
import {
  createRetailer as createRetailerRecord,
  editRetailer as editRetailerRecord,
} from '@/api/services/retailer.service'
import { requireAdmin } from '@/lib/auth/session'
import { readRecordId } from '@/lib/form/field'
import {
  EMPTY_PARTY_STATE,
  type PartyFormState,
  type PartyValues,
  readPartyForm,
} from '@/lib/ledger/party'

/**
 * Validation and persistence live in src/api/services, so the form and the REST
 * endpoints under /api/ledger share one implementation. These actions only
 * translate between FormData and the shape useActionState expects.
 *
 * Each party has ONE action covering both modes, chosen by the hidden record id
 * the entry form posts. The id comes from the browser, so it is only ever used
 * to look a row up — the service answers 404 if it names nothing.
 */
function toErrorState(
  error: unknown,
  values: PartyValues,
  fallback: string,
  context: string,
): PartyFormState {
  if (error instanceof ValidationError) {
    return { status: 'error', errors: error.errors, values, message: error.message }
  }
  console.error(context, error)
  return { status: 'error', errors: {}, values, message: fallback }
}

/** Every page that shows a row of this party is now stale. */
function revalidateParty(base: '/ledger/supplier' | '/ledger/retailer') {
  revalidatePath(base)
  revalidatePath(`${base}/list`)
  revalidatePath(`${base}/[id]/edit`, 'page')
}

function unidentified(values: PartyValues, noun: string): PartyFormState {
  return {
    status: 'error',
    errors: {},
    values,
    message: `Could not tell which ${noun} to update. Please pick it again.`,
  }
}

export async function saveSupplier(
  _prevState: PartyFormState,
  formData: FormData,
): Promise<PartyFormState> {
  await requireAdmin()

  const values = readPartyForm(formData)
  const id = readRecordId(formData)

  if (id === undefined) return unidentified(values, 'supplier')

  try {
    const record =
      id === null
        ? await createSupplierRecord(values)
        : await editSupplierRecord(id, values)

    revalidateParty('/ledger/supplier')

    return {
      ...EMPTY_PARTY_STATE,
      status: 'success',
      message: `Supplier "${record.suppliername}" ${
        id === null ? 'saved' : 'updated'
      } (ID ${record.sup_id}).`,
    }
  } catch (error) {
    return toErrorState(
      error,
      values,
      'Could not save the supplier. Please try again.',
      '[saveSupplier]',
    )
  }
}

export async function saveRetailer(
  _prevState: PartyFormState,
  formData: FormData,
): Promise<PartyFormState> {
  await requireAdmin()

  const values = readPartyForm(formData)
  const id = readRecordId(formData)

  if (id === undefined) return unidentified(values, 'retailer')

  try {
    const record =
      id === null
        ? await createRetailerRecord(values)
        : await editRetailerRecord(id, values)

    revalidateParty('/ledger/retailer')

    return {
      ...EMPTY_PARTY_STATE,
      status: 'success',
      message: `Retailer "${record.retailername}" ${
        id === null ? 'saved' : 'updated'
      } (ID ${record.ret_id}).`,
    }
  } catch (error) {
    return toErrorState(
      error,
      values,
      'Could not save the retailer. Please try again.',
      '[saveRetailer]',
    )
  }
}

/*
 * The edit pages bind the id on the server when they render, so the row an
 * update runs against never travels through the form where it could be
 * tampered with.
 */

export async function updateSupplier(
  supplierId: number,
  _prevState: PartyFormState,
  formData: FormData,
): Promise<PartyFormState> {
  await requireAdmin()

  const values = readPartyForm(formData)

  try {
    const record = await editSupplierRecord(supplierId, values)
    revalidateParty('/ledger/supplier')
    return {
      ...EMPTY_PARTY_STATE,
      status: 'success',
      message: `Supplier "${record.suppliername}" updated (ID ${record.sup_id}).`,
      // Echoed so the form shows what was saved while the page re-renders.
      values,
    }
  } catch (error) {
    return toErrorState(
      error,
      values,
      'Could not update the supplier. Please try again.',
      '[updateSupplier]',
    )
  }
}

export async function updateRetailer(
  retailerId: number,
  _prevState: PartyFormState,
  formData: FormData,
): Promise<PartyFormState> {
  await requireAdmin()

  const values = readPartyForm(formData)

  try {
    const record = await editRetailerRecord(retailerId, values)
    revalidateParty('/ledger/retailer')
    return {
      ...EMPTY_PARTY_STATE,
      status: 'success',
      message: `Retailer "${record.retailername}" updated (ID ${record.ret_id}).`,
      values,
    }
  } catch (error) {
    return toErrorState(
      error,
      values,
      'Could not update the retailer. Please try again.',
      '[updateRetailer]',
    )
  }
}
