import Form from 'next/form'
import Link from 'next/link'

import { EMPTY_LIST_SEARCH, isFiltered, type ListSearch } from '@/lib/search'

const inputClass =
  'input'

interface SearchBarProps {
  /** The list page the search opens, e.g. '/invoice/list'. */
  action: string
  /** The filters currently applied, so the boxes show what the list is showing. */
  search?: ListSearch
  /** What the free-text box searches, e.g. 'Invoice number'. */
  textLabel: string
  textPlaceholder?: string
}

/**
 * A text + date-range search. It is a GET form: submitting puts the filters in
 * the list page's URL, so a search can be bookmarked, shared or reloaded, and
 * works without JavaScript. A create page can carry it too, and searching from
 * there jumps to the list.
 */
const SearchBar = ({
  action,
  search = EMPTY_LIST_SEARCH,
  textLabel,
  textPlaceholder,
}: SearchBarProps) => {
  return (
    <Form
      action={action}
      // Remount when the applied filters change so the uncontrolled inputs
      // pick up the new values, e.g. after "Clear".
      key={`${search.q}|${search.from}|${search.to}`}
      className="filter-bar grid grid-cols-1 items-end gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]"
    >
      <div>
        <label htmlFor="search-q" className="mb-1 block text-xs font-medium text-slate-600">
          {textLabel}
        </label>
        <input
          id="search-q"
          name="q"
          type="search"
          defaultValue={search.q}
          placeholder={textPlaceholder}
          maxLength={100}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="search-from" className="mb-1 block text-xs font-medium text-slate-600">
          From date
        </label>
        <input
          id="search-from"
          name="from"
          type="date"
          defaultValue={search.from}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="search-to" className="mb-1 block text-xs font-medium text-slate-600">
          To date
        </label>
        <input
          id="search-to"
          name="to"
          type="date"
          defaultValue={search.to}
          className={inputClass}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="btn-primary"
        >
          Search
        </button>
        {isFiltered(search) && (
          <Link href={action} className="text-sm text-slate-600 hover:underline">
            Clear
          </Link>
        )}
      </div>
    </Form>
  )
}

export default SearchBar
