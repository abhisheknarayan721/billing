// Search filters for the list pages (invoices, payments), read from the URL's
// search params. These never reach the database as values to store — only as a
// WHERE clause.

export interface ListSearch {
  /** Free text, matched case-insensitively; what it matches is up to each list. */
  q: string
  /** Inclusive date range as `YYYY-MM-DD`; either end may be blank. */
  from: string
  to: string
}

export const EMPTY_LIST_SEARCH: ListSearch = { q: '', from: '', to: '' }

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
}

/**
 * Anything that is not a real `YYYY-MM-DD` date is dropped rather than
 * reported: the params come from a URL anyone can edit, and a broken date
 * should widen the search, not crash the page.
 */
function readDate(value: string | string[] | undefined): string {
  const raw = first(value)
  return DATE_PATTERN.test(raw) && !Number.isNaN(Date.parse(raw)) ? raw : ''
}

export function readListSearch(
  params: Record<string, string | string[] | undefined>,
): ListSearch {
  let from = readDate(params.from)
  let to = readDate(params.to)

  // A reversed range is almost always the two boxes filled the wrong way round.
  if (from !== '' && to !== '' && from > to) [from, to] = [to, from]

  return { q: first(params.q).slice(0, 100), from, to }
}

export function isFiltered(search: ListSearch): boolean {
  return search.q !== '' || search.from !== '' || search.to !== ''
}
