'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Project, ProjectSummary } from '@/lib/context/types'
import { ago, btnPrimary, input } from './ui'

export default function ProjectList({ initial }: { initial: ProjectSummary[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // A new project opens straight on its HLD.
  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    setError(null)
    const res = await fetch('/api/context/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error ?? 'Couldn’t create the project. Try again.')
      setSaving(false)
      return
    }
    const p = data as Project
    router.push(`/context/${p.id}/${p.hldId}`)
  }

  return (
    <div className="w-full max-w-[880px] mx-auto flex flex-col gap-8">
      <header className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-ink)] pb-3">
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Context</h1>
        <span className="text-[15px] text-[var(--ink-2)]">
          {initial.length} project{initial.length === 1 ? '' : 's'}
        </span>
      </header>

      <form onSubmit={create} className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New project name"
            aria-label="Project name"
            maxLength={80}
            className={input}
          />
          <button type="submit" disabled={saving || !name.trim()} className={`${btnPrimary} shrink-0`}>
            {saving ? 'Creating…' : 'Create project'}
          </button>
        </div>
        <input
          id="project-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="One-line description (optional)"
          aria-label="Project description"
          maxLength={300}
          className={`${input} text-[15px]`}
        />
        <p className="text-[14px] text-[var(--ink-3)]">
          {error ?? 'Every project starts with a database schema and an HLD. Add LLDs as you design features.'}
        </p>
      </form>

      {initial.length === 0 ? (
        <p className="text-[16px] text-[var(--ink-3)] py-10">No projects yet. Name one above to start its design context.</p>
      ) : (
        <div className="ledger flex flex-col">
          {initial.map((p) => (
            <Link
              key={p.id}
              href={`/context/${p.id}/${p.hldId}`}
              className="row grid grid-cols-[1fr_auto] gap-x-6 gap-y-0.5 px-3 py-3.5 no-underline text-[var(--ink)]"
            >
              <span className="text-[17px] font-semibold truncate">{p.name}</span>
              <span className="text-[14px] text-[var(--ink-3)] text-right whitespace-nowrap">
                {p.lldCount} LLD{p.lldCount === 1 ? '' : 's'} · edited {ago(p.updatedAt)}
              </span>
              {p.description && (
                <span className="col-span-2 text-[15px] text-[var(--ink-2)] truncate">{p.description}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
