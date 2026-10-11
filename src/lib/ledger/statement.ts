// A party's running account: invoices raised against them are debits (they owe
// more), payments received from them are credits (they owe less). Built from
// plain values so it can be computed on the server and rendered anywhere.

import { formatMoney } from '@/lib/company'

type Money = { toFixed(places: number): string }

/** A balance reads as Dr (they owe us) or Cr (paid in advance). */
export function formatBalance(paise: number) {
  const rupees = formatMoney(Math.abs(paise) / 100)
  if (paise === 0) return rupees
  return `${rupees} ${paise > 0 ? 'Dr' : 'Cr'}`
}

export interface StatementInvoice {
  inv_id: number
  invoicenumber: string
  /** A bare day, stored as UTC midnight. */
  invoicedate: Date
  totalamount: Money
  status: string
}

export interface StatementPayment {
  pay_id: number
  pay_amt: Money | null
  pay_method: string | null
  /** The moment the payment was taken. */
  createddate: Date | null
}

export interface StatementEntry {
  key: string
  kind: 'invoice' | 'payment'
  id: number
  /** `YYYY-MM-DD`, the day the entry falls on. */
  day: string
  /** What the entry was, e.g. "Invoice INV-00001" or "Payment (UPI)". */
  particulars: string
  status?: string
  /** A cancelled invoice is listed but moves nothing. */
  counted: boolean
  debitPaise: number
  creditPaise: number
  /** What the party owes after this entry; negative means paid in advance. */
  balancePaise: number
}

export interface Statement {
  entries: StatementEntry[]
  totalDebitPaise: number
  totalCreditPaise: number
  balancePaise: number
}

/** Whole paise, so adding many DECIMAL(18,2) amounts cannot drift. */
function toPaise(value: Money | null): number {
  return value === null ? 0 : Math.round(Number(value.toFixed(2)) * 100)
}

/** The local calendar day of a real moment, in the server's time zone. */
function localDay(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

export function buildStatement(
  invoices: StatementInvoice[],
  payments: StatementPayment[],
): Statement {
  const rows: (Omit<StatementEntry, 'balancePaise'> & { order: number })[] = [
    ...invoices.map((invoice) => {
      const counted = invoice.status !== 'Cancelled'
      return {
        key: `inv-${invoice.inv_id}`,
        kind: 'invoice' as const,
        id: invoice.inv_id,
        day: invoice.invoicedate.toISOString().slice(0, 10),
        particulars: `Invoice ${invoice.invoicenumber}`,
        status: invoice.status,
        counted,
        debitPaise: counted ? toPaise(invoice.totalamount) : 0,
        creditPaise: 0,
        order: 0,
      }
    }),
    ...payments.map((payment) => ({
      key: `pay-${payment.pay_id}`,
      kind: 'payment' as const,
      id: payment.pay_id,
      day: payment.createddate ? localDay(payment.createddate) : '',
      particulars: payment.pay_method ? `Payment (${payment.pay_method})` : 'Payment',
      counted: true,
      debitPaise: 0,
      creditPaise: toPaise(payment.pay_amt),
      // Within a day, payments follow the day's invoices, in the order taken.
      order: payment.createddate ? payment.createddate.getTime() : 0,
    })),
  ]

  // By day; on the same day invoices come before payments, then by time / id.
  rows.sort(
    (a, b) =>
      a.day.localeCompare(b.day) ||
      (a.kind === b.kind ? 0 : a.kind === 'invoice' ? -1 : 1) ||
      a.order - b.order ||
      a.id - b.id,
  )

  let balancePaise = 0
  let totalDebitPaise = 0
  let totalCreditPaise = 0

  const entries = rows.map((row): StatementEntry => {
    totalDebitPaise += row.debitPaise
    totalCreditPaise += row.creditPaise
    balancePaise += row.debitPaise - row.creditPaise
    return {
      key: row.key,
      kind: row.kind,
      id: row.id,
      day: row.day,
      particulars: row.particulars,
      status: row.status,
      counted: row.counted,
      debitPaise: row.debitPaise,
      creditPaise: row.creditPaise,
      balancePaise,
    }
  })

  return { entries, totalDebitPaise, totalCreditPaise, balancePaise }
}
