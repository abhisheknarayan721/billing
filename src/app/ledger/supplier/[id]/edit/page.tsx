import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import EntityForm from '@/components/form/entity-form'
import { toPartyRecord } from '@/components/ledger/party-records'
import { partyFields } from '@/lib/ledger/party'
import { updateSupplier } from '@/app/ledger/actions'
import { getSupplier } from '@/api/services/supplier.service'

export const metadata = {
  title: 'Edit Supplier',
}

export default async function SupplierEditPage(props: PageProps<'/ledger/supplier/[id]/edit'>) {
  const { id } = await props.params

  // Reject non-numeric ids before they reach the database.
  if (!/^\d+$/.test(id)) notFound()

  // The row must be read at request time, not frozen at build time.
  await connection()

  const supplier = await getSupplier(Number(id))
  if (!supplier) notFound()

  return (
    <EntityForm
      entity="Supplier"
      fields={partyFields('Supplier Name')}
      record={toPartyRecord(supplier.sup_id, supplier.suppliername, supplier)}
      listHref="/ledger/supplier/list"
      // Bound on the server, so the id the update runs against never travels
      // through the form where it could be tampered with.
      action={updateSupplier.bind(null, supplier.sup_id)}
    />
  )
}
