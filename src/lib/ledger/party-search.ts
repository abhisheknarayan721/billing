// The ledger lists are searched by one free-text box, read from `?q=` in the URL.

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
}

/** Capped so a hand-edited URL cannot send an unbounded LIKE pattern. */
export function readPartySearch(
  params: Record<string, string | string[] | undefined>,
): string {
  return first(params.q).slice(0, 100)
}
