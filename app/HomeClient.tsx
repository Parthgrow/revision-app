'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Item = {
  id: string
  content: string
  interval: number
  easeFactor: number
  repetitions: number
  dueDate: number
}

type Streak = { current: number }

type Props = {
  items: Item[]
  streak: Streak
}

// No colour to spend, so the four ratings order themselves by ink weight.
// Good carries the darker rule — it's the one you press most.
const RATINGS = [
  { label: 'Again', value: 0, desc: 'Forgot entirely' },
  { label: 'Hard', value: 1, desc: 'Recalled with effort' },
  { label: 'Good', value: 2, desc: 'Recalled correctly', lead: true },
  { label: 'Easy', value: 3, desc: 'Recalled instantly' },
]

function formatDue(dueDate: number): { text: string; due: boolean } {
  const days = Math.ceil((dueDate - Date.now()) / 86_400_000)
  if (days <= 0) return { text: 'Now', due: true }
  if (days === 1) return { text: '+1 d', due: false }
  return { text: `+${days} d`, due: false }
}

export default function HomeClient({ items: initialItems, streak }: Props) {
  const [items, setItems] = useState<Item[]>(initialItems)
  const [openId, setOpenId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const open = items.find((i) => i.id === openId) ?? null

  // Escape closes the panel — it's a drawer, not a page.
  useEffect(() => {
    if (!openId) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openId])

  async function handleRating(itemId: string, value: number) {
    if (submitting) return
    setSubmitting(true)
    const res = await fetch(`/api/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: value }),
    })
    if (res.ok) {
      // The route returns the rescheduled item, so the row updates in place
      // rather than vanishing — this is the library as well as the queue.
      const updated = (await res.json()) as Item
      setItems((prev) =>
        [...prev.map((i) => (i.id === itemId ? updated : i))].sort(
          (a, b) => a.dueDate - b.dueDate
        )
      )
      setOpenId(null)
    }
    setSubmitting(false)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/items/${id}`, { method: 'DELETE' })
    setItems((prev) => prev.filter((i) => i.id !== id))
    setOpenId(null)
  }

  const dueCount = items.filter((i) => formatDue(i.dueDate).due).length

  return (
    <main className="w-full max-w-[880px] px-6 sm:px-10 py-10 sm:py-14 flex flex-col">

      <header className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-ink)] pb-3">
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Review</h1>
        <span className="text-[15px] text-[var(--ink-2)]">
          {dueCount} due · {items.length} stored
        </span>
      </header>

      <div className="flex items-baseline justify-between gap-4 pt-4">
        <p className="smallcaps">{streak.current} day streak</p>
        <Link
          href="/add"
          className="text-[14px] text-[var(--ink-2)] no-underline underline underline-offset-4 decoration-[var(--rule)] hover:text-[var(--ink)] hover:decoration-[var(--ink)] transition-colors duration-150"
        >
          Add item
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-[16px] text-[var(--ink-3)] py-20">
          Nothing stored yet. Add something you want to remember.
        </p>
      ) : (
        <div className="ledger flex flex-col pt-7">
          <div className="grid grid-cols-[1fr_64px] sm:grid-cols-[1fr_72px_52px_56px] gap-5 px-3 pb-2 border-b border-[var(--rule)]">
            <span className="smallcaps">Item</span>
            <span className="smallcaps text-right">Due</span>
            <span className="smallcaps text-right hidden sm:block">Reps</span>
            <span className="smallcaps text-right hidden sm:block">Ease</span>
          </div>

          {items.map((item) => {
            const due = formatDue(item.dueDate)
            const isOpen = item.id === openId
            return (
              <button
                key={item.id}
                onClick={() => setOpenId(isOpen ? null : item.id)}
                aria-expanded={isOpen}
                // No bg class when closed: the alternating wash and hover live
                // in globals.css, and a Tailwind background here would win over them.
                className={`row grid grid-cols-[1fr_64px] sm:grid-cols-[1fr_72px_52px_56px] gap-5 px-3 py-3.5 items-baseline text-left border-none cursor-pointer transition-colors duration-100 ${
                  isOpen ? 'is-open shadow-[inset_2px_0_0_var(--ink)]' : ''
                }`}
              >
                <span className="text-[16px] leading-snug truncate">{item.content}</span>
                <span
                  className={`text-[15px] text-right ${
                    due.due ? 'text-[var(--ink)] font-semibold' : 'text-[var(--ink-3)]'
                  }`}
                >
                  {due.text}
                </span>
                <span className="text-[15px] text-right text-[var(--ink-3)] hidden sm:block">
                  {item.repetitions}
                </span>
                <span className="text-[15px] text-right text-[var(--ink-3)] hidden sm:block">
                  {item.easeFactor.toFixed(1)}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Review drawer. Slides in from the right; full width on a phone. */}
      {open && (
        <>
          <div
            onClick={() => setOpenId(null)}
            className="fixed inset-0 z-40 bg-[rgba(33,31,28,0.18)]"
            aria-hidden
          />
          <aside
            role="dialog"
            aria-label="Review item"
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-[var(--paper)] border-l border-[var(--rule)] shadow-[-18px_0_44px_-30px_rgba(33,31,28,0.6)] flex flex-col"
          >
            <div className="flex items-baseline justify-between gap-4 px-7 pt-7 pb-3 border-b border-[var(--rule)]">
              <span className="smallcaps">Review</span>
              <button
                onClick={() => setOpenId(null)}
                className="text-[15px] text-[var(--ink-4)] bg-transparent border-none cursor-pointer transition-colors duration-150 hover:text-[var(--ink)]"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 flex items-center px-7 py-10 overflow-y-auto">
              <p className="text-[21px] font-light leading-[1.5]">{open.content}</p>
            </div>

            <div className="px-7 pb-7 flex flex-col gap-4">
              <div className="flex items-baseline gap-5 text-[14px] text-[var(--ink-3)] border-t border-[var(--rule)] pt-4">
                <span>Due {formatDue(open.dueDate).text.toLowerCase()}</span>
                <span>{open.repetitions} reps</span>
                <span>Ease {open.easeFactor.toFixed(1)}</span>
                <button
                  onClick={() => handleDelete(open.id)}
                  className="ml-auto text-[var(--ink-4)] bg-transparent border-none cursor-pointer transition-colors duration-150 hover:text-[var(--ink)]"
                >
                  Delete
                </button>
              </div>

              <p className="smallcaps">How well did you recall it?</p>
              <div className="grid grid-cols-2 gap-2.5">
                {RATINGS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => handleRating(open.id, r.value)}
                    disabled={submitting}
                    className={`py-3.5 px-3 flex flex-col items-center gap-1 cursor-pointer bg-transparent transition-colors duration-150 border hover:bg-[var(--paper-3)] disabled:opacity-40 disabled:cursor-default ${
                      r.lead ? 'border-[var(--ink-3)]' : 'border-[var(--rule)]'
                    }`}
                  >
                    <span className="text-[16px] font-semibold text-[var(--ink)]">{r.label}</span>
                    <span className="text-[12px] text-[var(--ink-3)] text-center leading-[1.35]">
                      {r.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </>
      )}
    </main>
  )
}
