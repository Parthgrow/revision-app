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

function formatDue(dueDate: number): string {
  const now = Date.now()
  const diff = dueDate - now
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'Due now'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

export default function BrowseClient({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState(initialItems)

  async function handleDelete(id: string) {
    await fetch(`/api/items/${id}`, { method: 'DELETE' })
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <main className="max-w-[700px] mx-auto px-10 py-16 flex flex-col gap-8">
      <div className="flex items-baseline justify-between">
        <h1 className="font-serif text-[36px] font-light tracking-[0.04em] text-[var(--text-primary)]">
          The palace
        </h1>
        <span className="text-[11px] tracking-[0.14em] uppercase text-[var(--text-muted)]">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] py-10">Nothing stored yet.</p>
      ) : (
        <div className="flex flex-col" style={{ gap: '1px', background: 'var(--border)', border: '1px solid var(--border)' }}>
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-[var(--bg-card)] px-6 py-5 flex flex-col gap-2.5 transition-colors duration-150 hover:bg-[var(--bg-elevated)]"
            >
              <div className="font-serif text-[17px] font-light text-[var(--text-primary)] leading-[1.5] tracking-[0.01em]">
                {item.content}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] tracking-[0.08em]">
                <span className="text-[var(--accent-dim)]">{formatDue(item.dueDate)}</span>
                <span className="opacity-40">·</span>
                <span>{item.repetitions} review{item.repetitions !== 1 ? 's' : ''}</span>
                <span className="opacity-40">·</span>
                <span>ease {item.easeFactor.toFixed(1)}</span>
                <button
                  onClick={() => handleDelete(item.id)}
                  aria-label="Delete item"
                  className="ml-auto bg-transparent border-none text-[var(--text-muted)] cursor-pointer text-[10px] opacity-40 transition-all duration-200 hover:opacity-100 hover:text-[#b07070] px-1 py-0.5"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
