'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  // Library folded into Review — one list, one screen.
  const links = [
    { href: '/', label: 'Review' },
    { href: '/zk', label: 'Notes' },
    { href: '/mp', label: 'Palace' },
    { href: '/add', label: 'Add' },
  ]

  return (
    // A margin, not a panel: one vertical rule, no fill, so the page stays a
    // single sheet. Becomes a strip along the top on small screens.
    <nav
      className="
        shrink-0 border-b border-[var(--rule)]
        px-6 py-4
        flex flex-row items-baseline gap-4
        sm:w-[168px] sm:min-h-screen sm:border-b-0 sm:border-r
        sm:px-7 sm:py-10 sm:flex-col sm:items-stretch sm:gap-0
      "
    >
      <Link
        href="/"
        className="text-[17px] sm:text-[18px] font-semibold tracking-[-0.01em] text-[var(--ink)] no-underline sm:mb-7"
      >
        MindGym
      </Link>

      <div className="flex flex-row items-baseline gap-3.5 sm:flex-col sm:items-stretch sm:gap-1">
        {links.map((l) => {
          const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? 'page' : undefined}
              className={`text-[15px] sm:text-[16px] no-underline transition-colors duration-150 sm:flex sm:items-baseline ${
                active
                  ? 'text-[var(--ink)] font-semibold'
                  : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
              }`}
            >
              {/* Fixed-width marker so the labels stay on one baseline grid. */}
              <span aria-hidden className="hidden sm:inline-block w-4 text-[var(--ink-4)]">
                {active ? '—' : ''}
              </span>
              {l.label}
            </Link>
          )
        })}
      </div>

      <button
        onClick={logout}
        className="ml-auto sm:ml-0 sm:mt-auto whitespace-nowrap text-left text-[14px] text-[var(--ink-4)] bg-transparent border-none cursor-pointer transition-colors duration-150 hover:text-[var(--ink-2)]"
      >
        Sign out
      </button>
    </nav>
  )
}
