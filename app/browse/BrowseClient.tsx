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
  if (days <= 0) return { text: 'Due now', urgent: true }
  if (days === 1) return { text: 'Tomorrow', urgent: false }
  return { text: `In ${days} days`, urgent: false }
}

export default function BrowseClient({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState(initialItems)

  async function handleDelete(id: string) {
    await fetch(`/api/items/${id}`, { method: 'DELETE' })
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <main className="max-w-[700px] mx-auto px-6 sm:px-10 py-14 sm:py-16 flex flex-col gap-9">

      <div className="flex items-end justify-between gap-4 border-b border-[var(--hairline)] pb-5">
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Library</span>
          <h1 className="font-serif text-[26px] sm:text-[30px] leading-tight text-[var(--text-primary)]">
            The palace
          </h1>
        </div>
        <div className="flex flex-col items-end gap-1 pb-1 shrink-0">
          <span className="font-serif text-[26px] leading-none text-[var(--text-primary)]">
            {items.length}
          </span>
          <span className="text-[12px] text-[var(--text-muted)]">
            item{items.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-[15px] text-[var(--text-muted)] py-10">
          Nothing stored yet.
        </p>
      ) : (
        <div className="flex flex-col row-divide border-t border-b border-[var(--hairline)]">
          {items.map((item) => {
            const due = formatDue(item.dueDate)
            return (
              <div
                key={item.id}
                className="px-1 py-5 flex flex-col gap-2.5 transition-colors duration-150 hover:bg-[var(--bg-subtle)]"
              >
                <div className="font-serif text-[17px] text-[var(--text-primary)] leading-relaxed">
                  {item.content}
                </div>
                <div className="flex items-center gap-2 text-[12px] text-[var(--text-faint)] flex-wrap">
                  <span
                    className={due.urgent ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}
                  >
                    {due.text}
                  </span>
                  <span className="opacity-30">·</span>
                  <span>{item.repetitions} review{item.repetitions !== 1 ? 's' : ''}</span>
                  <span className="opacity-30">·</span>
                  <span>ease {item.easeFactor.toFixed(1)}</span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    aria-label="Delete item"
                    className="ml-auto bg-transparent border-none text-[var(--text-faint)] cursor-pointer text-[12px] transition-colors duration-150 hover:text-[var(--text-primary)] px-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
