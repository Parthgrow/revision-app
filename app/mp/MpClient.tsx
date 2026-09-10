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
    <main className="flex-1 w-full max-w-[860px] mx-auto px-6 sm:px-10 py-8 sm:py-12 flex flex-col">

      <header className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-ink)] pb-2">
        <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Palace</h1>
        <div className="flex items-baseline gap-4">
          <span className="text-[14px] text-[var(--ink-2)]">
            {items.length} {items.length === 1 ? 'entry' : 'entries'}
          </span>
          <button
            type="button"
            onClick={() => {
              setContent('')
              setStatus('prep')
              setError(null)
              setIsModalOpen(true)
            }}
            className="text-[14px] text-[var(--ink)] bg-transparent border-none cursor-pointer underline underline-offset-4 decoration-[var(--rule)] hover:decoration-[var(--ink)] transition-colors duration-150"
          >
            New entry
          </button>
        </div>
      </header>

      <p className="smallcaps pt-2">One memory palace a day</p>

      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(33,31,28,0.28)] px-4">
          <div className="w-full max-w-md border border-[var(--rule)] bg-[var(--paper)] p-6 shadow-[0_18px_40px_-24px_rgba(33,31,28,0.5)]">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-[18px] font-semibold">New memory</h2>
                <p className="text-[14px] text-[var(--ink-3)]">
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
                className="bg-transparent border-none text-[var(--ink-4)] text-[15px] cursor-pointer px-1 py-1 transition-colors duration-150 hover:text-[var(--ink)]"
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
                className="w-full text-[15px] leading-relaxed bg-transparent border border-[var(--rule)] px-4 py-3 text-[var(--ink)] outline-none resize-none transition-colors duration-150 focus:border-[var(--ink-3)] placeholder:text-[var(--ink-4)]"
                placeholder="A room, image, story, or association you want to remember..."
              />
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="smallcaps">Status</span>
                  <div className="inline-flex border border-[var(--rule)] overflow-hidden text-[13px]">
                    {STATUS_LABELS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setStatus(s.value)}
                        className={`px-3 py-1 cursor-pointer border-none outline-none transition-colors duration-150 ${
                          status === s.value
                            ? 'bg-[var(--ink)] text-[var(--paper)]'
                            : 'bg-transparent text-[var(--ink-3)] hover:text-[var(--ink)]'
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
                  className="ml-auto px-5 py-2 text-[14px] font-semibold border-none bg-[var(--ink)] text-[var(--paper)] cursor-pointer transition-opacity duration-150 hover:opacity-85 disabled:opacity-40"
                >
                  {submitting ? 'Creating…' : 'Create'}
                </button>
              </div>
              {error && <p className="text-[13px] text-[var(--ink-2)]">{error}</p>}
            </form>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-[16px] text-[var(--ink-3)] py-14">
          No rooms in your memory palace yet. Start by adding a single clear image or phrase.
        </p>
      ) : (
        <div className="ledger flex flex-col pt-4">
          <div className="grid grid-cols-[1fr_28px] sm:grid-cols-[1fr_220px_28px] gap-4 px-3 pb-1.5 border-b border-[var(--rule)]">
            <span className="smallcaps">Entry</span>
            <span className="smallcaps hidden sm:block">Status</span>
            <span />
          </div>

          {items.map((item) => (
            <div
              key={item.id}
              className="row group grid grid-cols-[1fr_28px] sm:grid-cols-[1fr_220px_28px] gap-x-4 gap-y-2 px-3 py-2.5 items-baseline transition-colors duration-100"
            >
              <span className="text-[15px] leading-snug">{item.content}</span>

              <div className="col-span-2 sm:col-span-1 sm:col-start-2 inline-flex border border-[var(--rule)] overflow-hidden text-[12px] w-fit">
                {STATUS_LABELS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => handleStatusChange(item.id, s.value)}
                    disabled={updatingId === item.id}
                    className={`px-2.5 py-1 cursor-pointer border-none outline-none transition-colors duration-150 disabled:opacity-50 ${
                      item.status === s.value
                        ? 'bg-[var(--ink)] text-[var(--paper)]'
                        : 'bg-transparent text-[var(--ink-3)] hover:text-[var(--ink)]'
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
                className="row-start-1 col-start-2 sm:col-start-3 justify-self-end text-[13px] text-[var(--ink-4)] bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-150 hover:text-[var(--ink)]"
                aria-label="Delete entry"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
