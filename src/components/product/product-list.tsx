import Form from 'next/form'
import Image from 'next/image'
import Link from 'next/link'

import AutoSubmitSelect from '@/components/form/auto-submit-select'
import PrintButton from '@/components/invoice/print-button'
import { COMPANY, formatDateTime, formatMoney } from '@/lib/company'
import {
  DEFAULT_PRODUCT_SEARCH,
  PRODUCT_SORTS,
  type ProductSearch,
} from '@/lib/product'
import type { ProductRow } from '@/components/product/product-records'

interface ProductListProps {
  products: ProductRow[]
  search: ProductSearch
  /** Highlighted, as the row currently loaded into the form above. */
  editingId?: number
}

/** Loads a product into the form above, keeping the current search and sort. */
function editHref(id: number, search: ProductSearch) {
  const params = new URLSearchParams()
  if (search.q !== '') params.set('q', search.q)
  if (search.sort !== DEFAULT_PRODUCT_SEARCH.sort) params.set('sort', search.sort)
  params.set('edit', String(id))
  return `/product?${params}`
}

/**
 * The catalogue under the add form. Search and sort are a GET form back to the
 * same page, so they live in the URL: a search survives a save (the action
 * revalidates this route with its params intact) and can be bookmarked.
 */
const ProductList = ({ products, search, editingId }: ProductListProps) => {
  const filtered = search.q !== ''
  const changed = filtered || search.sort !== DEFAULT_PRODUCT_SEARCH.sort

  return (
    // report-sheet: printed without the browser's date/title header and URL
    // footer, so the heading below is the only one on the paper.
    <section className="report-sheet page mt-10 [print-color-adjust:exact] print:mt-0 print:max-w-none">
      <div className="page-header print:hidden">
        <h2 className="page-title">All Products</h2>
        {/* Prints the list as it is shown, so a search or sort carries onto paper. */}
        {products.length > 0 && <PrintButton label="Print products" />}
      </div>

      {/* Paper only: the seller, as on a bill, then what this report is. */}
      <header className="mb-5 hidden print:block">
        <div className="flex items-start justify-between gap-6 border-b-2 border-sky-700 pb-3">
          <div className="flex items-start gap-3">
            <Image src={COMPANY.logo} alt="" width={48} height={48} className="h-12 w-12 shrink-0" />
            <div className="text-xs leading-4 text-slate-600">
              <p className="text-sm font-semibold text-slate-900">{COMPANY.name}</p>
              {COMPANY.addressLines.slice(0, -2).map((line) => (
                <p key={line}>{line}</p>
              ))}
              <p>{COMPANY.addressLines.slice(-2).join(', ')}</p>
              <p>
                {COMPANY.phone} · {COMPANY.email}
              </p>
              <p>GSTIN: {COMPANY.taxNumber}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-extrabold tracking-wider text-sky-700">PRODUCT LIST</h2>

            <dl className="mt-1">
              <dd className="font-sm text-slate-500">Total Products: {products.length}</dd>
              <dd className="font-xs text-slate-500">{formatDateTime(new Date())}</dd>            
              
              {filtered && (
                <>
                  <dt className="text-slate-500">Search</dt>
                  <dd className="font-medium text-slate-900">&ldquo;{search.q}&rdquo;</dd>
                </>
              )}
            </dl>
          </div>
        </div>
      </header>

      <Form
        action="/product"
        // Remount when the applied filters change so the uncontrolled inputs
        // pick up the new values, e.g. after "Clear".
        key={`${search.q}|${search.sort}`}
        className="filter-bar grid grid-cols-1 items-end gap-3 sm:grid-cols-[2fr_1fr_auto] print:hidden"
      >
        <div>
          <label htmlFor="product-q" className="mb-1 block text-xs font-medium text-slate-600">
            Product name
          </label>
          <input
            id="product-q"
            name="q"
            type="search"
            defaultValue={search.q}
            placeholder="Search by name"
            maxLength={100}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="product-sort" className="mb-1 block text-xs font-medium text-slate-600">
            Sort by
          </label>
          {/* Applies on change; the typed search text goes along with it. */}
          <AutoSubmitSelect id="product-sort" name="sort" defaultValue={search.sort} className="input">
            {PRODUCT_SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AutoSubmitSelect>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary">
            Search
          </button>
          {changed && (
            <Link href="/product" className="text-sm text-slate-600 hover:underline">
              Clear
            </Link>
          )}
        </div>
      </Form>

      {filtered && products.length > 0 && (
        <p className="mb-3 text-sm text-slate-600 print:hidden">
          {products.length} product{products.length === 1 ? '' : 's'} found.
        </p>
      )}

      {products.length === 0 ? (
        <p className="empty-state">
          {filtered ? 'No products match this search.' : 'No products yet.'}
        </p>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th className="font-semibold">#</th>
                <th className="font-semibold">Name</th>
                <th className="text-right font-semibold">Price</th>
                <th className="text-right font-semibold">MRP</th>
                <th className="text-right font-semibold">CGST %</th>
                <th className="text-right font-semibold">SGST %</th>
                <th className="text-right font-semibold">Stock</th>
                <th className="text-right font-semibold print:hidden">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, index) => (
                <tr
                  key={product.p_id}
                  className={`print:break-inside-avoid ${product.p_id === editingId ? 'bg-sky-50 print:bg-transparent' : ''}`}
                >
                  {/* A running serial number, as on the bill. p_id stays in the Edit link. */}
                  <td className="tabular-nums text-slate-500">{index + 1}</td>
                  <td className="font-medium">{product.p_name}</td>
                  <td className="text-right tabular-nums">
                    {product.p_price === null ? '-' : formatMoney(product.p_price)}
                  </td>
                  <td className="text-right tabular-nums">
                    {product.p_mrp === null ? '-' : formatMoney(product.p_mrp)}
                  </td>
                  <td className="text-right tabular-nums">{product.p_cgst.toFixed(2)}</td>
                  <td className="text-right tabular-nums">{product.p_sgst.toFixed(2)}</td>
                  <td className="text-right tabular-nums">{product.p_stock ?? '-'}</td>
                  <td className="whitespace-nowrap text-right print:hidden">
                    <Link href={`/ledger/product?p_id=${product.p_id}`} className="link mr-3">
                      Ledger
                    </Link>
                    {/* The form scrolls itself into view once it has the product. */}
                    <Link href={editHref(product.p_id, search)} scroll={false} className="link">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default ProductList
