// Class strings for Context pages. Kept here (not imported from the notes
// module) so the two features stay independent.

export const btnPrimary =
  'px-5 py-2 text-[14px] font-semibold border-none bg-[var(--ink)] text-[var(--paper)] cursor-pointer transition-opacity duration-150 hover:opacity-85 disabled:opacity-40 disabled:cursor-default no-underline'

export const btnQuiet =
  'px-0 py-1 text-[14px] text-[var(--ink-2)] bg-transparent border-none cursor-pointer underline underline-offset-4 decoration-[var(--rule)] transition-colors duration-150 hover:text-[var(--ink)] hover:decoration-[var(--ink)] disabled:opacity-40 disabled:cursor-default'

export const link =
  'text-[var(--ink-2)] underline underline-offset-4 decoration-[var(--rule)] transition-colors duration-150 hover:text-[var(--ink)] hover:decoration-[var(--ink)]'

export const input =
  'bg-transparent border border-[var(--rule)] text-[var(--ink)] px-3 py-2 text-[16px] outline-none w-full transition-colors duration-150 focus:border-[var(--ink-3)] placeholder:text-[var(--ink-4)]'

export function ago(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} d ago`
  return new Date(ts).toLocaleDateString()
}
