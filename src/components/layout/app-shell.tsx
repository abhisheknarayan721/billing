'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { type Role, USER_HOME, canAccessPath } from '@/lib/auth/roles'
import { COMPANY } from '@/lib/company'

interface NavItem {
  label: string
  href: string
  icon: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', href: '/', icon: '📊' }],
  },
  {
    title: 'Sales',
    items: [
      { label: 'New Order', href: '/order', icon: '🛒' },
      { label: 'All Orders', href: '/order/list', icon: '📋' },
      { label: 'New Invoice', href: '/invoice', icon: '🧾' },
      { label: 'All Invoices', href: '/invoice/list', icon: '📄' },
      { label: 'Print Invoices', href: '/invoice/print', icon: '🖨️' },
    ],
  },
  {
    title: 'Stock',
    items: [
      { label: 'Add Purchase', href: '/purchase', icon: '📦' },
      { label: 'All Purchases', href: '/purchase/list', icon: '🗂️' },
      { label: 'Products', href: '/product', icon: '🏷️' },
    ],
  },
  {
    title: 'Payments',
    items: [
      { label: 'Add Payment', href: '/payment', icon: '💳' },
      { label: 'All Payments', href: '/payment/list', icon: '💰' },
    ],
  },
  {
    title: 'Ledger',
    items: [
      { label: 'Retailer Ledger', href: '/ledger/retailer/statement', icon: '📒' },
      { label: 'Retailer Balances', href: '/ledger/retailer/balance', icon: '⚖️' },
      { label: 'Product Ledger', href: '/ledger/product', icon: '📈' },
      { label: 'Add Retailer', href: '/ledger/retailer', icon: '🏪' },
      // The retailers list carries each retailer's balance due.
      { label: 'All Retailers', href: '/ledger/retailer/list', icon: '👥' },
      { label: 'Add Supplier', href: '/ledger/supplier', icon: '🚚' },
      { label: 'All Suppliers', href: '/ledger/supplier/list', icon: '🏭' },
    ],
  },
  {
    title: 'Admin',
    items: [
      { label: 'Add User', href: '/user', icon: '👤' },
      { label: 'All Users', href: '/user/list', icon: '🔐' },
    ],
  },
]

/** Only the links this role may open; groups left empty are dropped. */
function navGroupsFor(role: Role): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessPath(role, item.href)),
    }))
    .filter((group) => group.items.length > 0)
}

/**
 * The link that owns the current path: an exact match, or else the longest
 * href the path sits under, so /invoice/12/edit lights up "All Invoices"
 * rather than nothing, and /invoice/list never also lights "New Invoice".
 */
function activeHref(groups: NavGroup[], pathname: string) {
  const allHrefs = groups.flatMap((group) => group.items.map((item) => item.href))
  if (allHrefs.includes(pathname)) return pathname
  return allHrefs
    .filter((href) => href !== '/' && pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0]
}

function Brand({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <Image src={COMPANY.logo} alt="" width={28} height={28} className="h-7 w-7" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-slate-900">{COMPANY.name}</span>
        <span className="block text-xs text-slate-500">Billing &amp; Inventory</span>
      </span>
    </Link>
  )
}

function NavLinks({
  groups,
  pathname,
  onNavigate,
}: {
  groups: NavGroup[]
  pathname: string
  onNavigate?: () => void
}) {
  const current = activeHref(groups, pathname)

  return (
    <nav className="space-y-6">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.href === current
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active
                        ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-100'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span aria-hidden="true" className="w-5 text-center text-base">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

interface AppShellProps {
  /** Signed-in user's name, shown in the sidebar footer. */
  userName: string
  /** Decides which links the sidebar shows. proxy.ts enforces it. */
  role: Role
  /** The log-out control, rendered on the server so it can post its action. */
  userMenu: React.ReactNode
  children: React.ReactNode
}

const AppShell = ({ userName, role, userMenu, children }: AppShellProps) => {
  const pathname = usePathname()
  const groups = navGroupsFor(role)
  const home = role === 'admin' ? '/' : USER_HOME
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the drawer on Escape, and keep the page behind it from scrolling.
  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  const userCard = (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-xs font-bold text-white">
        {initials || '?'}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{userName}</span>
      {userMenu}
    </div>
  )

  return (
    <div className="min-h-full lg:pl-64 print:pl-0">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex print:hidden">
        <div className="border-b border-slate-100 px-5 py-5">
          <Brand href={home} />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <NavLinks groups={groups} pathname={pathname} />
        </div>
        <div className="border-t border-slate-100 p-3">{userCard}</div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden print:hidden">
        <Brand href={home} />
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-100"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
              <Brand href={home} />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-5">
              <NavLinks groups={groups} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            </div>
            <div className="border-t border-slate-100 p-3">{userCard}</div>
          </div>
        </div>
      )}

      <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8 print:p-0">{children}</main>
    </div>
  )
}

export default AppShell
