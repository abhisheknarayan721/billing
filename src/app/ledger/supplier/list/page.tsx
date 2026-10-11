import { connection } from 'next/server'

import PartyList from '@/components/ledger/party-list'
import { listSuppliers } from '@/api/services/supplier.service'
import { readPartySearch } from '@/lib/ledger/party-search'

export const metadata = {
  title: 'Suppliers',
}

export default async function SupplierListPage(props: PageProps<'/ledger/supplier/list'>) {
  // Must reflect the database at request time, not build time.
  await connection()
  const q = readPartySearch(await props.searchParams)
  const suppliers = await listSuppliers(q)

  return (
    <PartyList
      entity="Supplier"
      basePath="/ledger/supplier"
      q={q}
      rows={suppliers.map((row) => ({
        id: row.sup_id,
        name: row.suppliername,
        contactperson: row.contactperson,
        phonenumber: row.phonenumber,
        email: row.email,
        city: row.city,
      }))}
    />
  )
}
