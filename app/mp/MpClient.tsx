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
    <main className="max-w-[700px] mx-auto px-6 sm:px-10 py-14 sm:py-16 flex flex-col gap-9">
      <div className="flex items-end justify-between gap-4 border-b border-[var(--hairline)] pb-5">
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Memory palace</span>
          <h1 className="font-serif text-[26px] sm:text-[30px] leading-tight text-[var(--text-primary)]">
            One memory palace a day
          </h1>
          <p className="text-[14px] text-[var(--text-muted)] max-w-[460px]">
            Keeps your mind active and engaged.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2.5 pb-1 shrink-0">
          <span className="font-serif text-[26px] leading-none text-[var(--text-primary)]">
            {items.length}
          </span>
          <span className="text-[12px] text-[var(--text-muted)]">
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
            className="mt-1 w-10 h-10 flex items-center justify-center border border-[var(--hairline)] rounded-md text-[var(--text-muted)] text-[20px] cursor-pointer transition-colors duration-150 hover:border-[var(--hairline-strong)] hover:text-[var(--text-primary)]"
            aria-label="Add memory palace entry"
          >
            +
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-lg border border-[var(--hairline)] bg-[var(--bg-subtle)] p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex flex-col gap-1">
                <h2 className="font-serif text-[20px] text-[var(--text-primary)]">New memory</h2>
                <p className="text-[13px] text-[var(--text-muted)]">
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
                className="bg-transparent border-none text-[var(--text-faint)] text-[15px] cursor-pointer px-1 py-1 transition-colors duration-150 hover:text-[var(--text-primary)]"
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
                className="w-full text-[15px] bg-transparent border border-[var(--hairline)] rounded-md px-4 py-3 text-[var(--text-primary)] outline-none resize-none transition-colors duration-150 focus:border-[var(--hairline-strong)] placeholder:text-[var(--text-faint)]"
                placeholder="A room, image, story, or association you want to remember..."
              />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="eyebrow">Status</span>
                  <div className="inline-flex rounded-md border border-[var(--hairline)] overflow-hidden text-[12px]">
                    {STATUS_LABELS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setStatus(s.value)}
                        className={`px-4 py-1.5 cursor-pointer border-none outline-none transition-colors duration-150 ${
                          status === s.value
                            ? 'bg-[var(--text-primary)] text-[var(--bg)]'
                            : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
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
                  className="ml-auto px-5 py-2 text-[13px] font-medium rounded-md border-none bg-[var(--text-primary)] text-[var(--bg)] cursor-pointer transition-colors duration-150 hover:bg-white disabled:opacity-40"
                >
                  {submitting ? 'Creating…' : 'Create'}
                </button>
              </div>
              {error && <p className="text-[13px] text-[var(--text-secondary)]">{error}</p>}
            </form>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-[15px] text-[var(--text-muted)] py-8">
          No rooms in your memory palace yet. Start by adding a single clear image or phrase.
        </p>
      ) : (
        <section className="flex flex-col row-divide border-t border-b border-[var(--hairline)]">
          {items.map((item) => (
            <div
              key={item.id}
              className="px-1 py-5 flex flex-col gap-3 transition-colors duration-150 hover:bg-[var(--bg-subtle)]"
            >
              <div className="font-serif text-[17px] text-[var(--text-primary)] leading-relaxed">
                {item.content}
              </div>
              <div className="flex items-center gap-3 text-[12px] text-[var(--text-faint)] flex-wrap">
                <span>Status</span>
                <div className="inline-flex rounded-md border border-[var(--hairline)] overflow-hidden ml-1">
                  {STATUS_LABELS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => handleStatusChange(item.id, s.value)}
                      disabled={updatingId === item.id}
                      className={`px-4 py-1.5 cursor-pointer border-none outline-none text-[11px] transition-colors duration-150 ${
                        item.status === s.value
                          ? 'bg-[var(--text-primary)] text-[var(--bg)]'
                          : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
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
                  className="ml-auto bg-transparent border-none text-[var(--text-faint)] cursor-pointer text-[12px] transition-colors duration-150 hover:text-[var(--text-primary)] px-1"
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

