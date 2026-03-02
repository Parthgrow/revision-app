'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/auth/register', {
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
    <div className="min-h-screen flex bg-[var(--bg)]">
      {/* Left accent panel */}
      <div
        className="hidden lg:flex w-[380px] shrink-0 flex-col justify-between p-12"
        style={{ background: 'var(--accent)' }}
      >
        <span className="font-serif text-[22px] text-white">Loci</span>
        <div className="flex flex-col gap-4">
          <p className="font-serif text-[32px] text-white leading-[1.2]">
            Build the palace. One memory at a time.
          </p>
          <p className="text-white/60 text-[13px] leading-relaxed">
            Science-backed spaced repetition to help you remember what matters.
          </p>
        </div>
        <p className="text-white/30 text-[11px] tracking-[0.08em] uppercase">
          Loci · Memory System
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-10">
        <div className="w-full max-w-[360px] flex flex-col gap-10">

          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            <span className="font-serif text-[20px] text-[var(--text-primary)]">Loci</span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="font-serif text-[32px] text-[var(--text-primary)] leading-tight">
              Create account
            </h1>
            <p className="text-[13px] text-[var(--text-muted)]">
              Start building your memory palace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium tracking-[0.1em] uppercase text-[var(--text-secondary)]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] px-4 py-3 text-[14px] outline-none w-full transition-colors duration-150 focus:border-[var(--accent)] placeholder:text-[var(--text-muted)]"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium tracking-[0.1em] uppercase text-[var(--text-secondary)]">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] px-4 py-3 text-[14px] outline-none w-full transition-colors duration-150 focus:border-[var(--accent)] placeholder:text-[var(--text-muted)]"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-[12px] text-[var(--accent)] bg-[var(--accent-glow)] px-3 py-2 border border-[var(--accent)]/20">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 py-3.5 text-[13px] font-semibold tracking-[0.06em] uppercase cursor-pointer transition-colors duration-150 border-none disabled:opacity-50 disabled:cursor-default"
              style={{ background: 'var(--accent)', color: '#ffffff' }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-hover)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)' }}
            >
              {loading ? 'Creating...' : 'Create account'}
            </button>
          </form>

          <p className="text-[13px] text-[var(--text-muted)]">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-[var(--accent)] no-underline font-medium hover:text-[var(--accent-hover)] transition-colors duration-150"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
