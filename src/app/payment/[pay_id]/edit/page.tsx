import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import EntityForm from '@/components/form/entity-form'
import { paymentFields } from '@/lib/payment'
import { updatePayment } from '@/app/payment/actions'
import { getPayment, listPaymentParties } from '@/api/services/payment.service'

export const metadata = {
  title: 'Edit Payment',
}

export default async function PaymentEditPage(props: PageProps<'/payment/[pay_id]/edit'>) {
  const { pay_id } = await props.params

  // Reject non-numeric ids before they reach the database.
  if (!/^\d+$/.test(pay_id)) notFound()

  // The row and the party list must be read at request time, not build time.
  await connection()

  const payment = await getPayment(Number(pay_id))
  if (!payment) notFound()

  // Keeps the stored name selectable even if that party was renamed since.
  const parties = await listPaymentParties(payment.pay_name)

  return (
    <EntityForm
      entity="Payment"
      fields={paymentFields(parties)}
      record={{
        id: payment.pay_id,
        label: payment.pay_name,
        // Decimal is not serialisable across the server/client boundary, so
        // the amount is flattened to the string the number input expects.
        values: {
          pay_name: payment.pay_name,
          pay_amt: payment.pay_amt === null ? '' : payment.pay_amt.toFixed(2),
          pay_method: payment.pay_method ?? '',
        },
      }}
      listHref="/payment/list"
      // Bound on the server, so the id the update runs against never travels
      // through the form where it could be tampered with.
      action={updatePayment.bind(null, payment.pay_id)}
    />
  )
}
