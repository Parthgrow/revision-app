'use client'

import { useState } from 'react'
import Nav from '@/components/Nav'

export default function AddPage() {
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setStatus('saving')
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.trim() }),
    })
    if (res.ok) {
      setContent('')
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } else {
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Nav />
      <main className="max-w-[600px] mx-auto px-10 py-20 flex flex-col gap-10">
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-[36px] font-light tracking-[0.04em] text-[var(--text-primary)]">
            Add to the palace
          </h1>
          <p className="text-[13px] text-[var(--text-muted)] tracking-[0.06em]">
            What do you want to remember?
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="font-serif bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] p-6 text-[20px] font-light leading-[1.7] tracking-[0.02em] outline-none resize-y w-full transition-colors duration-200 focus:border-[var(--accent-dim)] placeholder:text-[var(--text-muted)] placeholder:italic"
            placeholder="Enter something to memorize..."
            rows={6}
            required
          />
          <div className="flex items-center justify-between">
            {status === 'saved' && (
              <span className="text-[12px] tracking-[0.12em] text-[var(--accent-dim)]">✦ Committed to memory</span>
            )}
            {status === 'error' && (
              <span className="text-[12px] text-[#b07070]">Something went wrong</span>
            )}
            <button
              type="submit"
              disabled={status === 'saving' || !content.trim()}
              className="ml-auto bg-transparent border border-[var(--accent-dim)] text-[var(--accent)] px-7 py-3 text-[11px] tracking-[0.18em] uppercase cursor-pointer transition-colors duration-200 hover:bg-[var(--accent-glow)] hover:border-[var(--accent)] disabled:opacity-40 disabled:cursor-default"
            >
              {status === 'saving' ? 'Storing...' : 'Store in palace'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
