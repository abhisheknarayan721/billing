// Composes the postal-address block shared by suppliers and retailers.
// Empty parts are dropped so a sparse record never prints blank lines or
// stray commas.

export interface AddressParts {
  address?: string | null
  city?: string | null
  state?: string | null
  postalcode?: string | null
  country?: string | null
}

export function formatAddress(parts: AddressParts): string {
  const cityLine = [
    [parts.city, parts.state].filter(Boolean).join(', '),
    parts.postalcode,
  ]
    .filter(Boolean)
    .join(' - ')

  // Country shares the city/zip line, matching the company header.
  const regionLine = [cityLine, parts.country?.trim()].filter(Boolean).join(', ')

  return [parts.address, regionLine]
    .map((line) => (line ?? '').trim())
    .filter((line) => line !== '')
    .join('\n')
}
