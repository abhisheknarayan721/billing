// Business rules for suppliers. Both the REST controller and the server action
// call in here, so validation cannot drift between the two entry points.

import { validateParty } from '@/lib/ledger/party'
import { normalizeParty } from '@/api/lib/party'
import { ApiError, ValidationError } from '@/api/lib/http'
import {
  findSupplierById,
  findSuppliers,
  insertSupplier,
  updateSupplier,
} from '@/api/repository/supplier.repository'

export const SUPPLIER_NAME_LABEL = 'Supplier Name'

/** Normalise and validate; shared by create and edit so the two cannot drift. */
function prepare(input: Record<string, unknown>) {
  const values = normalizeParty(input)
  const errors = validateParty(values, SUPPLIER_NAME_LABEL)

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors, 'Please correct the highlighted fields.')
  }

  return values
}

export async function createSupplier(input: Record<string, unknown>) {
  return insertSupplier(prepare(input))
}

export async function editSupplier(id: number, input: Record<string, unknown>) {
  const updated = await updateSupplier(id, prepare(input))
  if (!updated) throw new ApiError(`Supplier ${id} was not found.`, 404)
  return updated
}

export async function listSuppliers(q?: string) {
  return findSuppliers(q)
}

export async function getSupplier(id: number) {
  return findSupplierById(id)
}
