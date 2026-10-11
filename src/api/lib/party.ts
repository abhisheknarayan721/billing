// Mapping between the shared party field contract and database rows.
// Supplier and Retailer are column-identical apart from the primary key and
// the name column, so the shaping lives here once.

import { PARTY_FIELDS, type PartyValues, toNullable } from '@/lib/ledger/party'

export function normalizeParty(input: Record<string, unknown>): PartyValues {
  const values: PartyValues = {}
  for (const field of PARTY_FIELDS) {
    values[field.name] = String(input[field.name] ?? '').trim()
  }
  return values
}

function partyColumns(values: PartyValues) {
  const row: Record<string, string | null | Date> = {
    contactperson: toNullable(values.contactperson),
    phonenumber: toNullable(values.phonenumber),
    email: toNullable(values.email),
    address: toNullable(values.address),
    city: toNullable(values.city),
    state: toNullable(values.state),
    postalcode: toNullable(values.postalcode),
    taxnumber: toNullable(values.taxnumber),
  }

  // `country` is the one column with a DEFAULT ('India'). Sending an explicit
  // NULL would override it, so a blank value omits the key and lets Postgres
  // apply the default — this matters for API callers, who (unlike the form)
  // have nothing pre-filling the field. On an edit the same omission leaves
  // whatever country is already stored.
  if (values.country !== '') {
    row.country = values.country
  }

  return row
}

export function toPartyRow(values: PartyValues) {
  const now = new Date()
  // No DEFAULT on these columns in the schema, so they are set explicitly.
  return { ...partyColumns(values), createddate: now, updateddate: now }
}

/** The same columns for an edit: createddate belongs to the original insert. */
export function toPartyUpdateRow(values: PartyValues) {
  return { ...partyColumns(values), updateddate: new Date() }
}

/** The columns a ledger search looks in, besides each party's own name column. */
const SEARCH_COLUMNS = ['contactperson', 'phonenumber', 'email', 'city', 'taxnumber'] as const

/**
 * OR-conditions matching `q` anywhere in the shared columns, case-insensitively.
 * The caller adds its own name column, which is the one that differs.
 */
export function partySearchConditions(q: string) {
  return SEARCH_COLUMNS.map((column) => ({
    [column]: { contains: q, mode: 'insensitive' as const },
  }))
}
