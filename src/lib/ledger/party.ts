// Supplier and Retailer are column-for-column identical apart from the primary
// key and the name column, so both share this field contract. The form posts a
// generic `name` field and each service maps it onto `suppliername` /
// `retailername`.
//
// maxLength values mirror the VARCHAR widths in the database — keeping them in
// sync here means the user gets a field-level message instead of a raw
// Postgres "value too long for type character varying(n)" error.

import {
  EMPTY_FORM_STATE,
  type FieldSpec,
  type FormState,
  type FormValues,
  readForm,
  toNullable,
  validateFields,
} from '@/lib/form/field'

export function partyFields(nameLabel: string): FieldSpec[] {
  return [
    { name: 'name', label: nameLabel, type: 'text', maxLength: 250, required: true, autoComplete: 'organization', wide: true },
    { name: 'contactperson', label: 'Contact Person', type: 'text', maxLength: 250, autoComplete: 'name' },
    { name: 'phonenumber', label: 'Phone Number', type: 'tel', maxLength: 10, autoComplete: 'tel' },
    { name: 'email', label: 'Email', type: 'email', maxLength: 250, autoComplete: 'email' },
    { name: 'taxnumber', label: 'Tax Number', type: 'text', maxLength: 100 },
    { name: 'address', label: 'Address', type: 'textarea', autoComplete: 'street-address', wide: true },
    { name: 'city', label: 'City', type: 'text', maxLength: 100, autoComplete: 'address-level2' },
    { name: 'state', label: 'State', type: 'text', maxLength: 100, autoComplete: 'address-level1' },
    { name: 'country', label: 'Country', type: 'text', maxLength: 100, defaultValue: 'India', autoComplete: 'country-name' },
    // A 6-digit Indian PIN code. Optional, but when given it must be all 6 digits.
    { name: 'postalcode', label: 'Postal Code', type: 'text', maxLength: 6, digits: 6, autoComplete: 'postal-code' },
  ]
}

/** Field names are identical across parties, so this is safe for iteration. */
export const PARTY_FIELDS = partyFields('Name')

export type PartyValues = FormValues
export type PartyFormState = FormState
export const EMPTY_PARTY_STATE = EMPTY_FORM_STATE

export function readPartyForm(formData: FormData): PartyValues {
  return readForm(formData, PARTY_FIELDS)
}

export function validateParty(values: PartyValues, nameLabel: string) {
  return validateFields(values, partyFields(nameLabel))
}

export { toNullable }
