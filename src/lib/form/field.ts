// Generic field spec, validation and FormData handling shared by every entry
// form. Entity modules (party, product) declare their fields against this and
// the same code validates them on the server and renders them on the client.

export type FieldType = 'text' | 'email' | 'tel' | 'password' | 'textarea' | 'number' | 'select'

export interface SelectOption {
  value: string
  label: string
  /** Options sharing a group render under one <optgroup>. */
  group?: string
}

export interface NumericRule {
  integer?: boolean
  min?: number
  max?: number
  /** Digits allowed after the decimal point, e.g. 2 for DECIMAL(18,2). */
  decimals?: number
  /** Digits allowed before the decimal point, e.g. 16 for DECIMAL(18,2). */
  maxIntegerDigits?: number
}

export interface FieldSpec {
  name: string
  label: string
  type: FieldType
  maxLength?: number
  required?: boolean
  defaultValue?: string
  autoComplete?: string
  step?: string
  numeric?: NumericRule
  /**
   * A code of exactly this many digits and nothing else, e.g. 6 for an Indian
   * PIN code. Kept as text rather than `number`, so leading zeros survive and
   * the browser shows no spinner. The input drops anything else as it is typed.
   */
  digits?: number
  /**
   * The choices for a `select`. Validation rejects any other value, so the
   * server — which builds the same list — never trusts one the browser made up.
   */
  options?: SelectOption[]
  /** Renders full width in the two-column grid. */
  wide?: boolean
}

export type FormValues = Record<string, string>

export interface FormState {
  status: 'idle' | 'success' | 'error'
  message?: string
  errors: Record<string, string>
  /** Echoed back so a rejected submission does not lose what was typed. */
  values: FormValues
}

export const EMPTY_FORM_STATE: FormState = { status: 'idle', errors: {}, values: {} }

/**
 * Hidden field naming the record an entry form is editing. It is what makes one
 * form serve both modes: blank means "save a new one", an id means "update that
 * one", so the form still posts to a single server action and keeps working
 * without JavaScript.
 */
export const RECORD_ID_FIELD = 'record_id'

/**
 * Reads that field. `null` is a new record and a number is the id to update;
 * `undefined` means the browser sent something that is neither, which the
 * caller reports rather than quietly treating as a new record — otherwise a
 * mangled id would silently duplicate the row the user meant to edit.
 */
export function readRecordId(formData: FormData): number | null | undefined {
  const raw = String(formData.get(RECORD_ID_FIELD) ?? '').trim()

  if (raw === '') return null
  return /^\d+$/.test(raw) ? Number(raw) : undefined
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/
const PHONE_PATTERN = /^\d{10}$/

export function readForm(formData: FormData, fields: FieldSpec[]): FormValues {
  const values: FormValues = {}
  for (const field of fields) {
    values[field.name] = String(formData.get(field.name) ?? '').trim()
  }
  return values
}

export function normalizeInput(
  input: Record<string, unknown>,
  fields: FieldSpec[],
): FormValues {
  const values: FormValues = {}
  for (const field of fields) {
    values[field.name] = String(input[field.name] ?? '').trim()
  }
  return values
}

export function validateNumeric(
  value: string,
  label: string,
  rule: NumericRule = {},
): string | null {
  if (!NUMBER_PATTERN.test(value)) {
    return `${label} must be a number.`
  }

  const [integerPart, decimalPart = ''] = value.replace('-', '').split('.')

  if (rule.integer && decimalPart !== '') {
    return `${label} must be a whole number.`
  }
  if (rule.decimals !== undefined && decimalPart.length > rule.decimals) {
    return `${label} can have at most ${rule.decimals} decimal place${rule.decimals === 1 ? '' : 's'}.`
  }
  // Checked on the digit string rather than by comparing numbers, because the
  // DECIMAL(18,2) ceiling is far past Number.MAX_SAFE_INTEGER.
  if (rule.maxIntegerDigits !== undefined && integerPart.replace(/^0+(?=\d)/, '').length > rule.maxIntegerDigits) {
    return `${label} can have at most ${rule.maxIntegerDigits} digits before the decimal point.`
  }

  const parsed = Number(value)
  if (rule.min !== undefined && parsed < rule.min) {
    return `${label} cannot be less than ${rule.min}.`
  }
  if (rule.max !== undefined && parsed > rule.max) {
    return `${label} cannot be greater than ${rule.max}.`
  }
  return null
}

export function validateFields(
  values: FormValues,
  fields: FieldSpec[],
): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const field of fields) {
    const value = values[field.name] ?? ''

    if (field.required && value === '') {
      errors[field.name] = `${field.label} is required.`
      continue
    }
    if (value === '') continue

    if (field.maxLength && value.length > field.maxLength) {
      errors[field.name] = `${field.label} must be ${field.maxLength} characters or fewer.`
      continue
    }
    if (field.type === 'email' && !EMAIL_PATTERN.test(value)) {
      errors[field.name] = 'Enter a valid email address.'
      continue
    }
    if (field.type === 'tel' && !PHONE_PATTERN.test(value)) {
      errors[field.name] = `${field.label} must be exactly 10 digits.`
      continue
    }
    if (field.digits !== undefined && !new RegExp(`^\\d{${field.digits}}$`).test(value)) {
      errors[field.name] = `${field.label} must be exactly ${field.digits} digits.`
      continue
    }
    if (field.type === 'number') {
      const error = validateNumeric(value, field.label, field.numeric)
      if (error) errors[field.name] = error
      continue
    }
    if (field.options && !field.options.some((option) => option.value === value)) {
      errors[field.name] = `Choose a ${field.label.toLowerCase()} from the list.`
    }
  }

  return errors
}

/**
 * Optional columns are nullable in the database, so blank inputs are stored as
 * NULL rather than empty strings — otherwise "no value" and "an empty value"
 * become indistinguishable in queries.
 */
export function toNullable(value: string): string | null {
  return value === '' ? null : value
}
