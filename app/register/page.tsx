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
    <div className="min-h-screen flex bg-[var(--paper)]">
      {/* Left accent panel */}
      <div className="hidden lg:flex w-[340px] shrink-0 flex-col justify-between p-12 border-r border-[var(--rule)]">
        <span className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--ink)]">MindGym</span>
        <div className="flex flex-col gap-4">
          <p className="text-[26px] font-light text-[var(--ink)] leading-[1.3]">
            Build the palace. One memory at a time.
          </p>
          <p className="text-[15px] text-[var(--ink-3)] leading-relaxed">
            Science-backed spaced repetition to help you remember what matters.
          </p>
        </div>
        <p className="smallcaps">
          MindGym · Memory System
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-12">
        <div className="w-full max-w-[360px] flex flex-col gap-10">

          {/* Mobile brand */}
          <div className="lg:hidden flex items-center">
            <span className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--ink)]">MindGym</span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-[var(--ink)] leading-tight">
              Create account
            </h1>
            <p className="text-[15px] text-[var(--ink-3)]">
              Start building your memory palace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="smallcaps">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent border border-[var(--rule)] text-[var(--ink)] px-4 py-3 text-[15px] outline-none w-full transition-colors duration-150 focus:border-[var(--ink-3)] placeholder:text-[var(--ink-4)]"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="smallcaps">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent border border-[var(--rule)] text-[var(--ink)] px-4 py-3 text-[15px] outline-none w-full transition-colors duration-150 focus:border-[var(--ink-3)] placeholder:text-[var(--ink-4)]"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-[14px] text-[var(--ink-2)] px-3 py-2 border border-[var(--rule)] bg-[var(--paper-2)]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 py-3 text-[15px] font-semibold border-none bg-[var(--ink)] text-[var(--paper)] cursor-pointer transition-opacity duration-150 hover:opacity-85 disabled:opacity-40 disabled:cursor-default"
            >
              {loading ? 'Creating…' : 'Create account'}
            </button>
          </form>

          <p className="text-[15px] text-[var(--ink-3)]">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-[var(--ink)] no-underline underline underline-offset-4 decoration-[var(--rule)] hover:decoration-[var(--ink)] transition-colors duration-150"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
