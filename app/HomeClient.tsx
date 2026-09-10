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

// Four ratings, no colour. They separate by brightness instead — Again is the
// most emphatic, Easy the quietest.
const RATINGS = [
  { label: 'Again', value: 0, desc: 'Forgot entirely', tone: 'text-[var(--text-primary)]' },
  { label: 'Hard', value: 1, desc: 'Recalled with effort', tone: 'text-[var(--text-secondary)]' },
  { label: 'Good', value: 2, desc: 'Recalled correctly', tone: 'text-[var(--text-secondary)]' },
  { label: 'Easy', value: 3, desc: 'Recalled instantly', tone: 'text-[var(--text-muted)]' },
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
    <main className="max-w-[600px] mx-auto px-6 sm:px-10 py-14 sm:py-20 flex flex-col gap-12">

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Dashboard</span>
          <h1 className="font-serif text-[26px] sm:text-[30px] leading-[1.15] text-[var(--text-primary)]">
            Welcome back.
          </h1>
        </div>
        <Link
          href="/add"
          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-md border border-[var(--hairline)] text-[var(--text-muted)] no-underline text-[20px] leading-none transition-colors duration-150 hover:border-[var(--hairline-strong)] hover:text-[var(--text-primary)] mb-1"
          aria-label="Add item"
        >
          +
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        {[
          { value: items.length, label: 'Due today' },
          { value: totalCount, label: 'Total items' },
          { value: streak.current, label: 'Day streak' },
        ].map((s) => (
          <div key={s.label} className="flex flex-col gap-1.5">
            <div
              className={`font-serif text-[30px] leading-none ${
                s.value > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-faint)]'
              }`}
            >
              {s.value}
            </div>
            <div className="text-[12px] text-[var(--text-muted)]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Review list */}
      {items.length === 0 ? (
        <div className="flex flex-col gap-3 border-t border-[var(--hairline)] pt-8">
          <p className="text-[var(--text-muted)] text-[15px] leading-relaxed">
            Nothing due today. The palace is still.
          </p>
          <Link
            href="/add"
            className="text-[14px] text-[var(--text-secondary)] no-underline hover:text-[var(--text-primary)] transition-colors duration-150"
          >
            Add something to remember →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Due for review</span>
            <span className="text-[13px] text-[var(--text-secondary)]">
              {items.length} remaining
            </span>
          </div>

          <div className="flex flex-col row-divide border-t border-b border-[var(--hairline)]">
            {items.map((item) => {
              const isOpen = expandedId === item.id
              return (
                <div key={item.id} className="flex flex-col">
                  <button
                    onClick={() => toggleExpand(item.id)}
                    aria-expanded={isOpen}
                    className={`w-full text-left px-1 py-5 flex items-start justify-between gap-4 border-none cursor-pointer transition-colors duration-150 ${
                      isOpen ? 'bg-transparent' : 'hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <span className="font-serif text-[17px] text-[var(--text-primary)] leading-relaxed">
                      {item.content}
                    </span>
                    <span
                      className={`text-[13px] shrink-0 mt-1 transition-all duration-200 ${
                        isOpen ? 'rotate-180 text-[var(--text-secondary)]' : 'text-[var(--text-faint)]'
                      }`}
                    >
                      ↓
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-1 pb-6 flex flex-col gap-4">
                      <p className="eyebrow">How well did you recall it?</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {RATINGS.map((r) => (
                          <button
                            key={r.value}
                            onClick={() => handleRating(item.id, r.value)}
                            disabled={submitting}
                            className="py-3.5 px-2 flex flex-col items-center gap-1.5 cursor-pointer rounded-md border border-[var(--hairline)] bg-transparent transition-colors duration-150 hover:bg-[var(--bg-subtle)] hover:border-[var(--hairline-strong)] disabled:opacity-40 disabled:cursor-default"
                          >
                            <span className={`text-[13px] font-medium ${r.tone}`}>{r.label}</span>
                            <span className="text-[11px] text-[var(--text-faint)] text-center leading-[1.4]">
                              {r.desc}
                            </span>
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
