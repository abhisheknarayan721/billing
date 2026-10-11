// Field contract for the `payment` table.
//
//   pay_name    VARCHAR(100) NOT NULL -> the supplier or retailer, stored by name
//   pay_amt     DECIMAL(18,2)         -> 16 digits before the point, 2 after
//   pay_method  VARCHAR(100)
//   createddate TIMESTAMP             -> doubles as the payment date
//
// The party is picked from the supplier and retailer lists rather than typed, so
// the name field's options come from the database and are passed in; the
// server builds the same list to validate against.

import {
  EMPTY_FORM_STATE,
  type FieldSpec,
  type FormState,
  type FormValues,
  type SelectOption,
  readForm,
  validateFields,
} from '@/lib/form/field'

export const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card', 'Other'] as const

export function paymentFields(partyOptions: SelectOption[]): FieldSpec[] {
  return [
    {
      name: 'pay_name',
      label: 'Supplier / Retailer',
      type: 'select',
      options: partyOptions,
      maxLength: 100,
      required: true,
      wide: true,
    },
    {
      name: 'pay_amt',
      label: 'Amount',
      type: 'number',
      step: '0.01',
      required: true,
      numeric: { min: 0.01, decimals: 2, maxIntegerDigits: 16 },
    },
    {
      name: 'pay_method',
      label: 'Payment Method',
      type: 'select',
      options: PAYMENT_METHODS.map((method) => ({ value: method, label: method })),
      defaultValue: 'Cash',
    },
  ]
}

/** Field names do not depend on the options, so this is safe for reading forms. */
const PAYMENT_FIELD_NAMES = paymentFields([])

export type PaymentValues = FormValues
export type PaymentFormState = FormState
export const EMPTY_PAYMENT_STATE = EMPTY_FORM_STATE

export function readPaymentForm(formData: FormData): PaymentValues {
  return readForm(formData, PAYMENT_FIELD_NAMES)
}

export function validatePayment(values: PaymentValues, partyOptions: SelectOption[]) {
  return validateFields(values, paymentFields(partyOptions))
}
