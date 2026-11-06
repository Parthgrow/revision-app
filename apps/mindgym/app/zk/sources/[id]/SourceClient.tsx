'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { NoteSummary, Source } from '@/lib/zk/types'
import NoteRow from '@/components/zk/NoteRow'
import { btnPrimary, btnQuiet, link } from '@/components/zk/ui'

export default function SourceClient({ source, notes }: { source: Source; notes: NoteSummary[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    const res = await fetch(`/api/zk/sources/${source.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/zk/sources')
      router.refresh()
    } else {
      setError((await res.json().catch(() => ({}))).error ?? 'Couldn’t delete this source.')
    }
  }

  return (
    <>
      <Link href="/zk/sources" className={`text-[14px] ${link}`}>
        ← Sources
      </Link>
      <header className="flex flex-col gap-1 border-b border-[var(--rule-ink)] pb-3">
        <h1 className="text-[24px] font-semibold tracking-[-0.01em]">{source.title}</h1>
        <p className="text-[15px] text-[var(--ink-2)]">
          {[source.author, source.year].filter(Boolean).join(', ')}
          {source.url && (
            <>
              {' · '}
              <a href={source.url} target="_blank" rel="noreferrer" className={link}>
                link
              </a>
            </>
          )}
        </p>
      </header>

      <div className="flex items-center gap-5">
        <Link href={`/zk/new?type=literature&sourceId=${source.id}`} className={`${btnPrimary} no-underline`}>
          New literature note
        </Link>
        <button onClick={remove} className={`${btnQuiet} ml-auto`} disabled={notes.length > 0}
          title={notes.length > 0 ? 'Notes still cite this source' : undefined}>
          Delete source
        </button>
      </div>
      {error && <p className="text-[14px] text-[var(--ink-2)]">{error}</p>}

      <section className="flex flex-col">
        <h2 className="smallcaps px-3 pb-2 border-b border-[var(--rule)]">Literature notes · {notes.length}</h2>
        {notes.length === 0 ? (
          <p className="px-3 py-4 text-[15px] text-[var(--ink-3)]">No notes on this source yet.</p>
        ) : (
          <div className="ledger flex flex-col">
            {notes.map((n) => (
              <NoteRow key={n.id} note={n} showExcerpt />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
