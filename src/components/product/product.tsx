import React from 'react'
import { connection } from 'next/server'

import EntityForm from '@/components/form/entity-form'
import ProductList from '@/components/product/product-list'
import { toProductRecord } from '@/components/product/product-records'
import { PRODUCT_FIELDS, type ProductSearch } from '@/lib/product'
import { saveProduct } from '@/app/product/actions'
import { listProducts } from '@/api/services/product.service'

interface ProductProps {
  /** The search and sort applied to the list below the form. */
  search: ProductSearch
  /** The product loaded into the form for editing, if any. */
  editingId?: number
}

/** Add form on top, then the searchable, sortable catalogue — all on one page. */
const Product = async ({ search, editingId }: ProductProps) => {
  // The picker, the list and their stock figures must reflect the database at
  // request time; without this the page is prerendered and they freeze at build time.
  await connection()

  // The picker always offers every product; only the list below is filtered.
  const [products, listed] = await Promise.all([listProducts(), listProducts(search)])

  return (
    <>
      {/* Printing the list leaves the add/edit form off the paper. */}
      <div className="print:hidden">
        <EntityForm
          entity='Product'
          fields={PRODUCT_FIELDS}
          records={products.map(toProductRecord)}
          // The list's Edit links load a product into this form via ?edit=<id>.
          editParam='edit'
          action={saveProduct}
        />
      </div>
      <ProductList products={listed} search={search} editingId={editingId} />
    </>
  )
}

export default Product
