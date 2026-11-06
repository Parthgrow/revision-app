'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { NoteSummary, NoteType, NoteView, Source } from '@/lib/zk/types'
import { PROMOTIONS } from '@/lib/zk/types'
import MarkdownView from '@/components/zk/MarkdownView'
import { btnPrimary, btnQuiet, link } from '@/components/zk/ui'

type Props = { view: NoteView; inReview: boolean; sources: Source[] }

const PROMOTE_LABEL: Record<NoteType, string> = {
  permanent: 'Promote to permanent',
  literature: 'Make literature note',
  structure: 'Mark as entry point',
  fleeting: '',
}

function LinkList({ title, notes, empty }: { title: string; notes: NoteSummary[]; empty: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="smallcaps border-b border-[var(--rule)] pb-2">
        {title} · {notes.length}
      </h2>
      {notes.length === 0 ? (
        <p className="text-[15px] text-[var(--ink-3)]">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {notes.map((n) => (
            <li key={n.id} className="flex items-baseline gap-3 text-[16px]">
              <span className="w-10 shrink-0 text-[13px] text-[var(--ink-4)]">{n.address ?? ''}</span>
              <Link href={`/zk/${n.id}`} className={`${link} truncate`}>
                {n.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function SeqLink({ label, note }: { label: string; note: NoteSummary | null }) {
  if (!note) return <span className="text-[var(--ink-4)]">{label} —</span>
  return (
    <Link href={`/zk/${note.id}`} className={link} title={note.title}>
      {label} {note.address}
    </Link>
  )
}

export default function NoteViewClient({ view, inReview: initialInReview, sources }: Props) {
  const router = useRouter()
  const { note, outgoing, backlinks, brokenLinks, sequence, source } = view
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inReview, setInReview] = useState(initialInReview)
  const [confirmDelete, setConfirmDelete] = useState<NoteSummary[] | null>(null)
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? '')

  const titles = Object.fromEntries(outgoing.map((n) => [n.id, n.title]))

  async function call(label: string, url: string, init: RequestInit) {
    setBusy(label)
    setError(null)
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init })
    const data = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      return null
    }
    return data
  }

  async function continueThought() {
    const created = await call('continue', `/api/zk/notes/${note.id}/continue`, { method: 'POST', body: '{}' })
    if (created) router.push(`/zk/${created.id}/edit`)
  }

  async function promote(to: NoteType) {
    const body = JSON.stringify(to === 'literature' ? { to, sourceId } : { to })
    if (await call('promote', `/api/zk/notes/${note.id}/promote`, { method: 'POST', body })) router.refresh()
  }

  async function toggleReview() {
    const ok = await call('review', `/api/zk/notes/${note.id}/review`, { method: inReview ? 'DELETE' : 'POST' })
    if (ok) setInReview(!inReview)
  }

  // Deleting is allowed even when other notes link here, but we say so first.
  async function startDelete() {
    const impact = await call('delete', `/api/zk/notes/${note.id}?dryRun=1`, { method: 'DELETE' })
    if (impact) setConfirmDelete(impact.brokenIncoming)
  }

  async function doDelete() {
    if (await call('delete', `/api/zk/notes/${note.id}`, { method: 'DELETE' })) {
      router.push('/zk')
      router.refresh()
    }
  }

  const promotions = PROMOTIONS[note.type]
  const hasSequence = sequence.parent || sequence.prev || sequence.next || sequence.children.length > 0

  return (
    <>
      <div className="flex items-baseline justify-between gap-4">
        <Link href="/zk" className={`text-[14px] ${link}`}>
          ← Notes
        </Link>
        <span className="smallcaps">
          {note.address && <span className="mr-3">{note.address}</span>}
          {note.type}
        </span>
      </div>

      <header className="flex flex-col gap-2 border-b border-[var(--rule-ink)] pb-3">
        <h1 className="text-[26px] font-semibold tracking-[-0.01em] leading-tight">{note.title}</h1>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[14px] text-[var(--ink-3)]">
          {source && (
            <Link href={`/zk/sources/${source.id}`} className={link}>
              {source.title}
              {source.author ? ` — ${source.author}` : ''}
            </Link>
          )}
          {note.tags.map((t) => (
            <span key={t}>#{t}</span>
          ))}
          <span>edited {new Date(note.updatedAt).toLocaleDateString()}</span>
        </div>
      </header>

      {note.body.trim() ? (
        <MarkdownView body={note.body} titles={titles} broken={brokenLinks} />
      ) : (
        <p className="text-[16px] text-[var(--ink-3)]">Empty note.</p>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-[var(--rule)] pt-4">
        <Link href={`/zk/${note.id}/edit`} className={`${btnPrimary} no-underline`}>
          Edit
        </Link>
        <button onClick={continueThought} disabled={!!busy} className={btnQuiet}>
          {busy === 'continue' ? 'Creating…' : 'Continue this thought'}
        </button>
        {note.type === 'literature' && (
          <Link href={`/zk/new?type=permanent&from=${note.id}`} className={`text-[14px] ${link}`}>
            Write a permanent note from this
          </Link>
        )}
        {promotions.map((to) =>
          to === 'literature' ? (
            sources.length > 0 && (
              <span key={to} className="flex items-baseline gap-2">
                <button onClick={() => promote(to)} disabled={!!busy || !sourceId} className={btnQuiet}>
                  {PROMOTE_LABEL[to]}
                </button>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  aria-label="Source"
                  className="bg-transparent border border-[var(--rule)] text-[14px] px-1 py-0.5 max-w-[180px]"
                >
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </span>
            )
          ) : (
            <button key={to} onClick={() => promote(to)} disabled={!!busy} className={btnQuiet}>
              {PROMOTE_LABEL[to]}
            </button>
          )
        )}
        <button onClick={toggleReview} disabled={!!busy} className={btnQuiet}>
          {inReview ? 'Remove from review' : 'Review this note'}
        </button>
        <button onClick={startDelete} disabled={!!busy} className={`${btnQuiet} ml-auto`}>
          Delete
        </button>
      </div>

      {inReview && (
        <p className="text-[14px] text-[var(--ink-3)] -mt-4">
          In your <Link href="/" className={link}>review queue</Link> — the card shows this note’s title.
        </p>
      )}

      {error && <p className="text-[14px] text-[var(--ink-2)]">{error}</p>}

      {confirmDelete && (
        <div role="alertdialog" className="border border-[var(--ink-3)] p-5 flex flex-col gap-3">
          <p className="text-[16px]">
            {confirmDelete.length === 0
              ? 'Delete this note? This can’t be undone.'
              : `${confirmDelete.length} note${confirmDelete.length === 1 ? ' links' : 's link'} here. Their links will show as missing. Delete anyway?`}
          </p>
          {confirmDelete.length > 0 && (
            <ul className="text-[15px] text-[var(--ink-2)] list-disc pl-5">
              {confirmDelete.map((n) => (
                <li key={n.id}>{n.title}</li>
              ))}
            </ul>
          )}
          <div className="flex gap-5 items-center">
            <button onClick={doDelete} disabled={!!busy} className={btnPrimary}>
              {busy === 'delete' ? 'Deleting…' : 'Delete'}
            </button>
            <button onClick={() => setConfirmDelete(null)} className={btnQuiet}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {hasSequence && (
        <section className="flex flex-col gap-2">
          <h2 className="smallcaps border-b border-[var(--rule)] pb-2">Sequence</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[15px]">
            <SeqLink label="↑ parent" note={sequence.parent} />
            <SeqLink label="← prev" note={sequence.prev} />
            <SeqLink label="next →" note={sequence.next} />
          </div>
          {sequence.children.length > 0 && (
            <ul className="flex flex-col gap-1 mt-1">
              {sequence.children.map((c) => (
                <li key={c.id} className="flex items-baseline gap-3 text-[15px]">
                  <span className="w-10 shrink-0 text-[13px] text-[var(--ink-4)]">{c.address}</span>
                  <Link href={`/zk/${c.id}`} className={link}>
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="grid sm:grid-cols-2 gap-8">
        <LinkList title="Links to" notes={outgoing} empty="No outgoing links. Type [[ in the editor to link." />
        <LinkList title="Linked from" notes={backlinks} empty="Nothing links here yet." />
      </div>
    </>
  )
}
