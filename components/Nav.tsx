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
    { href: '/', label: 'Home' },
    { href: '/browse', label: 'Browse' },
    { href: '/mp', label: 'Palace' },
  ]

  return (
    <nav className="flex items-center justify-between gap-4 px-6 sm:px-10 py-4 border-b border-[var(--hairline)] bg-[var(--bg)]">
      <Link
        href="/"
        className="font-serif text-[18px] text-[var(--text-primary)] no-underline"
      >
        MindGym
      </Link>
      <div className="flex items-center gap-5 sm:gap-7">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`text-[13px] no-underline transition-colors duration-150 ${
              pathname === l.href
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {l.label}
          </Link>
        ))}
        <button
          onClick={logout}
          className="text-[13px] text-[var(--text-muted)] bg-transparent border-none cursor-pointer transition-colors duration-150 hover:text-[var(--text-secondary)]"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
