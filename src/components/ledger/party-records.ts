import type { EntityRecord } from '@/components/form/entity-form'
import { PARTY_FIELDS } from '@/lib/ledger/party'

/**
 * The columns Supplier and Retailer share. Their primary key and name column
 * differ, so the caller passes those two in.
 */
interface PartyRow {
  contactperson: string | null
  phonenumber: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  postalcode: string | null
  taxnumber: string | null
}

/**
 * Turns a stored row into one of the picker's options. Only the fields the form
 * declares are carried across, as the plain strings its inputs expect — which
 * also keeps the Date columns from crossing into a Client Component. Shared by
 * the supplier and retailer pages so the two cannot drift.
 */
export function toPartyRecord(id: number, name: string, row: PartyRow): EntityRecord {
  const source: Record<string, unknown> = { ...row, name }
  const values: Record<string, string> = {}

  for (const field of PARTY_FIELDS) {
    values[field.name] = String(source[field.name] ?? '')
  }

  return { id, label: name, values }
}
