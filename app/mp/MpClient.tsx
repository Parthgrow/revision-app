'use client'

import { useState } from 'react'
import type { MpItem, MpStatus } from '@/lib/kv'

type Props = {
  initialItems: MpItem[]
}

const STATUS_LABELS: { value: MpStatus; label: string }[] = [
  { value: 'prep', label: 'Prep' },
  { value: 'memorize', label: 'Memorize' },
  { value: 'add-revision', label: 'Add-revision' },
]

export default function MpClient({ initialItems }: Props) {
  const [items, setItems] = useState<MpItem[]>(initialItems)
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<MpStatus>('prep')
  const [submitting, setSubmitting] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  async function handleAdd(e: any) {
    e.preventDefault()
    if (submitting) return
    const trimmed = content.trim()
    if (!trimmed) {
      setError('Please enter something to remember.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/mp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed, status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to add item')
      }
      const item = (await res.json()) as MpItem
      setItems((prev) => [item, ...prev])
      setContent('')
      setStatus('prep')
      setIsModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStatusChange(id: string, nextStatus: MpStatus) {
    if (updatingId === id) return
    setUpdatingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/mp/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update status')
      }
      const updated = (await res.json()) as MpItem
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (deletingId === id) return
    setDeletingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/mp/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete item')
      }
      setItems((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="max-w-[700px] mx-auto px-12 py-16 flex flex-col gap-10">
      <div className="flex items-end justify-between border-b border-(--border) pb-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-6 h-[2px] bg-(--accent)" />
            <span className="text-[11px] font-medium tracking-[0.14em] uppercase text-(--text-muted)">
              Memory Palace
            </span>
          </div>
          <h1 className="font-serif text-[38px] leading-tight text-(--text-primary)">
            One Memory Palace A Day
          </h1>
          <p className="text-[13px] text-(--text-muted) max-w-[460px]">
            Keeps your mind active and engaged.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3 pb-1">
          <span className="font-serif text-[36px] leading-none" style={{ color: 'var(--accent)' }}>
            {items.length}
          </span>
          <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-(--text-muted)">
            entry{items.length !== 1 ? 'ies' : ''}
          </span>
          <button
            type="button"
            onClick={() => {
              setContent('')
              setStatus('prep')
              setError(null)
              setIsModalOpen(true)
            }}
            className="mt-1 w-10 h-10 flex items-center justify-center border border-(--border) rounded-full text-(--text-muted) text-[20px] cursor-pointer transition-colors duration-150 hover:border-(--accent) hover:text-(--accent)"
            aria-label="Add memory palace entry"
          >
            +
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-(--border) bg-(--bg) p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex flex-col gap-1">
                <h2 className="font-serif text-[22px] text-(--text-primary)">New memory</h2>
                <p className="text-[12px] text-(--text-muted)">
                  Describe the image, room, or association you want to capture.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!submitting) {
                    setIsModalOpen(false)
                    setError(null)
                  }
                }}
                className="bg-transparent border-none text-(--text-muted) text-[16px] cursor-pointer px-1 py-1 hover:text-(--accent)"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="w-full text-[14px] bg-transparent border border-(--border) rounded-lg px-4 py-3 text-(--text-primary) outline-none resize-none focus:border-(--accent)"
                placeholder="A room, image, story, or association you want to remember..."
              />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-medium tracking-[0.12em] uppercase text-(--text-muted)">
                    Status
                  </span>
                  <div className="inline-flex rounded-full border border-(--border) bg-(--bg) overflow-hidden text-[11px]">
                    {STATUS_LABELS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setStatus(s.value)}
                        className={`px-4 py-1.5 cursor-pointer border-none outline-none transition-colors duration-150 ${
                          status === s.value
                            ? 'bg-(--accent) text-(--bg)'
                            : 'bg-(--bg) text-(--text-muted) hover:text-(--text-primary)'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="ml-auto px-5 py-2 text-[11px] font-medium tracking-[0.14em] uppercase border border-(--border) rounded-full bg-(--bg) text-(--text-primary) cursor-pointer transition-colors duration-150 disabled:opacity-50 hover:border-(--accent) hover:text-(--accent)"
                >
                  {submitting ? 'Creating…' : 'Create'}
                </button>
              </div>
              {error && <p className="text-[12px] text-red-500">{error}</p>}
            </form>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-[14px] text-(--text-muted) py-8">
          No rooms in your memory palace yet. Start by adding a single clear image or phrase.
        </p>
      ) : (
        <section className="flex flex-col gap-px bg-(--border) border border-(--border) rounded-2xl overflow-hidden">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-(--bg) px-8 py-5 flex flex-col gap-3 transition-colors duration-150 hover:bg-(--bg-card)"
            >
              <div className="font-serif text-[17px] text-(--text-primary) leading-relaxed">
                {item.content}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-(--text-muted) tracking-[0.04em]">
                <span className="uppercase">Status</span>
                <div className="inline-flex rounded-full border border-(--border) bg-(--bg) overflow-hidden ml-1">
                  {STATUS_LABELS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => handleStatusChange(item.id, s.value)}
                      disabled={updatingId === item.id}
                      className={`px-4 py-1.5 cursor-pointer border-none outline-none text-[11px] transition-colors duration-150 ${
                        item.status === s.value
                          ? 'bg-(--accent) text-(--bg)'
                          : 'bg-(--bg) text-(--text-muted) hover:text-(--text-primary)'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="ml-auto bg-transparent border-none text-(--text-muted) cursor-pointer text-[11px] opacity-40 transition-all duration-150 hover:opacity-100 hover:text-(--accent) px-1"
                  aria-label="Delete entry"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  )
}

