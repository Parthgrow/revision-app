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
    { href: '/review', label: 'Review' },
    { href: '/add', label: 'Add' },
    { href: '/browse', label: 'Browse' },
  ]

  return (
    <nav className="flex items-center justify-between px-10 py-5 border-b border-[var(--border)] bg-[var(--bg)]">
      <Link
        href="/"
        className="font-serif text-[22px] font-light tracking-[0.12em] text-[var(--text-primary)] no-underline"
      >
        Loci
      </Link>
      <div className="flex items-center gap-8">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`text-[11px] tracking-[0.16em] uppercase no-underline transition-colors duration-200 ${
              pathname === l.href
                ? 'text-[var(--accent)]'
                : 'text-[var(--text-muted)] hover:text-[var(--accent)]'
            }`}
          >
            {l.label}
          </Link>
        ))}
        <button
          onClick={logout}
          className="text-[11px] tracking-[0.16em] uppercase text-[var(--text-muted)] bg-transparent border-none cursor-pointer font-sans transition-colors duration-200 hover:text-[#b07070]"
        >
          Leave
        </button>
      </div>
    </nav>
  )
}
