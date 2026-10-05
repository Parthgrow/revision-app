'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Note, NoteSummary } from '@/lib/zk/types'
import { summarize } from '@/lib/zk/summary'
import NoteRow from '@/components/zk/NoteRow'
import { useNoteSearch } from '@/components/zk/useNoteSearch'
import { btnPrimary, input, link } from '@/components/zk/ui'

function Section({ title, hint, notes, empty }: { title: string; hint?: string; notes: NoteSummary[]; empty: string }) {
  return (
    <section className="flex flex-col">
      <div className="flex items-baseline justify-between gap-4 px-3 pb-2 border-b border-[var(--rule)]">
        <h2 className="smallcaps">
          {title} · {notes.length}
        </h2>
        {hint && <span className="text-[13px] text-[var(--ink-4)]">{hint}</span>}
      </div>
      {notes.length === 0 ? (
        <p className="px-3 py-4 text-[15px] text-[var(--ink-3)]">{empty}</p>
      ) : (
        <div className="ledger flex flex-col">
          {notes.map((n) => (
            <NoteRow key={n.id} note={n} />
          ))}
        </div>
      )}
    </section>
  )
}

export default function ZkHomeClient({ initial }: { initial: NoteSummary[] }) {
  const [notes, setNotes] = useState(initial)
  const [capture, setCapture] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const search = useNoteSearch(notes)

  // Quick capture: one box, saved as a fleeting note into the inbox.
  async function handleCapture(e: React.FormEvent) {
    e.preventDefault()
    if (!capture.trim() || saving) return
    setSaving(true)
    setError(null)
    const res = await fetch('/api/zk/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: capture.trim(), type: 'fleeting' }),
    })
    if (res.ok) {
      const note = (await res.json()) as Note
      setNotes((prev) => [summarize(note, 0), ...prev])
      setCapture('')
    } else {
      setError((await res.json().catch(() => ({}))).error ?? 'Couldn’t save that. Try again.')
    }
    setSaving(false)
  }

  const tags = [...new Set(notes.flatMap((n) => n.tags))].sort()
  const filtered = tag ? notes.filter((n) => n.tags.includes(tag)) : notes
  const results = query.trim() ? search(query).filter((n) => !tag || n.tags.includes(tag)) : null

  const inbox = filtered.filter((n) => n.type === 'fleeting')
  const entryPoints = filtered.filter((n) => n.type === 'structure')
  const recent = filtered.filter((n) => n.type !== 'fleeting').slice(0, 15)
  const orphans = filtered.filter((n) => n.type === 'permanent' && n.linkCount === 0 && n.backlinkCount === 0)

  return (
    <>
      <header className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-ink)] pb-3">
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Notes</h1>
        <span className="text-[15px] text-[var(--ink-2)]">
          {notes.length} notes · {inbox.length} in inbox
        </span>
      </header>

      <form onSubmit={handleCapture} className="flex flex-col gap-3">
        <textarea
          value={capture}
          onChange={(e) => setCapture(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleCapture(e)
          }}
          rows={3}
          placeholder="Capture a thought — it lands in the inbox to process later…"
          className={`${input} p-4 text-[17px] leading-[1.6] resize-y`}
        />
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <span className="text-[14px] text-[var(--ink-2)]">{error}</span>
          <div className="flex items-baseline gap-5">
            <Link href="/zk/new?type=permanent" className={`text-[14px] ${link}`}>
              Write a permanent note
            </Link>
            <Link href="/zk/sources" className={`text-[14px] ${link}`}>
              Sources
            </Link>
            <button type="submit" disabled={saving || !capture.trim()} className={btnPrimary}>
              {saving ? 'Saving…' : 'Capture'}
            </button>
          </div>
        </div>
      </form>

      <div className="flex flex-col gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles, tags and text…"
          className={input}
        />
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[14px]">
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setTag(tag === t ? null : t)}
                className={`bg-transparent border-none cursor-pointer px-0 ${
                  tag === t ? 'text-[var(--ink)] font-semibold' : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      {results ? (
        <section className="flex flex-col">
          <h2 className="smallcaps px-3 pb-2 border-b border-[var(--rule)]">
            {results.length} result{results.length === 1 ? '' : 's'}
          </h2>
          {results.length === 0 ? (
            <p className="px-3 py-4 text-[15px] text-[var(--ink-3)]">Nothing matches.</p>
          ) : (
            <div className="ledger flex flex-col">
              {results.map((n) => (
                <NoteRow key={n.id} note={n} showExcerpt />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <Section
            title="Inbox"
            hint="fleeting notes to process"
            notes={inbox}
            empty="Inbox zero. Captured thoughts appear here until you process them."
          />
          <Section
            title="Entry points"
            hint="structure notes"
            notes={entryPoints}
            empty="No structure notes yet. Promote a permanent note that gathers a topic."
          />
          <Section title="Recent" notes={recent} empty="No literature or permanent notes yet." />
          {orphans.length > 0 && (
            <Section title="Orphans" hint="permanent notes with no links" notes={orphans} empty="" />
          )}
        </>
      )}
    </>
  )
}
