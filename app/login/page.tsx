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
    <div className="min-h-screen flex bg-[var(--bg)]">
      {/* Left accent panel */}
      <div className="hidden lg:flex w-[360px] shrink-0 flex-col justify-between p-12 bg-[var(--bg-subtle)] border-r border-[var(--hairline)]">
        <span className="font-serif text-[18px] text-[var(--text-primary)]">MindGym</span>
        <div className="flex flex-col gap-4">
          <p className="font-serif text-[26px] text-[var(--text-primary)] leading-[1.25]">
            Memory is a palace. You hold the key.
          </p>
          <p className="text-[var(--text-muted)] text-[14px] leading-relaxed">
            Spaced repetition for the things that matter.
          </p>
        </div>
        <p className="text-[var(--text-faint)] text-[12px]">
          MindGym · Memory System
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-12">
        <div className="w-full max-w-[360px] flex flex-col gap-10">

          {/* Mobile brand */}
          <div className="lg:hidden flex items-center">
            <span className="font-serif text-[18px] text-[var(--text-primary)]">MindGym</span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="font-serif text-[26px] text-[var(--text-primary)] leading-tight">
              Sign in
            </h1>
            <p className="text-[14px] text-[var(--text-muted)]">
              Welcome back to your palace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] text-[var(--text-muted)]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[var(--bg-subtle)] border border-[var(--hairline)] rounded-md text-[var(--text-primary)] px-4 py-3 text-[15px] outline-none w-full transition-colors duration-150 focus:border-[var(--hairline-strong)] placeholder:text-[var(--text-faint)]"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] text-[var(--text-muted)]">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[var(--bg-subtle)] border border-[var(--hairline)] rounded-md text-[var(--text-primary)] px-4 py-3 text-[15px] outline-none w-full transition-colors duration-150 focus:border-[var(--hairline-strong)] placeholder:text-[var(--text-faint)]"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-[13px] text-[var(--text-secondary)] bg-[var(--bg-subtle)] rounded-md px-3 py-2 border border-[var(--hairline)]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 py-3 text-[14px] font-medium rounded-md cursor-pointer transition-colors duration-150 border-none bg-[var(--text-primary)] text-[var(--bg)] hover:bg-white disabled:opacity-40 disabled:cursor-default disabled:hover:bg-[var(--text-primary)]"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-[14px] text-[var(--text-muted)]">
            No account?{' '}
            <Link
              href="/register"
              className="text-[var(--text-primary)] no-underline hover:text-white transition-colors duration-150"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
