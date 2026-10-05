import Link from 'next/link'
import type { NoteSummary } from '@/lib/zk/types'

function age(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return '1 d'
  if (days < 60) return `${days} d`
  return `${Math.floor(days / 30)} mo`
}

// One ledger row: address, title + excerpt, type, link counts.
export default function NoteRow({ note, showExcerpt = false }: { note: NoteSummary; showExcerpt?: boolean }) {
  return (
    <Link
      href={`/zk/${note.id}`}
      className="row grid grid-cols-[1fr_auto] sm:grid-cols-[56px_1fr_88px_56px] gap-x-5 px-3 py-3 items-baseline no-underline text-[var(--ink)] transition-colors duration-100"
    >
      <span className="hidden sm:block text-[14px] text-[var(--ink-3)] truncate">{note.address ?? ''}</span>
      <span className="min-w-0">
        <span className="block text-[16px] leading-snug truncate">{note.title}</span>
        {showExcerpt && note.excerpt && (
          <span className="block text-[14px] text-[var(--ink-3)] leading-snug truncate mt-0.5">{note.excerpt}</span>
        )}
      </span>
      <span className="smallcaps text-right">{note.type}</span>
      <span
        className="hidden sm:block text-[14px] text-right text-[var(--ink-3)]"
        title={`${note.linkCount} out · ${note.backlinkCount} in · edited ${age(note.updatedAt)} ago`}
      >
        {note.linkCount}↗ {note.backlinkCount}↙
      </span>
    </Link>
  )
}
