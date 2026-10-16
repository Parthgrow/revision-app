'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ContextDoc, Project, TocEntry } from '@/lib/context/types'
import { btnPrimary, btnQuiet, input, link } from './ui'

type Props = { project: Project; entries: TocEntry[]; activeId: string | null }

function MenuLink({ href, title, active }: { href: string; title: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-baseline gap-2 px-2 py-1.5 text-[15px] no-underline transition-colors duration-100 ${
        active
          ? 'bg-[var(--paper-3)] text-[var(--ink)] font-semibold shadow-[inset_2px_0_0_var(--ink)]'
          : 'text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)]'
      }`}
    >
      <span className="truncate">{title}</span>
    </Link>
  )
}

export default function DocMenu({ project, entries, activeId }: Props) {
  const router = useRouter()
  const base = `/context/${project.id}`
  const core = entries.filter((e) => e.kind !== 'lld')
  const llds = entries.filter((e) => e.kind === 'lld')

  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [manage, setManage] = useState(false)
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function call(url: string, init: RequestInit) {
    setBusy(true)
    setError(null)
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong. Try again.')
      return null
    }
    return data
  }

  // A new LLD opens straight in the editor.
  async function addLld(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    const doc = (await call(`/api/context/projects/${project.id}/docs`, {
      method: 'POST',
      body: JSON.stringify({ title: newTitle }),
    })) as ContextDoc | null
    if (!doc) return
    setNewTitle('')
    setAdding(false)
    router.push(`${base}/${doc.id}?edit=1`)
    router.refresh()
  }

  async function saveProject(e: React.FormEvent) {
    e.preventDefault()
    const ok = await call(`/api/context/projects/${project.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, description: description.trim() || null }),
    })
    if (ok) {
      setManage(false)
      router.refresh()
    }
  }

  async function deleteProject() {
    if (await call(`/api/context/projects/${project.id}`, { method: 'DELETE' })) {
      router.push('/context')
      router.refresh()
    }
  }

  return (
    <nav aria-label="Project documents" className="flex flex-col gap-5 md:sticky md:top-6 min-w-0">
      <div className="flex flex-col gap-2">
        <Link href="/context" className={`text-[14px] ${link} self-start`}>
          ← Context
        </Link>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[19px] font-semibold tracking-[-0.01em] leading-snug min-w-0 break-words">{project.name}</h2>
          <button
            onClick={() => setManage((m) => !m)}
            aria-expanded={manage}
            aria-label="Project settings"
            className="shrink-0 bg-transparent border-none cursor-pointer text-[18px] leading-none px-1 text-[var(--ink-3)] hover:text-[var(--ink)]"
          >
            ⋯
          </button>
        </div>
        {project.description && !manage && (
          <p className="text-[14px] text-[var(--ink-3)] leading-snug">{project.description}</p>
        )}
      </div>

      {manage && (
        <form onSubmit={saveProject} className="flex flex-col gap-2 border border-[var(--rule)] p-3">
          <label htmlFor="project-rename" className="smallcaps">
            Name
          </label>
          <input id="project-rename" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={`${input} text-[15px] py-1.5`} />
          <label htmlFor="project-desc" className="smallcaps">
            Description
          </label>
          <input
            id="project-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
            className={`${input} text-[15px] py-1.5`}
          />
          <div className="flex items-center gap-4 pt-1">
            <button type="submit" disabled={busy || !name.trim()} className={`${btnPrimary} px-4 py-1.5`}>
              Save
            </button>
            <button type="button" onClick={() => setConfirmDelete(true)} className={btnQuiet}>
              Delete project
            </button>
          </div>
          {confirmDelete && (
            <div role="alertdialog" className="flex flex-col gap-2 pt-2 border-t border-[var(--rule)] mt-1">
              <p className="text-[14px]">
                Delete “{project.name}” and all {entries.length} documents? This can’t be undone.
              </p>
              <ul className="text-[13px] text-[var(--ink-2)] list-disc pl-5">
                {entries.map((e) => (
                  <li key={e.id}>{e.title}</li>
                ))}
              </ul>
              <div className="flex gap-4 items-center">
                <button type="button" onClick={deleteProject} disabled={busy} className={`${btnPrimary} px-4 py-1.5`}>
                  Delete everything
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className={btnQuiet}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Phone: a picker instead of the side menu. */}
      <label className="md:hidden flex flex-col gap-1">
        <span className="smallcaps">Documents</span>
        <select
          id="doc-picker"
          value={activeId ?? ''}
          onChange={(e) => router.push(`${base}/${e.target.value}`)}
          className="bg-[var(--paper)] border border-[var(--rule)] px-3 py-2 text-[16px]"
        >
          {!activeId && <option value="">Choose a document…</option>}
          {entries.map((e) => (
            <option key={e.id} value={e.id}>
              {e.kind === 'lld' ? `LLD · ${e.title}` : e.title}
            </option>
          ))}
        </select>
      </label>

      <div className="hidden md:flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="smallcaps px-2">Core</h3>
          {core.map((e) => (
            <MenuLink key={e.id} href={`${base}/${e.id}`} title={e.title} active={e.id === activeId} />
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="smallcaps px-2">LLDs · {llds.length}</h3>
          {llds.length === 0 && <p className="px-2 text-[14px] text-[var(--ink-4)]">No LLDs yet.</p>}
          {llds.map((e) => (
            <MenuLink key={e.id} href={`${base}/${e.id}`} title={e.title} active={e.id === activeId} />
          ))}
        </div>
      </div>

      {adding ? (
        <form onSubmit={addLld} className="flex flex-col gap-2">
          <input
            id="new-lld"
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setAdding(false)}
            placeholder="LLD title, e.g. Auth"
            maxLength={120}
            className={`${input} text-[15px] py-1.5`}
          />
          <div className="flex items-center gap-4">
            <button type="submit" disabled={busy || !newTitle.trim()} className={`${btnPrimary} px-4 py-1.5`}>
              {busy ? 'Adding…' : 'Add LLD'}
            </button>
            <button type="button" onClick={() => setAdding(false)} className={btnQuiet}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className={`${btnQuiet} self-start px-2`}>
          + New LLD
        </button>
      )}
      {error && <p className="text-[14px] text-[var(--ink-2)] px-2">{error}</p>}
    </nav>
  )
}
