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
    { href: '/add', label: 'Add' },
    { href: '/browse', label: 'Browse' },
  ]

  return (
    <nav className="flex items-center justify-between px-10 py-4 border-b border-[var(--border)] bg-[var(--bg)]">
      <Link
        href="/"
        className="font-serif text-[20px] text-[var(--text-primary)] no-underline flex items-center gap-2.5"
      >
        <span
          className="w-2 h-2 rounded-full inline-block"
          style={{ background: 'var(--accent)' }}
        />
        Loci
      </Link>
      <div className="flex items-center gap-7">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`text-[12px] font-medium tracking-[0.08em] uppercase no-underline transition-colors duration-150 ${
              pathname === l.href
                ? 'text-[var(--accent)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {l.label}
          </Link>
        ))}
        <button
          onClick={logout}
          className="text-[12px] font-medium tracking-[0.08em] uppercase text-[var(--text-muted)] bg-transparent border-none cursor-pointer transition-colors duration-150 hover:text-[var(--accent)]"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
