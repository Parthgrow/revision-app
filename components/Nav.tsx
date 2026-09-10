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

  const links = [
    { href: '/', label: 'Review' },
    { href: '/browse', label: 'Library' },
    { href: '/mp', label: 'Palace' },
    { href: '/add', label: 'Add' },
  ]

  return (
    // A margin, not a panel. One vertical rule and no fill, so the page stays a
    // single sheet. Collapses to a strip along the top on small screens.
    <nav
      className="
        shrink-0 border-b border-[var(--rule)]
        px-5 py-4
        flex flex-row items-baseline gap-5
        sm:w-[136px] sm:min-h-screen sm:border-b-0 sm:border-r
        sm:px-5 sm:py-7 sm:flex-col sm:items-stretch sm:gap-0
      "
    >
      <Link
        href="/"
        className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--ink)] no-underline sm:mb-5"
      >
        MindGym
      </Link>

      <div className="flex flex-row items-baseline gap-4 sm:flex-col sm:items-stretch sm:gap-0">
        {links.map((l) => {
          const active = pathname === l.href
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? 'page' : undefined}
              className={`text-[15px] no-underline py-0.5 transition-colors duration-150 ${
                active
                  ? 'text-[var(--ink)] font-semibold'
                  : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
              }`}
            >
              <span className="hidden sm:inline text-[var(--ink-4)]">{active ? '— ' : '   '}</span>
              {l.label}
            </Link>
          )
        })}
      </div>

      <button
        onClick={logout}
        className="ml-auto sm:ml-0 sm:mt-auto text-left text-[13px] text-[var(--ink-4)] bg-transparent border-none cursor-pointer transition-colors duration-150 hover:text-[var(--ink-2)]"
      >
        Sign out
      </button>
    </nav>
  )
}
