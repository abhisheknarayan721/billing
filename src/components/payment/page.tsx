import { connection } from 'next/server'

import EntityForm from '@/components/form/entity-form'
import SearchBar from '@/components/form/search-bar'
import { paymentFields } from '@/lib/payment'
import { createPayment } from '@/app/payment/actions'
import { listPaymentParties } from '@/api/services/payment.service'

const Payment = async () => {
  // The supplier and retailer lists must reflect the database at request time;
  // without this the page is prerendered and the picker freezes at build time.
  await connection()

  const parties = await listPaymentParties()

  return (
    <>
      {/* Sits above the form; searching opens the filtered payment list. */}
      <div className="page max-w-3xl">
        <SearchBar
          action="/payment/list"
          textLabel="Supplier / retailer or method"
          textPlaceholder="e.g. Acme or UPI"
        />
      </div>
      {parties.length === 0 ? (
        <p className="page max-w-3xl empty-state">
          Add a supplier or retailer first — a payment is recorded against one of them.
        </p>
      ) : (
        <EntityForm
          entity="Payment"
          fields={paymentFields(parties)}
          listHref="/payment/list"
          action={createPayment}
        />
      )}
    </>
  )
}

export default Payment
