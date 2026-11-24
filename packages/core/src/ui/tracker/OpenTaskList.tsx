'use client'

import Link from 'next/link'
import type { Agent, OpenTask } from '../../tracker/types'
import { isStalled } from '../../tracker/types'
import { ago } from '../context/ui'
import { TASK_MARK } from './marks'
import TrackerHeader from './TrackerHeader'
import { useRefreshOnFocus } from './useRefreshOnFocus'

type Group = { key: string; title: string; hint: string; tasks: OpenTask[] }

export default function OpenTaskList({ tasks, agents }: { tasks: OpenTask[]; agents: Agent[] }) {
  const now = useRefreshOnFocus()
  const byId = new Map(agents.map((a) => [a.id, a]))
  const stalled = (t: OpenTask) => {
    const a = byId.get(t.agentId)
    return !!a && isStalled(t, a, now)
  }

  // Needs-attention first: blocked, then work Claude may have forgotten.
  const groups: Group[] = [
    { key: 'blocked', title: 'Blocked', hint: 'waiting on something', tasks: tasks.filter((t) => t.status === 'blocked') },
    { key: 'stalled', title: 'Stalled', hint: 'in progress, no report for 6 h', tasks: tasks.filter(stalled) },
    { key: 'pending', title: 'Pending', hint: 'left for later', tasks: tasks.filter((t) => t.status === 'pending') },
    {
      key: 'in_progress',
      title: 'In progress',
      hint: '',
      tasks: tasks.filter((t) => t.status === 'in_progress' && !stalled(t)),
    },
  ]
  const blocked = groups[0].tasks.length

  return (
    <div className="w-full max-w-[880px] mx-auto flex flex-col gap-8">
      <TrackerHeader
        current="open"
        openCount={tasks.length}
        summary={`${tasks.length} open · ${blocked} blocked`}
      />

      {tasks.length === 0 ? (
        <p className="text-[16px] text-[var(--ink-3)] py-10">Nothing open. Every reported task is done or dropped.</p>
      ) : (
        groups
          .filter((g) => g.tasks.length > 0)
          .map((g) => (
            <section key={g.key} className="flex flex-col gap-2" aria-label={g.title}>
              <h2 className="smallcaps border-b border-[var(--rule)] pb-1.5">
                {g.title} · {g.tasks.length}
                {g.hint && <span className="normal-case tracking-normal text-[var(--ink-4)]"> — {g.hint}</span>}
              </h2>
              <div className="ledger flex flex-col">
                {g.tasks.map((t) => (
                  <Link
                    key={t.id}
                    href={`/agents/${t.agentId}`}
                    className="row grid grid-cols-[16px_1fr_auto] gap-x-3 gap-y-0.5 px-3 py-3 no-underline text-[var(--ink)]"
                  >
                    <span aria-hidden className="text-center">
                      {TASK_MARK[t.status]}
                    </span>
                    <span className="text-[16px] font-semibold truncate">{t.title}</span>
                    <span className="text-[14px] text-[var(--ink-3)] whitespace-nowrap">{ago(t.updatedAt)}</span>
                    <span />
                    <span className="col-span-2 text-[14px] text-[var(--ink-2)] truncate">
                      {t.agentName}
                      {t.note && <span className="text-[var(--ink-3)]"> — {t.note}</span>}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))
      )}
    </div>
  )
}
