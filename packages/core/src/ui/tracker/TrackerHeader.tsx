import Link from 'next/link'

// Title row plus the two views of AgentTracker.
export default function TrackerHeader({
  current,
  summary,
  openCount,
}: {
  current: 'agents' | 'open'
  summary: string
  openCount: number
}) {
  const tab = (active: boolean) =>
    `text-[15px] no-underline pb-1 border-b-2 transition-colors duration-150 ${
      active
        ? 'text-[var(--ink)] font-semibold border-[var(--ink)]'
        : 'text-[var(--ink-3)] border-transparent hover:text-[var(--ink)]'
    }`
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-ink)] pb-3">
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Agents</h1>
        <span className="text-[15px] text-[var(--ink-2)] text-right">{summary}</span>
      </div>
      <nav className="flex gap-6" aria-label="Agent views">
        <Link href="/agents" aria-current={current === 'agents' ? 'page' : undefined} className={tab(current === 'agents')}>
          All agents
        </Link>
        <Link href="/agents/open" aria-current={current === 'open' ? 'page' : undefined} className={tab(current === 'open')}>
          Open tasks · {openCount}
        </Link>
      </nav>
    </header>
  )
}
