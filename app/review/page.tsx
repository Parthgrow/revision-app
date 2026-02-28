'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

type Item = {
  id: string
  content: string
  interval: number
  repetitions: number
}

const RATINGS = [
  { label: 'Again', value: 0, desc: 'Forgot entirely', hoverBorder: '#8b4040' },
  { label: 'Hard', value: 1, desc: 'Recalled with effort', hoverBorder: '#8b6640' },
  { label: 'Good', value: 2, desc: 'Recalled correctly', hoverBorder: 'var(--accent-dim)' },
  { label: 'Easy', value: 3, desc: 'Recalled instantly', hoverBorder: '#4a7a4a' },
]

export default function ReviewPage() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)

  useEffect(() => {
    fetch('/api/items/due')
      .then((r) => r.json())
      .then((data) => {
        setItems(data)
        setLoading(false)
      })
  }, [])

  async function handleRating(value: number) {
    if (submitting) return
    setSubmitting(true)
    const item = items[index]
    await fetch(`/api/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: value }),
    })
    setSessionCount((c) => c + 1)
    setSubmitting(false)
    setRevealed(false)
    setIndex((i) => i + 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <Nav />
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 65px)' }}>
          <p className="text-[13px] tracking-[0.14em] uppercase text-[var(--text-muted)]">
            Preparing the palace...
          </p>
        </div>
      </div>
    )
  }

  if (index >= items.length) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <Nav />
        <div className="flex flex-col items-center justify-center gap-4 px-10" style={{ minHeight: 'calc(100vh - 65px)' }}>
          <div className="font-serif text-[32px] text-[var(--accent)] opacity-60 mb-2">✦</div>
          <h2 className="font-serif text-[36px] font-light text-[var(--text-primary)] tracking-[0.06em]">
            Session complete
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] tracking-[0.1em]">
            {sessionCount} item{sessionCount !== 1 ? 's' : ''} reviewed
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 bg-transparent border border-[var(--accent-dim)] text-[var(--accent)] px-8 py-3 text-[11px] tracking-[0.18em] uppercase cursor-pointer transition-colors duration-200 hover:bg-[var(--accent-glow)]"
          >
            Return to the palace
          </button>
        </div>
      </div>
    )
  }

  const item = items[index]
  const progress = (index / items.length) * 100

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Nav />
      <div className="max-w-[620px] mx-auto px-10 py-16 flex flex-col gap-10">

        <div className="flex flex-col gap-2">
          <div className="w-full h-px bg-[var(--border)]">
            <div
              className="h-full bg-[var(--accent-dim)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-[11px] tracking-[0.14em] text-[var(--text-muted)] text-right">
            {index + 1} / {items.length}
          </div>
        </div>

        <div
          onClick={() => !revealed && setRevealed(true)}
          className={`bg-[var(--bg-card)] border px-12 py-16 min-h-[220px] flex flex-col items-center justify-center gap-6 transition-colors duration-200 ${
            revealed
              ? 'border-[var(--accent-dim)] cursor-default'
              : 'border-[var(--border)] cursor-pointer hover:border-[var(--border-light)]'
          }`}
        >
          <div className="font-serif text-[26px] font-light text-[var(--text-primary)] leading-[1.5] text-center tracking-[0.02em]">
            {item.content}
          </div>
          {!revealed && (
            <div className="text-[10px] tracking-[0.18em] uppercase text-[var(--text-muted)] opacity-60">
              Click to mark as recalled
            </div>
          )}
        </div>

        {revealed && (
          <div className="flex flex-col gap-4">
            <p className="text-[11px] tracking-[0.14em] uppercase text-[var(--text-muted)] text-center">
              How well did you recall it?
            </p>
            <div className="grid grid-cols-4 gap-2">
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => handleRating(r.value)}
                  disabled={submitting}
                  style={{ '--hover-border': r.hoverBorder } as React.CSSProperties}
                  className="bg-[var(--bg-card)] border border-[var(--border)] py-4 px-2 flex flex-col items-center gap-1.5 cursor-pointer transition-colors duration-200 hover:bg-[var(--bg-elevated)] hover:border-[var(--hover-border)] disabled:opacity-50 disabled:cursor-default"
                >
                  <span className="text-[12px] tracking-[0.1em] text-[var(--text-primary)]">{r.label}</span>
                  <span className="text-[10px] text-[var(--text-muted)] text-center leading-[1.4]">{r.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
