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
      setTimeout(() => setStatus('idle'), 2500)
    } else {
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Nav />
      <main className="max-w-[600px] mx-auto px-10 py-20 flex flex-col gap-12">

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-[2px] bg-[var(--accent)]" />
            <span className="text-[11px] font-medium tracking-[0.14em] uppercase text-[var(--text-muted)]">
              New Item
            </span>
          </div>
          <h1 className="font-serif text-[42px] leading-[1.1] text-[var(--text-primary)]">
            What do you want<br />to remember?
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="font-serif bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] p-6 text-[20px] leading-[1.7] outline-none resize-y w-full transition-colors duration-150 focus:border-[var(--accent)] placeholder:text-[var(--text-muted)] placeholder:italic"
            placeholder="Enter something to memorize..."
            rows={6}
            required
          />

          <div className="flex items-center justify-between">
            <div>
              {status === 'saved' && (
                <span className="text-[12px] font-medium text-[#16a34a] flex items-center gap-1.5">
                  <span>✓</span> Saved to your palace
                </span>
              )}
              {status === 'error' && (
                <span className="text-[12px] font-medium text-[var(--accent)]">
                  Something went wrong
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={status === 'saving' || !content.trim()}
              className="px-8 py-3 text-[12px] font-semibold tracking-[0.08em] uppercase cursor-pointer transition-colors duration-150 border-none disabled:opacity-40 disabled:cursor-default"
              style={{ background: 'var(--accent)', color: '#ffffff' }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement
                if (!el.disabled) el.style.background = 'var(--accent-hover)'
              }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)' }}
            >
              {status === 'saving' ? 'Saving...' : 'Add to palace'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
