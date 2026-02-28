'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'

type Item = {
  id: string
  content: string
  interval: number
  repetitions: number
}

const RATINGS = [
  { label: 'Again', value: 0, desc: 'Forgot entirely', hoverBorder: '#8b4040' },
  { label: 'Hard', value: 1, desc: 'Recalled with effort', hoverBorder: '#8b6640' },
  { label: 'Good', value: 2, desc: 'Recalled correctly', hoverBorder: 'var(--accent-dim)' },
  { label: 'Easy', value: 3, desc: 'Recalled instantly', hoverBorder: '#4a7a4a' },
]

export default function ReviewPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/items/due')
      .then((r) => r.json())
      .then((data) => {
        setItems(data)
        setLoading(false)
      })
  }, [])

  async function handleRating(itemId: string, value: number) {
    if (submitting) return
    setSubmitting(true)
    await fetch(`/api/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: value }),
    })
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    setExpandedId(null)
    setSubmitting(false)
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <Nav />
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 65px)' }}>
          <p className="text-[13px] tracking-[0.14em] uppercase text-[var(--text-muted)]">
            Preparing the palace...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Nav />
      <main className="max-w-[680px] mx-auto px-10 py-16 flex flex-col gap-8">

        <div className="flex items-baseline justify-between">
          <h1 className="font-serif text-[36px] font-light tracking-[0.04em] text-[var(--text-primary)]">
            Due today
          </h1>
          <span className="text-[11px] tracking-[0.14em] uppercase text-[var(--text-muted)]">
            {items.length} remaining
          </span>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="font-serif text-[32px] text-[var(--text-muted)] opacity-40">✦</div>
            <p className="text-sm text-[var(--text-muted)] tracking-[0.04em]">
              The palace is still. Nothing due today.
            </p>
          </div>
        ) : (
          <div
            className="flex flex-col"
            style={{ gap: '1px', background: 'var(--border)', border: '1px solid var(--border)' }}
          >
            {items.map((item) => {
              const isOpen = expandedId === item.id
              return (
                <div key={item.id} className="flex flex-col" style={{ background: 'var(--bg-card)' }}>
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 border-none cursor-pointer transition-colors duration-150"
                    style={{ background: isOpen ? 'var(--bg-elevated)' : 'var(--bg-card)' }}
                    onMouseEnter={(e) => { if (!isOpen) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)' }}
                    onMouseLeave={(e) => { if (!isOpen) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)' }}
                  >
                    <span className="font-serif text-[18px] font-light text-[var(--text-primary)] leading-[1.5] tracking-[0.01em]">
                      {item.content}
                    </span>
                    <span
                      className="text-[var(--text-muted)] text-[12px] shrink-0 transition-transform duration-200"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    >
                      ↓
                    </span>
                  </button>

                  {isOpen && (
                    <div
                      className="px-6 pb-5 flex flex-col gap-4"
                      style={{ borderTop: '1px solid var(--border)' }}
                    >
                      <p className="text-[11px] tracking-[0.14em] uppercase text-[var(--text-muted)] pt-4">
                        How well did you recall it?
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {RATINGS.map((r) => (
                          <button
                            key={r.value}
                            onClick={() => handleRating(item.id, r.value)}
                            disabled={submitting}
                            className="py-4 px-2 flex flex-col items-center gap-1.5 cursor-pointer transition-colors duration-200 disabled:opacity-50 disabled:cursor-default"
                            style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                            onMouseEnter={(e) => {
                              const el = e.currentTarget as HTMLButtonElement
                              el.style.background = 'var(--bg-elevated)'
                              el.style.borderColor = r.hoverBorder
                            }}
                            onMouseLeave={(e) => {
                              const el = e.currentTarget as HTMLButtonElement
                              el.style.background = 'var(--bg)'
                              el.style.borderColor = 'var(--border)'
                            }}
                          >
                            <span className="text-[12px] tracking-[0.1em] text-[var(--text-primary)]">{r.label}</span>
                            <span className="text-[10px] text-[var(--text-muted)] text-center leading-[1.4]">{r.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
