import Product from '@/components/product/product'
import { readProductSearch } from '@/lib/product'

export const metadata = {
  title: 'Products',
}

export default async function ProductPage(props: PageProps<'/product'>) {
  const params = await props.searchParams
  const edit = Array.isArray(params.edit) ? params.edit[0] : params.edit

  return (
    <Product
      search={readProductSearch(params)}
      editingId={edit !== undefined && /^\d+$/.test(edit) ? Number(edit) : undefined}
    />
  )
}
