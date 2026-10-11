import { connection } from 'next/server'

import PartyList from '@/components/ledger/party-list'
import { listRetailersWithBalance } from '@/api/services/retailer.service'
import { readPartySearch } from '@/lib/ledger/party-search'

export const metadata = {
  title: 'Retailers',
}

export default async function RetailerListPage(props: PageProps<'/ledger/retailer/list'>) {
  // Must reflect the database at request time, not build time.
  await connection()
  const q = readPartySearch(await props.searchParams)
  const retailers = await listRetailersWithBalance(q)

  return (
    <PartyList
      entity="Retailer"
      basePath="/ledger/retailer"
      ledgerPath="/ledger/retailer/statement?ret_id="
      q={q}
      rows={retailers.map((row) => ({
        id: row.ret_id,
        name: row.retailername,
        contactperson: row.contactperson,
        phonenumber: row.phonenumber,
        email: row.email,
        city: row.city,
        balancePaise: row.balancePaise,
      }))}
    />
  )
}
