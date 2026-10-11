import { notFound } from 'next/navigation'

import Bill from '@/components/invoice/bill'
import { getInvoice } from '@/api/services/invoice.service'

export const metadata = {
  title: 'Invoice',
}

export default async function InvoiceBillPage(props: PageProps<'/invoice/[inv_id]'>) {
  const { inv_id } = await props.params

  // Reject non-numeric ids before they reach the database.
  if (!/^\d+$/.test(inv_id)) notFound()

  const invoice = await getInvoice(Number(inv_id))
  if (!invoice) notFound()

  return <Bill invoice={invoice} />
}
