import Image from 'next/image'

import LoginForm from '@/components/auth/login-form'
import { COMPANY } from '@/lib/company'

export const metadata = { title: 'Log in' }

const highlights = [
  { icon: '🧾', text: 'GST-ready invoices, printed in one click' },
  { icon: '📦', text: 'Purchases and stock kept in step' },
  { icon: '📒', text: 'Retailer ledgers and balances at a glance' },
]

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next } = await searchParams

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — desktop only, the form stands alone on phones. */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10" />
        <div aria-hidden="true" className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/10" />

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow">
            <Image src={COMPANY.logo} alt="" width={30} height={30} className="h-7 w-7" />
          </span>
          <span className="text-lg font-semibold">{COMPANY.name}</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Billing and inventory, all in one place.
          </h2>
          <ul className="mt-8 space-y-4">
            {highlights.map((item) => (
              <li key={item.text} className="flex items-center gap-3 text-sky-50">
                <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-lg">
                  {item.icon}
                </span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-sky-100">© {new Date().getFullYear()} {COMPANY.name}</p>
      </div>

      {/* Sign-in form */}
      <div className="flex items-center justify-center bg-gradient-to-b from-sky-50 to-white px-4 py-12 sm:px-6 lg:bg-none lg:bg-white">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-slate-200 lg:hidden">
              <Image src={COMPANY.logo} alt="" width={36} height={36} className="h-9 w-9" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
              <p className="mt-1 text-sm text-slate-500">Log in to {COMPANY.name} to continue.</p>
            </div>
          </div>
          <div className="card p-6 sm:p-8 lg:border-0 lg:p-0 lg:shadow-none">
            <LoginForm next={typeof next === 'string' ? next : '/'} />
          </div>
        </div>
      </div>
    </div>
  )
}
