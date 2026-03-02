'use client'

import { useState } from 'react'
import Link from 'next/link'

type Item = {
  id: string
  content: string
  interval: number
  repetitions: number
}

type Streak = {
  current: number
}

type Props = {
  dueItems: Item[]
  totalCount: number
  streak: Streak
}

const RATINGS = [
  { label: 'Again', value: 0, desc: 'Forgot entirely', color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
  { label: 'Hard', value: 1, desc: 'Recalled with effort', color: '#ea580c', bg: 'rgba(234,88,12,0.08)' },
  { label: 'Good', value: 2, desc: 'Recalled correctly', color: '#16a34a', bg: 'rgba(22,163,74,0.08)' },
  { label: 'Easy', value: 3, desc: 'Recalled instantly', color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
]

export default function HomeClient({ dueItems, totalCount, streak }: Props) {
  const [items, setItems] = useState<Item[]>(dueItems)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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

  return (
    <main className="max-w-[580px] mx-auto px-10 py-20 flex flex-col gap-14">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-[2px] bg-[var(--accent)]" />
            <span className="text-[11px] font-medium tracking-[0.14em] uppercase text-[var(--text-muted)]">
              Dashboard
            </span>
          </div>
          <h1 className="font-serif text-[48px] leading-[1.1] text-[var(--text-primary)]">
            Welcome back.
          </h1>
        </div>
        <Link
          href="/add"
          className="w-11 h-11 flex items-center justify-center border border-[var(--border)] text-[var(--text-muted)] no-underline text-[22px] leading-none transition-all duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] mb-1"
        >
          +
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px bg-[var(--border)] border border-[var(--border)]">
        {[
          { value: items.length, label: 'Due today' },
          { value: totalCount, label: 'Total items' },
          { value: streak.current, label: 'Day streak' },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--bg)] py-8 px-5 text-center">
            <div
              className="font-serif text-[44px] leading-none mb-2"
              style={{ color: s.value > 0 ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              {s.value}
            </div>
            <div className="text-[10px] font-medium tracking-[0.16em] uppercase text-[var(--text-muted)]">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Review list */}
      {items.length === 0 ? (
        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-8">
          <p className="text-[var(--text-muted)] text-[14px] leading-relaxed">
            Nothing due today. The palace is still.
          </p>
          <Link
            href="/add"
            className="text-[12px] font-medium tracking-[0.08em] uppercase text-[var(--accent)] no-underline hover:text-[var(--accent-hover)] transition-colors duration-150"
          >
            Add something to remember →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium tracking-[0.14em] uppercase text-[var(--text-muted)]">
              Due for review
            </span>
            <span className="font-serif text-[13px] text-[var(--accent)]">
              {items.length} remaining
            </span>
          </div>

          <div className="flex flex-col gap-px bg-[var(--border)] border border-[var(--border)]">
            {items.map((item) => {
              const isOpen = expandedId === item.id
              return (
                <div key={item.id} className="flex flex-col bg-[var(--bg)]">
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 border-none cursor-pointer transition-colors duration-150"
                    style={{ background: isOpen ? 'var(--bg-elevated)' : 'var(--bg)' }}
                    onMouseEnter={(e) => { if (!isOpen) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)' }}
                    onMouseLeave={(e) => { if (!isOpen) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)' }}
                  >
                    <span className="font-serif text-[18px] text-[var(--text-primary)] leading-relaxed">
                      {item.content}
                    </span>
                    <span
                      className="text-[14px] shrink-0 transition-transform duration-200"
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        color: isOpen ? 'var(--accent)' : 'var(--text-muted)',
                      }}
                    >
                      ↓
                    </span>
                  </button>

                  {isOpen && (
                    <div
                      className="px-6 pb-6 flex flex-col gap-5"
                      style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}
                    >
                      <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-[var(--text-muted)] pt-5">
                        How well did you recall it?
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {RATINGS.map((r) => (
                          <button
                            key={r.value}
                            onClick={() => handleRating(item.id, r.value)}
                            disabled={submitting}
                            className="py-4 px-2 flex flex-col items-center gap-2 cursor-pointer transition-all duration-150 border disabled:opacity-40 disabled:cursor-default"
                            style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                            onMouseEnter={(e) => {
                              const el = e.currentTarget as HTMLButtonElement
                              el.style.background = r.bg
                              el.style.borderColor = r.color
                            }}
                            onMouseLeave={(e) => {
                              const el = e.currentTarget as HTMLButtonElement
                              el.style.background = 'var(--bg)'
                              el.style.borderColor = 'var(--border)'
                            }}
                          >
                            <span className="text-[12px] font-semibold" style={{ color: r.color }}>{r.label}</span>
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
        </div>
      )}
    </main>
  )
}
