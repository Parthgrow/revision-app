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
    <div className="min-h-screen bg-[var(--bg)]">
      <Nav />
      <main className="max-w-[600px] mx-auto px-6 sm:px-10 py-14 sm:py-20 flex flex-col gap-10">

        <div className="flex flex-col gap-2">
          <span className="eyebrow">New item</span>
          <h1 className="font-serif text-[26px] sm:text-[30px] leading-[1.15] text-[var(--text-primary)]">
            What do you want to remember?
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); setError(false) }}
            className="font-serif bg-[var(--bg-subtle)] border border-[var(--hairline)] rounded-md text-[var(--text-primary)] p-5 text-[17px] leading-[1.7] outline-none resize-y w-full transition-colors duration-150 focus:border-[var(--hairline-strong)] placeholder:text-[var(--text-faint)]"
            placeholder="Enter something to memorize..."
            rows={6}
            required
          />

          <div className="flex items-center justify-between">
            <div>
              {error && (
                <span className="text-[13px] text-[var(--text-secondary)]">
                  Something went wrong
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={saving || !content.trim()}
              className="px-6 py-2.5 text-[13px] font-medium rounded-md cursor-pointer transition-colors duration-150 border-none bg-[var(--text-primary)] text-[var(--bg)] hover:bg-white disabled:opacity-40 disabled:cursor-default disabled:hover:bg-[var(--text-primary)]"
            >
              {saving ? 'Saving…' : 'Add to palace'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
