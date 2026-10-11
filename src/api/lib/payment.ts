// Mapping between the payment field contract and database rows.

import { normalizeInput, toNullable, type SelectOption } from '@/lib/form/field'
import { paymentFields, type PaymentValues } from '@/lib/payment'

export function normalizePayment(input: Record<string, unknown>): PaymentValues {
  return normalizeInput(input, paymentFields([]))
}

/**
 * The picker's choices: every supplier and retailer, grouped. A name listed
 * twice in one group (two parties with the same name) is offered once, since
 * the payment stores only the name.
 */
export function toPartyOptions(
  suppliers: { suppliername: string }[],
  retailers: { retailername: string }[],
): SelectOption[] {
  const grouped = (group: string, names: string[]) =>
    [...new Set(names)].map((name) => ({ value: name, label: name, group }))

  return [
    ...grouped('Suppliers', suppliers.map((row) => row.suppliername)),
    ...grouped('Retailers', retailers.map((row) => row.retailername)),
  ]
}

function paymentColumns(values: PaymentValues) {
  return {
    pay_name: values.pay_name,
    // Passed as a string so DECIMAL(18,2) keeps full precision — going via a
    // JS number would round anything past 15 significant digits.
    pay_amt: values.pay_amt === '' ? null : values.pay_amt,
    pay_method: toNullable(values.pay_method),
  }
}

export function toPaymentRow(values: PaymentValues) {
  const now = new Date()
  return { ...paymentColumns(values), createddate: now, updateddate: now }
}

/** The same columns for an edit: createddate is when the payment was taken. */
export function toPaymentUpdateRow(values: PaymentValues) {
  return { ...paymentColumns(values), updateddate: new Date() }
}
