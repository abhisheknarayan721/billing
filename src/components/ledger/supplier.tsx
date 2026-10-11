import React from 'react'
import { connection } from 'next/server'

import EntityForm from '@/components/form/entity-form'
import { toPartyRecord } from '@/components/ledger/party-records'
import { partyFields } from '@/lib/ledger/party'
import { saveSupplier } from '@/app/ledger/actions'
import { listSuppliers } from '@/api/services/supplier.service'

const Supplier = async () => {
  // The picker must list what is in the database at request time; without this
  // the page is prerendered and the list freezes at build time.
  await connection()

  const suppliers = await listSuppliers()

  return (
    <EntityForm
      entity='Supplier'
      fields={partyFields('Supplier Name')}
      records={suppliers.map((row) => toPartyRecord(row.sup_id, row.suppliername, row))}
      listHref='/ledger/supplier/list'
      action={saveSupplier}
    />
  )
}

export default Supplier
