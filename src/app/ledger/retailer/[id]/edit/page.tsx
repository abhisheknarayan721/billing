import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import EntityForm from '@/components/form/entity-form'
import { toPartyRecord } from '@/components/ledger/party-records'
import { partyFields } from '@/lib/ledger/party'
import { updateRetailer } from '@/app/ledger/actions'
import { getRetailer } from '@/api/services/retailer.service'

export const metadata = {
  title: 'Edit Retailer',
}

export default async function RetailerEditPage(props: PageProps<'/ledger/retailer/[id]/edit'>) {
  const { id } = await props.params

  // Reject non-numeric ids before they reach the database.
  if (!/^\d+$/.test(id)) notFound()

  // The row must be read at request time, not frozen at build time.
  await connection()

  const retailer = await getRetailer(Number(id))
  if (!retailer) notFound()

  return (
    <EntityForm
      entity="Retailer"
      fields={partyFields('Retailer Name')}
      record={toPartyRecord(retailer.ret_id, retailer.retailername, retailer)}
      listHref="/ledger/retailer/list"
      // Bound on the server, so the id the update runs against never travels
      // through the form where it could be tampered with.
      action={updateRetailer.bind(null, retailer.ret_id)}
    />
  )
}
