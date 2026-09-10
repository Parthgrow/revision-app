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

// No colour to spend, so the four ratings order themselves by ink weight.
// Good carries the darker rule because it's the one you'll press most.
const RATINGS = [
  { label: 'Again', value: 0, desc: 'Forgot entirely' },
  { label: 'Hard', value: 1, desc: 'Recalled with effort' },
  { label: 'Good', value: 2, desc: 'Recalled correctly', lead: true },
  { label: 'Easy', value: 3, desc: 'Recalled instantly' },
]

export default function HomeClient({ dueItems, totalCount, streak }: Props) {
  const [items, setItems] = useState<Item[]>(dueItems)
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
    setSubmitting(false)
  }

  // Rating removes the item, so the head of the queue is always the current card.
  const current = items[0]
  const done = dueItems.length - items.length

  return (
    <main className="flex-1 w-full max-w-[720px] mx-auto px-6 sm:px-10 py-8 sm:py-12 flex flex-col">

      <header className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-ink)] pb-2">
        <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Due today</h1>
        <span className="text-[14px] text-[var(--ink-2)]">
          {items.length} of {totalCount}
        </span>
      </header>

      <p className="smallcaps pt-2">
        {streak.current} day streak
      </p>

      {!current ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20 text-center">
          <p className="text-[18px] text-[var(--ink-2)] max-w-[30ch] leading-relaxed">
            {done > 0
              ? 'That’s everything for today. The palace is still.'
              : 'Nothing due today. The palace is still.'}
          </p>
          <Link
            href="/add"
            className="text-[15px] text-[var(--ink)] underline underline-offset-4 decoration-[var(--rule)] hover:decoration-[var(--ink)] transition-colors duration-150"
          >
            Add something to remember
          </Link>
        </div>
      ) : (
        <>
          {/* Progress reads as a printed rule that fills in, not a bar. */}
          <div className="flex items-center gap-3 pt-7">
            <div className="flex gap-[3px]" aria-hidden>
              {dueItems.map((_, i) => (
                <span
                  key={i}
                  className={`block w-[15px] h-[2px] ${
                    i < done ? 'bg-[var(--ink)]' : 'bg-[var(--rule)]'
                  }`}
                />
              ))}
            </div>
            <span className="smallcaps">
              {done + 1} of {dueItems.length}
            </span>
          </div>

          <div className="flex-1 flex items-center justify-center py-14 sm:py-20">
            <p className="text-[22px] sm:text-[26px] font-light leading-[1.45] text-center max-w-[30ch]">
              {current.content}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <p className="smallcaps text-center">How well did you recall it?</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => handleRating(current.id, r.value)}
                  disabled={submitting}
                  className={`py-3 px-2 flex flex-col items-center gap-1 cursor-pointer bg-transparent transition-colors duration-150 border hover:bg-[var(--paper-3)] disabled:opacity-40 disabled:cursor-default ${
                    r.lead ? 'border-[var(--ink-3)]' : 'border-[var(--rule)]'
                  }`}
                >
                  <span className="text-[15px] font-semibold text-[var(--ink)]">{r.label}</span>
                  <span className="text-[12px] text-[var(--ink-3)] text-center leading-[1.35]">
                    {r.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  )
}
