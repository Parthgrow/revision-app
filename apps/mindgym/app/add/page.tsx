'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

export default function AddPage() {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSaving(true)
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.trim() }),
    })
    if (res.ok) {
      router.push('/')
    } else {
      setError(true)
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] flex flex-col sm:flex-row">
      <Nav />
      <div className="flex-1 min-w-0 flex justify-center">
        <main className="w-full max-w-[680px] px-6 sm:px-10 py-10 sm:py-14 flex flex-col gap-8">

        <header className="flex items-baseline justify-between gap-4 flex-wrap border-b border-[var(--rule-ink)] pb-3">
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">New item</h1>
          <span className="smallcaps">What do you want to remember?</span>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); setError(false) }}
            className="bg-transparent border border-[var(--rule)] text-[var(--ink)] p-5 text-[18px] leading-[1.65] outline-none resize-y w-full transition-colors duration-150 focus:border-[var(--ink-3)] placeholder:text-[var(--ink-4)]"
            placeholder="A fact, a phrase, an association…"
            rows={7}
            required
          />

          <div className="flex items-center justify-between gap-4">
            <div>
              {error && (
                <span className="text-[14px] text-[var(--ink-2)]">
                  Couldn&apos;t save that. Try again.
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={saving || !content.trim()}
              className="px-6 py-2.5 text-[14px] font-semibold border-none bg-[var(--ink)] text-[var(--paper)] cursor-pointer transition-opacity duration-150 hover:opacity-85 disabled:opacity-40 disabled:cursor-default"
            >
              {saving ? 'Saving…' : 'Add to palace'}
            </button>
          </div>
        </form>
        </main>
      </div>
    </div>
  )
}
