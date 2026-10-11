import React from 'react'
import { connection } from 'next/server'

import EntityForm from '@/components/form/entity-form'
import { toPartyRecord } from '@/components/ledger/party-records'
import { partyFields } from '@/lib/ledger/party'
import { saveRetailer } from '@/app/ledger/actions'
import { listRetailers } from '@/api/services/retailer.service'

const Retailer = async () => {
  // The picker must list what is in the database at request time; without this
  // the page is prerendered and the list freezes at build time.
  await connection()

  const retailers = await listRetailers()

  return (
    <EntityForm
      entity='Retailer'
      fields={partyFields('Retailer Name')}
      records={retailers.map((row) => toPartyRecord(row.ret_id, row.retailername, row))}
      listHref='/ledger/retailer/list'
      action={saveRetailer}
    />
  )
}

export default Retailer
