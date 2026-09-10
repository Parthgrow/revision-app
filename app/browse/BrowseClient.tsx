'use client'

import { useState } from 'react'

type Item = {
  id: string
  content: string
  interval: number
  easeFactor: number
  repetitions: number
  dueDate: number
}

function formatDue(dueDate: number): { text: string; urgent: boolean } {
  const now = Date.now()
  const diff = dueDate - now
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days <= 0) return { text: 'Now', urgent: true }
  if (days === 1) return { text: '+1 d', urgent: false }
  return { text: `+${days} d`, urgent: false }
}

export default function BrowseClient({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState(initialItems)

  async function handleDelete(id: string) {
    await fetch(`/api/items/${id}`, { method: 'DELETE' })
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const dueNow = items.filter((i) => formatDue(i.dueDate).urgent).length

  return (
    <main className="flex-1 w-full max-w-[860px] mx-auto px-6 sm:px-10 py-8 sm:py-12 flex flex-col">

      <header className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-ink)] pb-2">
        <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Library</h1>
        <span className="text-[14px] text-[var(--ink-2)]">
          {dueNow} due · {items.length} stored
        </span>
      </header>

      {items.length === 0 ? (
        <p className="text-[16px] text-[var(--ink-3)] py-14">Nothing stored yet.</p>
      ) : (
        <div className="ledger flex flex-col pt-4">
          {/* Column heads. Small caps and a rule — the printed-table device. */}
          <div className="grid grid-cols-[1fr_60px_28px] sm:grid-cols-[1fr_68px_48px_52px_28px] gap-4 px-3 pb-1.5 border-b border-[var(--rule)]">
            <span className="smallcaps">Item</span>
            <span className="smallcaps text-right">Due</span>
            <span className="smallcaps text-right hidden sm:block">Reps</span>
            <span className="smallcaps text-right hidden sm:block">Ease</span>
            <span />
          </div>

          {items.map((item) => {
            const due = formatDue(item.dueDate)
            return (
              <div
                key={item.id}
                className="row group grid grid-cols-[1fr_60px_28px] sm:grid-cols-[1fr_68px_48px_52px_28px] gap-4 px-3 py-2.5 items-baseline transition-colors duration-100"
              >
                <span className="text-[15px] leading-snug">{item.content}</span>
                <span
                  className={`text-[14px] text-right ${
                    due.urgent ? 'text-[var(--ink)] font-semibold' : 'text-[var(--ink-3)]'
                  }`}
                >
                  {due.text}
                </span>
                <span className="text-[14px] text-right text-[var(--ink-3)] hidden sm:block">
                  {item.repetitions}
                </span>
                <span className="text-[14px] text-right text-[var(--ink-3)] hidden sm:block">
                  {item.easeFactor.toFixed(1)}
                </span>
                <button
                  onClick={() => handleDelete(item.id)}
                  aria-label="Delete item"
                  className="text-[13px] text-[var(--ink-4)] bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-150 hover:text-[var(--ink)]"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
