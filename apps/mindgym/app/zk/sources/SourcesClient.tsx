'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Source } from '@/lib/zk/types'
import { btnPrimary, input, link } from '@/components/zk/ui'

export default function SourcesClient({ initial }: { initial: Source[] }) {
  const [sources, setSources] = useState(initial)
  const [form, setForm] = useState({ title: '', author: '', url: '', year: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || saving) return
    setSaving(true)
    setError(null)
    const res = await fetch('/api/zk/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, year: form.year ? Number(form.year) : undefined }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setError(data.error ?? 'Couldn’t add that source.')
      return
    }
    setSources((prev) => [...prev, data as Source].sort((a, b) => a.title.localeCompare(b.title)))
    setForm({ title: '', author: '', url: '', year: '' })
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
  })

  return (
    <>
      <Link href="/zk" className={`text-[14px] ${link}`}>
        ← Notes
      </Link>
      <header className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-ink)] pb-3">
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Sources</h1>
        <span className="smallcaps">Books, articles, talks</span>
      </header>

      <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-3">
        <input {...field('title')} placeholder="Title" required className={`${input} sm:col-span-2`} />
        <input {...field('author')} placeholder="Author" className={input} />
        <input {...field('year')} placeholder="Year" inputMode="numeric" className={input} />
        <input {...field('url')} placeholder="URL" type="url" className={`${input} sm:col-span-2`} />
        <div className="sm:col-span-2 flex items-center justify-between gap-4">
          <span className="text-[14px] text-[var(--ink-2)]">{error}</span>
          <button type="submit" disabled={saving || !form.title.trim()} className={btnPrimary}>
            {saving ? 'Adding…' : 'Add source'}
          </button>
        </div>
      </form>

      {sources.length === 0 ? (
        <p className="text-[16px] text-[var(--ink-3)]">No sources yet. Add what you’re reading.</p>
      ) : (
        <div className="ledger flex flex-col">
          {sources.map((s) => (
            <Link
              key={s.id}
              href={`/zk/sources/${s.id}`}
              className="row flex items-baseline justify-between gap-4 px-3 py-3 no-underline text-[var(--ink)]"
            >
              <span className="text-[16px] truncate">{s.title}</span>
              <span className="text-[14px] text-[var(--ink-3)] shrink-0">
                {[s.author, s.year].filter(Boolean).join(', ')}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
