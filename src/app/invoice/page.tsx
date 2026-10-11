import Invoice from '@/components/invoice/page'

export const metadata = {
  title: 'Create Invoice',
}

export default async function InvoicePage(props: PageProps<'/invoice'>) {
  // Set by a successful update, which lands back here on a fresh form.
  const raw = (await props.searchParams).updated
  const updated = Array.isArray(raw) ? raw[0] : raw

  return <Invoice updatedId={updated && /^\d+$/.test(updated) ? Number(updated) : undefined} />
}
