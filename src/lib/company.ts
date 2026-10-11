// Seller details printed on every bill. There is no company table in the
// database, so this is the single place to edit them.

export const COMPANY = {
  name: 'Narayan Enterprises',
  addressLines: ['New Yarpur, Gardanibagh, GPO', 'Patna, Bihar 800001', 'India'],
  taxNumber: '27AAAAA0000A1Z5',
  email: 'accounts@example.com',
  phone: '6204042209',
  logo: '/images/logo.png',
} as const

const money = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Accepts a Prisma.Decimal (or anything with toFixed) and formats for display. */
export function formatMoney(value: { toFixed(places: number): string } | string | number) {
  const fixed = typeof value === 'object' ? value.toFixed(2) : Number(value).toFixed(2)
  return money.format(Number(fixed))
}

export function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(value)
}

/**
 * For real moments (e.g. when a payment was taken), shown in the server's time
 * zone. Unlike `formatDate`, which is for bare days stored as UTC midnight.
 */
export function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}
