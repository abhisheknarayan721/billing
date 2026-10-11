// Field contract for the `product` table.
//
//   p_name   VARCHAR(100) NOT NULL
//   p_price  DECIMAL(18,2)        -> 16 digits before the point, 2 after
//   p_mrp    DECIMAL(18,2)        -> optional; the bill shows "-" without it
//   p_cgst   DECIMAL(5,2) NOT NULL DEFAULT 0 -> a percentage, 0 to 100
//   p_sgst   DECIMAL(5,2) NOT NULL DEFAULT 0 -> a percentage, 0 to 100
//   p_stock  INT DEFAULT 0        -> int4, so capped at 2147483647

import {
  EMPTY_FORM_STATE,
  type FieldSpec,
  type FormState,
  type FormValues,
  readForm,
  validateFields,
} from '@/lib/form/field'

export const PRODUCT_FIELDS: FieldSpec[] = [
  {
    name: 'p_name',
    label: 'Product Name',
    type: 'text',
    maxLength: 100,
    required: true,
    wide: true,
  },
  {
    name: 'p_price',
    label: 'Price',
    type: 'number',
    step: '0.01',
    numeric: { min: 0, decimals: 2, maxIntegerDigits: 16 },
  },
  {
    name: 'p_mrp',
    label: 'MRP',
    type: 'number',
    step: '0.01',
    numeric: { min: 0, decimals: 2, maxIntegerDigits: 16 },
  },
  {
    name: 'p_cgst',
    label: 'CGST (%)',
    type: 'number',
    step: '0.01',
    defaultValue: '0.00',
    numeric: { min: 0, max: 100, decimals: 2 },
  },
  {
    name: 'p_sgst',
    label: 'SGST (%)',
    type: 'number',
    step: '0.01',
    defaultValue: '0.00',
    numeric: { min: 0, max: 100, decimals: 2 },
  },
  {
    name: 'p_stock',
    label: 'Stock',
    type: 'number',
    step: '1',
    defaultValue: '0',
    numeric: { integer: true, min: 0, max: 2147483647 },
  },
]

export type ProductValues = FormValues
export type ProductFormState = FormState
export const EMPTY_PRODUCT_STATE = EMPTY_FORM_STATE

export function readProductForm(formData: FormData): ProductValues {
  return readForm(formData, PRODUCT_FIELDS)
}

export function validateProduct(values: ProductValues) {
  return validateFields(values, PRODUCT_FIELDS)
}

/** How the product list can be ordered, as the `sort` URL param names it. */
export const PRODUCT_SORTS = [
  { value: 'name_asc', label: 'Name (A to Z)' },
  { value: 'name_desc', label: 'Name (Z to A)' },
] as const
export type ProductSort = (typeof PRODUCT_SORTS)[number]['value']

export interface ProductSearch {
  /** Matched case-insensitively anywhere in the product name. */
  q: string
  sort: ProductSort
}

export const DEFAULT_PRODUCT_SEARCH: ProductSearch = { q: '', sort: 'name_asc' }

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
}

/**
 * Read from the URL, which anyone can edit, so an unknown sort falls back to
 * the default rather than crashing the page.
 */
export function readProductSearch(
  params: Record<string, string | string[] | undefined>,
): ProductSearch {
  const sort = first(params.sort)
  return {
    q: first(params.q).slice(0, 100),
    sort: PRODUCT_SORTS.some((option) => option.value === sort)
      ? (sort as ProductSort)
      : DEFAULT_PRODUCT_SEARCH.sort,
  }
}
