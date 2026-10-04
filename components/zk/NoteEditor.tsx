'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Note, NoteSummary, NoteType, Source } from '@/lib/zk/types'
import { formatLink, pendingLinkQuery } from '@/lib/zk/links'
import MarkdownView from './MarkdownView'
import { useNoteSearch } from './useNoteSearch'
import { btnPrimary, btnQuiet, input, link } from './ui'

type Props = {
  note?: Note                // absent → creating a new note
  initial?: { type?: NoteType; body?: string; sourceId?: string }
  summaries: NoteSummary[]   // for [[ autocomplete
  sources: Source[]
}

const NEW_TYPES: { value: NoteType; label: string }[] = [
  { value: 'fleeting', label: 'Fleeting' },
  { value: 'literature', label: 'Literature' },
  { value: 'permanent', label: 'Permanent' },
  { value: 'structure', label: 'Structure (entry point)' },
]

const parseTags = (text: string) => text.split(/[\s,]+/).filter(Boolean)

export default function NoteEditor({ note, initial = {}, summaries, sources }: Props) {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Caret position to restore after a programmatic body change (link insert).
  const pendingCaret = useRef<number | null>(null)
  const search = useNoteSearch(summaries)

  const [title, setTitle] = useState(note?.title ?? '')
  const [body, setBody] = useState(note?.body ?? initial.body ?? '')
  const [tagsText, setTagsText] = useState(note?.tags.join(' ') ?? '')
  const [type, setType] = useState<NoteType>(note?.type ?? initial.type ?? 'permanent')
  const [sourceId, setSourceId] = useState(note?.sourceId ?? initial.sourceId ?? '')
  // The version this editor is based on — sent with every save so a newer
  // version saved elsewhere is detected instead of overwritten.
  const [baseVersion, setBaseVersion] = useState(note?.updatedAt)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<Note | null>(null)
  const [preview, setPreview] = useState(false)

  // [[ autocomplete
  const [linkQuery, setLinkQuery] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const candidates = (
    linkQuery ? search(linkQuery, 12) : summaries.slice(0, 12)
  ).filter((s) => s.id !== note?.id).slice(0, 8)

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function edit<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setDirty(true)
      setSavedAt(null)
    }
  }

  function refreshLinkQuery() {
    const el = textareaRef.current
    if (!el) return
    const q = pendingLinkQuery(el.value.slice(0, el.selectionStart))
    setLinkQuery(q)
    if (q !== linkQuery) setActive(0)
  }

  function insertLink(target: NoteSummary) {
    const el = textareaRef.current
    if (!el || linkQuery === null) return
    const caret = el.selectionStart
    const start = caret - linkQuery.length - 2 // back over "[[" + query
    const text = formatLink(target.id, target.title)
    const next = body.slice(0, start) + text + body.slice(caret)
    pendingCaret.current = start + text.length
    edit(setBody)(next)
    setLinkQuery(null)
  }

  // Runs before the browser handles the next keystroke, so fast typing after
  // picking a link lands after the link rather than at the end of the text.
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (el && pendingCaret.current !== null) {
      el.focus()
      el.setSelectionRange(pendingCaret.current, pendingCaret.current)
      pendingCaret.current = null
    }
  }, [body])

  function onBodyKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (linkQuery === null || candidates.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (a + 1) % candidates.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a - 1 + candidates.length) % candidates.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      insertLink(candidates[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setLinkQuery(null)
    }
  }

  async function save(opts: { force?: boolean; thenView?: boolean } = {}) {
    if (saving) return
    setSaving(true)
    setError(null)
    const payload = {
      title,
      body,
      tags: parseTags(tagsText),
      ...(note
        ? {
            expectedUpdatedAt: baseVersion,
            force: opts.force,
            ...(note.type === 'literature' && { sourceId }),
          }
        : { type, ...(type === 'literature' && { sourceId }) }),
    }
    const res = await fetch(note ? `/api/zk/notes/${note.id}` : '/api/zk/notes', {
      method: note ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)

    if (res.status === 409 && data.current) {
      setConflict(data.current as Note)
      return
    }
    if (!res.ok) {
      setError(data.error ?? 'Couldn’t save. Try again.')
      return
    }
    const saved = data as Note
    setDirty(false)
    setConflict(null)
    if (!note || opts.thenView) {
      router.push(`/zk/${saved.id}`)
      router.refresh()
      return
    }
    setBaseVersion(saved.updatedAt)
    setTitle(saved.title)
    setSavedAt(Date.now())
  }

  // Conflict: throw away local edits and continue from the stored version.
  function takeTheirs() {
    if (!conflict) return
    setTitle(conflict.title)
    setBody(conflict.body)
    setTagsText(conflict.tags.join(' '))
    setSourceId(conflict.sourceId ?? '')
    setBaseVersion(conflict.updatedAt)
    setConflict(null)
    setDirty(false)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const showSource = note ? note.type === 'literature' : type === 'literature'
  const titles = Object.fromEntries(summaries.map((s) => [s.id, s.title]))

  return (
    <>
      <div className="flex items-baseline justify-between gap-4">
        <Link href={note ? `/zk/${note.id}` : '/zk'} className={`text-[14px] ${link}`}>
          ← {note ? 'Back to note' : 'Notes'}
        </Link>
        <span className="smallcaps">
          {note?.address && <span className="mr-3">{note.address}</span>}
          {note ? note.type : 'new note'}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <input
          value={title}
          onChange={(e) => edit(setTitle)(e.target.value)}
          placeholder="Title — one idea, stated as a claim (optional: defaults to the first line)"
          className="bg-transparent border-none border-b border-[var(--rule-ink)] text-[24px] font-semibold tracking-[-0.01em] outline-none pb-2 placeholder:text-[var(--ink-4)] placeholder:font-normal placeholder:text-[18px]"
          style={{ borderBottomStyle: 'solid', borderBottomWidth: 1 }}
        />

        <div className="flex flex-wrap gap-4">
          {!note && (
            <label className="flex items-baseline gap-2 text-[14px] text-[var(--ink-2)]">
              <span className="smallcaps">Type</span>
              <select
                value={type}
                onChange={(e) => edit(setType)(e.target.value as NoteType)}
                className="bg-transparent border border-[var(--rule)] px-2 py-1 text-[15px]"
              >
                {NEW_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {showSource && (
            <label className="flex items-baseline gap-2 text-[14px] text-[var(--ink-2)]">
              <span className="smallcaps">Source</span>
              {sources.length === 0 ? (
                <Link href="/zk/sources" className={link}>
                  Add a source first
                </Link>
              ) : (
                <select
                  value={sourceId}
                  onChange={(e) => edit(setSourceId)(e.target.value)}
                  className="bg-transparent border border-[var(--rule)] px-2 py-1 text-[15px] max-w-[260px]"
                >
                  <option value="">Choose…</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              )}
            </label>
          )}
          <label className="flex items-baseline gap-2 text-[14px] text-[var(--ink-2)] flex-1 min-w-[200px]">
            <span className="smallcaps">Tags</span>
            <input
              value={tagsText}
              onChange={(e) => edit(setTagsText)(e.target.value)}
              placeholder="memory learning"
              className={`${input} py-1 text-[15px]`}
            />
          </label>
        </div>

        <div className="flex items-baseline gap-4">
          <button onClick={() => setPreview(false)} className={`${btnQuiet} ${preview ? '' : 'font-semibold text-[var(--ink)]'}`}>
            Write
          </button>
          <button onClick={() => setPreview(true)} className={`${btnQuiet} ${preview ? 'font-semibold text-[var(--ink)]' : ''}`}>
            Preview
          </button>
          <span className="ml-auto text-[13px] text-[var(--ink-4)]">Markdown · type [[ to link a note</span>
        </div>

        {preview ? (
          <div className="border border-[var(--rule)] p-5 min-h-[320px]">
            {body.trim() ? <MarkdownView body={body} titles={titles} /> : <p className="text-[var(--ink-4)]">Nothing to preview.</p>}
          </div>
        ) : (
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => {
                edit(setBody)(e.target.value)
                refreshLinkQuery()
              }}
              onKeyDown={onBodyKeyDown}
              onKeyUp={(e) => {
                if (!['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) refreshLinkQuery()
              }}
              onClick={refreshLinkQuery}
              onBlur={() => setTimeout(() => setLinkQuery(null), 150)}
              rows={16}
              placeholder="Write the idea in your own words. Link related notes with [[ …"
              className={`${input} p-5 text-[17px] leading-[1.65] resize-y font-[inherit]`}
            />
            {linkQuery !== null && (
              <div
                role="listbox"
                aria-label="Link to note"
                className="absolute left-0 right-0 top-full mt-1 z-20 bg-[var(--paper)] border border-[var(--ink-3)] shadow-[0_12px_30px_-18px_rgba(33,31,28,0.6)]"
              >
                <p className="smallcaps px-3 pt-2 pb-1">
                  {linkQuery ? `Notes matching “${linkQuery}”` : 'Recent notes'} · ↑↓ Enter
                </p>
                {candidates.length === 0 ? (
                  <p className="px-3 pb-3 text-[14px] text-[var(--ink-3)]">No matching notes.</p>
                ) : (
                  candidates.map((c, i) => (
                    <button
                      key={c.id}
                      role="option"
                      aria-selected={i === active}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        insertLink(c)
                      }}
                      onMouseEnter={() => setActive(i)}
                      className={`w-full text-left flex items-baseline gap-3 px-3 py-2 border-none cursor-pointer text-[15px] ${
                        i === active ? 'bg-[var(--paper-3)]' : 'bg-transparent'
                      }`}
                    >
                      <span className="w-10 shrink-0 text-[12px] text-[var(--ink-4)]">{c.address ?? ''}</span>
                      <span className="truncate flex-1">{c.title}</span>
                      <span className="smallcaps">{c.type}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {conflict && (
        <div role="alertdialog" className="border border-[var(--ink-3)] p-5 flex flex-col gap-3">
          <p className="text-[16px] font-semibold">This note was changed somewhere else since you opened it.</p>
          <p className="text-[15px] text-[var(--ink-2)]">
            Saving now would overwrite that version (saved {new Date(conflict.updatedAt).toLocaleString()}). Their
            version:
          </p>
          <pre className="text-[14px] whitespace-pre-wrap bg-[var(--paper-2)] p-3 max-h-[240px] overflow-y-auto font-[inherit]">
            <strong>{conflict.title}</strong>
            {'\n\n'}
            {conflict.body}
          </pre>
          <div className="flex flex-wrap gap-5 items-center">
            <button onClick={takeTheirs} className={btnPrimary}>
              Load their version (discard mine)
            </button>
            <button onClick={() => save({ force: true })} disabled={saving} className={btnQuiet}>
              Overwrite with mine
            </button>
            <button onClick={() => setConflict(null)} className={btnQuiet}>
              Decide later
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap border-t border-[var(--rule)] pt-4">
        <span className="text-[14px] text-[var(--ink-2)]">
          {error ?? (savedAt ? 'Saved.' : dirty ? 'Unsaved changes · ⌘S to save' : '')}
        </span>
        <div className="flex items-center gap-5">
          {note && (
            <button onClick={() => save()} disabled={saving || !dirty} className={btnQuiet}>
              Save
            </button>
          )}
          <button
            onClick={() => save({ thenView: true })}
            disabled={saving || (!body.trim() && !title.trim())}
            className={btnPrimary}
          >
            {saving ? 'Saving…' : note ? 'Save & view' : 'Create note'}
          </button>
        </div>
      </div>
    </>
  )
}
