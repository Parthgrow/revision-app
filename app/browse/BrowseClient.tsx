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
    <main className="max-w-[700px] mx-auto px-10 py-16 flex flex-col gap-10">

      <div className="flex items-end justify-between border-b border-[var(--border)] pb-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-6 h-[2px] bg-[var(--accent)]" />
            <span className="text-[11px] font-medium tracking-[0.14em] uppercase text-[var(--text-muted)]">
              Library
            </span>
          </div>
          <h1 className="font-serif text-[38px] leading-tight text-[var(--text-primary)]">
            The palace
          </h1>
        </div>
        <div className="flex flex-col items-end gap-1 pb-1">
          <span className="font-serif text-[36px] leading-none" style={{ color: 'var(--accent)' }}>
            {items.length}
          </span>
          <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-[var(--text-muted)]">
            item{items.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-[14px] text-[var(--text-muted)] py-10">
          Nothing stored yet.
        </p>
      ) : (
        <div className="flex flex-col gap-px bg-[var(--border)] border border-[var(--border)]">
          {items.map((item) => {
            const due = formatDue(item.dueDate)
            return (
              <div
                key={item.id}
                className="bg-[var(--bg)] px-6 py-5 flex flex-col gap-3 transition-colors duration-150 hover:bg-[var(--bg-card)]"
              >
                <div className="font-serif text-[17px] text-[var(--text-primary)] leading-relaxed">
                  {item.content}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] tracking-[0.04em]">
                  <span
                    className="font-medium"
                    style={{ color: due.urgent ? 'var(--accent)' : 'var(--text-muted)' }}
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
                    className="ml-auto bg-transparent border-none text-[var(--text-muted)] cursor-pointer text-[11px] opacity-30 transition-all duration-150 hover:opacity-100 hover:text-[var(--accent)] px-1"
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
