'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ContextDoc, ProjectToc } from '@/lib/context/types'
import CtxMarkdown from './CtxMarkdown'
import DocEditor from './DocEditor'
import DocMenu from './DocMenu'
import { btnPrimary, btnQuiet, link } from './ui'

type Props = { toc: ProjectToc; doc: ContextDoc | null; startEditing: boolean }

// The project screen: document menu on the left, the open document on the
// right. On a phone the menu becomes a picker above the document.
export default function ProjectShell({ toc, doc: initialDoc, startEditing }: Props) {
  const router = useRouter()
  const { project, entries } = toc
  const [doc, setDoc] = useState(initialDoc)
  const [editing, setEditing] = useState(startEditing && !!initialDoc)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const base = `/context/${project.id}`

  async function deleteLld() {
    if (!doc) return
    const res = await fetch(`/api/context/projects/${project.id}/docs/${doc.id}`, { method: 'DELETE' })
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? 'Couldn’t delete this document.')
      return
    }
    router.push(`${base}/${project.hldId}`)
    router.refresh()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[230px_minmax(0,1fr)] gap-6 md:gap-10 items-start">
      <DocMenu project={project} entries={entries} activeId={doc?.id ?? null} />

      <section className="min-w-0 flex flex-col gap-6" aria-label="Document">
        {!doc ? (
          <div className="flex flex-col gap-3 py-10">
            <h1 className="text-[22px] font-semibold">Document not found</h1>
            <p className="text-[16px] text-[var(--ink-2)]">
              It may have been deleted. Pick another document from the menu, or{' '}
              <Link href={`${base}/${project.hldId}`} className={link}>
                open the HLD
              </Link>
              .
            </p>
          </div>
        ) : editing ? (
          <DocEditor
            projectId={project.id}
            doc={doc}
            onCancel={() => setEditing(false)}
            onSaved={(saved, close) => {
              setDoc(saved)
              if (close) setEditing(false)
              router.refresh()
            }}
          />
        ) : (
          <>
            <header className="flex flex-col gap-3 border-b border-[var(--rule-ink)] pb-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <h1 className="text-[26px] font-semibold tracking-[-0.01em] leading-tight min-w-0">{doc.title}</h1>
                <div className="flex items-center gap-4 flex-wrap">
                  <button onClick={() => setEditing(true)} className={btnPrimary}>
                    Edit
                  </button>
                  <details className="relative">
                    <summary className={`${btnQuiet} list-none cursor-pointer`}>Download PDF ▾</summary>
                    <div className="absolute right-0 top-full mt-2 z-20 min-w-[200px] border border-[var(--ink-3)] bg-[var(--paper)] shadow-[0_12px_30px_-18px_rgba(33,31,28,0.6)] flex flex-col">
                      <a
                        href={`${base}/print?doc=${doc.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2.5 text-[15px] no-underline text-[var(--ink)] hover:bg-[var(--paper-3)]"
                      >
                        This document
                      </a>
                      <a
                        href={`${base}/print?doc=all`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2.5 text-[15px] no-underline text-[var(--ink)] hover:bg-[var(--paper-3)] border-t border-[var(--rule)]"
                      >
                        Whole project
                      </a>
                    </div>
                  </details>
                  {doc.kind === 'lld' && (
                    <button onClick={() => setConfirmDelete(true)} className={btnQuiet}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[14px] text-[var(--ink-3)]">
                {project.name} · {doc.kind === 'lld' ? 'LLD' : doc.kind === 'hld' ? 'High-level design' : 'Database schema'} ·
                edited {new Date(doc.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </header>

            {confirmDelete && (
              <div role="alertdialog" className="border border-[var(--ink-3)] p-5 flex flex-col gap-3">
                <p className="text-[16px]">Delete “{doc.title}”? This can’t be undone.</p>
                <div className="flex gap-5 items-center">
                  <button onClick={deleteLld} className={btnPrimary}>
                    Delete LLD
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className={btnQuiet}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {error && <p className="text-[14px] text-[var(--ink-2)]">{error}</p>}

            {doc.body.trim() ? (
              <CtxMarkdown body={doc.body} />
            ) : (
              <p className="text-[16px] text-[var(--ink-3)]">
                This document is empty.{' '}
                <button onClick={() => setEditing(true)} className={btnQuiet}>
                  Start writing
                </button>
              </p>
            )}
          </>
        )}
      </section>
    </div>
  )
}
