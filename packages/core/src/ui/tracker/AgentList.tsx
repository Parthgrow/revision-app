'use client'

import Link from 'next/link'
import type { Agent } from '../../tracker/types'
import { isActive } from '../../tracker/types'
import { ago, link } from '../context/ui'
import TrackerHeader from './TrackerHeader'
import { useRefreshOnFocus } from './useRefreshOnFocus'

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export default function AgentList({ agents }: { agents: Agent[] }) {
  const now = useRefreshOnFocus()
  const open = agents.reduce((n, a) => n + a.openTasks, 0)
  const blocked = agents.reduce((n, a) => n + a.blockedTasks, 0)

  return (
    <div className="w-full max-w-[880px] mx-auto flex flex-col gap-8">
      <TrackerHeader
        current="agents"
        openCount={open}
        summary={`${plural(agents.length, 'agent')} · ${open} open · ${blocked} blocked`}
      />

      {agents.length === 0 ? (
        <div className="flex flex-col gap-3 py-10 text-[16px] text-[var(--ink-3)] max-w-[60ch]">
          <p>No agents yet.</p>
          <p>
            Each Claude Code chat registers itself here with the <span className="ctx-mono text-[14px]">start_agent</span>{' '}
            tool, then reports the tasks it starts, finishes or gets stuck on.{' '}
            <Link href="/settings" className={link}>
              Connect Claude
            </Link>{' '}
            to begin.
          </p>
        </div>
      ) : (
        <div className="ledger flex flex-col">
          {agents.map((a) => {
            const active = isActive(a, now)
            const where = [a.repo, a.branch].filter(Boolean).join(' · ')
            const work =
              a.openTasks === 0
                ? 'nothing open'
                : `${a.openTasks} open${a.blockedTasks ? ` · ${a.blockedTasks} blocked` : ''}`
            return (
              <Link
                key={a.id}
                href={`/agents/${a.id}`}
                className="row grid grid-cols-[1fr_auto] gap-x-6 gap-y-0.5 px-3 py-3.5 no-underline text-[var(--ink)]"
              >
                <span className="text-[17px] font-semibold truncate">{a.name}</span>
                <span
                  className={`text-[14px] text-right whitespace-nowrap ${active ? 'text-[var(--ink)]' : 'text-[var(--ink-3)]'}`}
                >
                  <span aria-hidden>{active ? '● ' : '○ '}</span>
                  {active ? 'active' : 'quiet'} · {ago(a.lastSeenAt)}
                </span>
                <span className="col-span-2 text-[15px] text-[var(--ink-2)] truncate">
                  {where && <span>{where} · </span>}
                  <span className={a.blockedTasks ? 'text-[var(--ink)] font-semibold' : ''}>{work}</span>
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
