'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ContextDoc } from '@/lib/context/types'
import { BOX_CHARS, DIAGRAM_SNIPPETS } from '@/lib/context/templates'
import CtxMarkdown from './CtxMarkdown'
import { btnPrimary, btnQuiet, input } from './ui'

type Props = {
  projectId: string
  doc: ContextDoc
  onSaved: (doc: ContextDoc, close: boolean) => void
  onCancel: () => void
}

// Lines inside fenced blocks longer than this won't fit an A4 PDF page.
const PRINT_COLUMNS = 100

function longDiagramLines(body: string): number {
  let inFence = false
  let count = 0
  for (const line of body.split('\n')) {
    if (/^\s*```/.test(line)) inFence = !inFence
    else if (inFence && [...line].length > PRINT_COLUMNS) count++
  }
  return count
}

export default function DocEditor({ projectId, doc, onSaved, onCancel }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const pendingCaret = useRef<number | null>(null)
  const [title, setTitle] = useState(doc.title)
  const [body, setBody] = useState(doc.body)
  const [baseVersion, setBaseVersion] = useState(doc.updatedAt)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<ContextDoc | null>(null)
  const [preview, setPreview] = useState(false)

  const isLld = doc.kind === 'lld'
  const tooWide = longDiagramLines(body)

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // Put the caret back after a programmatic insert, before the next keystroke.
  useLayoutEffect(() => {
    const el = ref.current
    if (el && pendingCaret.current !== null) {
      el.focus()
      el.setSelectionRange(pendingCaret.current, pendingCaret.current)
      pendingCaret.current = null
    }
  }, [body])

  function change(next: string) {
    setBody(next)
    setDirty(true)
    setSaved(false)
  }

  // Inserts text at the caret (replacing any selection).
  function insert(text: string, block = false) {
    const el = ref.current
    const start = el?.selectionStart ?? body.length
    const end = el?.selectionEnd ?? body.length
    let t = text
    if (block) {
      // Diagram snippets go on their own lines.
      if (start > 0 && body[start - 1] !== '\n') t = '\n' + t
      t = t + '\n'
      if (body[end] !== undefined && body[end] !== '\n') t = t + '\n'
    }
    pendingCaret.current = start + t.length
    change(body.slice(0, start) + t + body.slice(end))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Tab indents with two spaces instead of leaving the editor.
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      insert('  ')
    }
  }

  async function save(opts: { force?: boolean; close?: boolean } = {}) {
    if (saving) return
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/context/projects/${projectId}/docs/${doc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(isLld && { title }),
        body,
        expectedUpdatedAt: baseVersion,
        force: opts.force,
      }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (res.status === 409 && data.current) {
      setConflict(data.current as ContextDoc)
      return
    }
    if (!res.ok) {
      setError(data.error ?? 'Couldn’t save. Try again.')
      return
    }
    const savedDoc = data as ContextDoc
    setBaseVersion(savedDoc.updatedAt)
    setBody(savedDoc.body)
    setTitle(savedDoc.title)
    setDirty(false)
    setConflict(null)
    setSaved(true)
    onSaved(savedDoc, !!opts.close)
  }

  function takeTheirs() {
    if (!conflict) return
    setTitle(conflict.title)
    setBody(conflict.body)
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

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <header className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-ink)] pb-3">
        {isLld ? (
          <input
            id="doc-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setDirty(true)
              setSaved(false)
            }}
            maxLength={120}
            aria-label="LLD title"
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-[24px] font-semibold tracking-[-0.01em]"
          />
        ) : (
          <h1 className="text-[24px] font-semibold tracking-[-0.01em]">{doc.title}</h1>
        )}
        <span className="smallcaps shrink-0">Editing</span>
      </header>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button onClick={() => setPreview(false)} className={`${btnQuiet} ${preview ? '' : 'font-semibold text-[var(--ink)]'}`}>
          Write
        </button>
        <button onClick={() => setPreview(true)} className={`${btnQuiet} ${preview ? 'font-semibold text-[var(--ink)]' : ''}`}>
          Preview
        </button>
        {!preview && (
          <>
            <details className="relative">
              <summary className={`${btnQuiet} list-none cursor-pointer`}>Diagram ▾</summary>
              <div className="absolute left-0 top-full mt-2 z-20 w-[220px] border border-[var(--ink-3)] bg-[var(--paper)] shadow-[0_12px_30px_-18px_rgba(33,31,28,0.6)] flex flex-col">
                {DIAGRAM_SNIPPETS.map((s) => (
                  <button
                    key={s.label}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      insert(s.text, true)
                      ;(e.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open')
                    }}
                    className="text-left px-3 py-2 text-[15px] bg-transparent border-none cursor-pointer hover:bg-[var(--paper-3)]"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </details>
            <div role="toolbar" aria-label="Box-drawing characters" className="flex flex-wrap gap-0.5">
              {BOX_CHARS.map((c) => (
                <button
                  key={c}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insert(c)}
                  title={`Insert ${c}`}
                  className="ctx-mono w-7 h-7 text-[14px] border border-[var(--rule)] bg-transparent cursor-pointer hover:bg-[var(--paper-3)] text-[var(--ink)]"
                >
                  {c}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {preview ? (
        <div className="border border-[var(--rule)] p-5 min-h-[420px] min-w-0">
          {body.trim() ? <CtxMarkdown body={body} /> : <p className="text-[var(--ink-4)]">Nothing to preview.</p>}
        </div>
      ) : (
        <textarea
          ref={ref}
          id="doc-body"
          value={body}
          onChange={(e) => change(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          rows={28}
          aria-label="Document text (markdown)"
          className={`${input} ctx-mono p-4 text-[14px] leading-[1.5] resize-y whitespace-pre overflow-x-auto [tab-size:2]`}
          style={{ fontVariantLigatures: 'none' }}
        />
      )}

      {tooWide > 0 && !preview && (
        <p className="text-[14px] text-[var(--ink-2)]">
          {tooWide} diagram line{tooWide === 1 ? ' is' : 's are'} wider than {PRINT_COLUMNS} characters and will be cut off
          in the PDF.
        </p>
      )}

      {conflict && (
        <div role="alertdialog" className="border border-[var(--ink-3)] p-5 flex flex-col gap-3">
          <p className="text-[16px] font-semibold">This document was changed somewhere else since you opened it.</p>
          <p className="text-[15px] text-[var(--ink-2)]">
            Saving now would overwrite the version saved {new Date(conflict.updatedAt).toLocaleString()}.
          </p>
          <pre className="ctx-mono text-[13px] whitespace-pre bg-[var(--paper-2)] p-3 max-h-[240px] overflow-auto">
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
        <span className="text-[14px] text-[var(--ink-2)]" aria-live="polite">
          {error ?? (saved ? 'Saved.' : dirty ? 'Unsaved changes · ⌘S to save' : '')}
        </span>
        <div className="flex items-center gap-5">
          <button onClick={onCancel} disabled={saving} className={btnQuiet}>
            {dirty ? 'Discard changes' : 'Close editor'}
          </button>
          <button onClick={() => save()} disabled={saving || !dirty} className={btnQuiet}>
            Save
          </button>
          <button onClick={() => save({ close: true })} disabled={saving || (isLld && !title.trim())} className={btnPrimary}>
            {saving ? 'Saving…' : 'Save & view'}
          </button>
        </div>
      </div>
    </div>
  )
}
