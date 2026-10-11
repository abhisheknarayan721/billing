import { redirect } from 'next/navigation'

/**
 * The list now lives under the add form on /product. This keeps old links and
 * bookmarks working, search included.
 */
export default async function ProductListPage(props: PageProps<'/product/list'>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(await props.searchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      params.append(key, item)
    }
  }
  const query = params.toString()
  redirect(query === '' ? '/product' : `/product?${query}`)
}
