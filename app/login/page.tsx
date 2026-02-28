'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    setLoading(false)
    if (res.ok) {
      router.push('/')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(196,149,58,0.05) 0%, transparent 60%)' }}>
      <div className="w-full max-w-[380px] px-10 py-12 bg-[var(--bg-card)] border border-[var(--border)] text-center">
        <div className="text-xl text-[var(--accent)] opacity-80 mb-4">✦</div>
        <h1 className="font-serif text-[36px] font-light tracking-[0.12em] text-[var(--text-primary)] mb-1">Loci</h1>
        <p className="text-[12px] tracking-[0.18em] uppercase text-[var(--text-muted)] mb-10">Enter the palace</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-left">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] tracking-[0.14em] uppercase text-[var(--text-muted)]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] px-3.5 py-2.5 text-sm font-light outline-none w-full transition-colors duration-200 focus:border-[var(--accent-dim)] placeholder:text-[var(--text-muted)]"
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] tracking-[0.14em] uppercase text-[var(--text-muted)]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] px-3.5 py-2.5 text-sm font-light outline-none w-full transition-colors duration-200 focus:border-[var(--accent-dim)] placeholder:text-[var(--text-muted)]"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-xs text-[#b07070] text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 bg-transparent border border-[var(--accent-dim)] text-[var(--accent)] py-3 text-[12px] tracking-[0.18em] uppercase cursor-pointer transition-colors duration-200 hover:bg-[var(--accent-glow)] hover:border-[var(--accent)] disabled:opacity-50 disabled:cursor-default"
          >
            {loading ? 'Entering...' : 'Enter'}
          </button>
        </form>

        <p className="mt-6 text-xs text-[var(--text-muted)]">
          No account?{' '}
          <Link href="/register" className="text-[var(--accent-dim)] no-underline hover:text-[var(--accent)] transition-colors duration-200">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
