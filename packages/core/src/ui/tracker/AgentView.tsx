'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Agent, Task, TaskStatus, TrackerEvent } from '../../tracker/types'
import { isActive, isOpen, isStalled } from '../../tracker/types'
import { ago, btnPrimary, btnQuiet, input, link } from '../context/ui'
import { clock, day, EVENT_LABEL, EVENT_MARK, TASK_LABEL, TASK_MARK } from './marks'
import { useRefreshOnFocus } from './useRefreshOnFocus'

const PAGE = 100

// Open work first, the thing needing attention at the top.
const ORDER: Record<TaskStatus, number> = { blocked: 0, in_progress: 1, pending: 2, done: 3, abandoned: 4 }

type Props = { agent: Agent; tasks: Task[]; events: TrackerEvent[] }

export default function AgentView({ agent, tasks, events }: Props) {
  const router = useRouter()
  const now = useRefreshOnFocus()
  const active = isActive(agent, now)
  const where = [agent.repo, agent.branch].filter(Boolean).join(' · ')

  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(agent.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [older, setOlder] = useState<TrackerEvent[]>([])
  const [more, setMore] = useState(events.length === PAGE)

  // The first page comes from the server (and refreshes on focus); older
  // pages are appended here, without duplicates.
  const seen = new Set(events.map((e) => e.id))
  const timeline = [...events, ...older.filter((e) => !seen.has(e.id))]

  async function rename(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/tracker/agents/${agent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return setError(data.error ?? 'Couldn’t rename the agent. Try again.')
    setRenaming(false)
    router.refresh()
  }

  async function remove() {
    if (!window.confirm(`Delete “${agent.name}” with its tasks and timeline? This can’t be undone.`)) return
    setBusy(true)
    const res = await fetch(`/api/tracker/agents/${agent.id}`, { method: 'DELETE' })
    if (!res.ok) {
      setBusy(false)
      return setError('Couldn’t delete the agent. Try again.')
    }
    router.push('/agents')
    router.refresh()
  }

  async function loadOlder() {
    const last = timeline[timeline.length - 1]
    if (!last) return
    setBusy(true)
    const res = await fetch(`/api/tracker/agents/${agent.id}/events?before=${last.at}`)
    const page = (await res.json().catch(() => [])) as TrackerEvent[]
    setBusy(false)
    if (!res.ok) return setError('Couldn’t load older entries. Try again.')
    setOlder((prev) => [...prev, ...page])
    setMore(page.length === PAGE)
  }

  const sorted = [...tasks].sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.updatedAt - a.updatedAt)

  return (
    <div className="w-full flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link href="/agents" className={`self-start text-[14px] ${link}`}>
          ← Agents
        </Link>
        {renaming ? (
          <form onSubmit={rename} className="flex flex-col sm:flex-row gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              aria-label="Agent name"
              autoFocus
              className={input}
            />
            <div className="flex gap-4 items-center shrink-0">
              <button type="submit" disabled={busy || !name.trim()} className={btnPrimary}>
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setRenaming(false)
                  setName(agent.name)
                }}
                className={btnQuiet}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-ink)] pb-3">
            <h1 className="text-[24px] font-semibold tracking-[-0.01em] min-w-0 break-words">{agent.name}</h1>
            <div className="flex gap-5 shrink-0">
              <button onClick={() => setRenaming(true)} className={btnQuiet}>
                Rename
              </button>
              <button onClick={remove} disabled={busy} className={btnQuiet}>
                Delete
              </button>
            </div>
          </div>
        )}
        <p className="text-[15px] text-[var(--ink-2)]">
          {where && <span>{where} · </span>}
          <span className={active ? 'text-[var(--ink)]' : ''}>
            {active ? '● active' : '○ quiet'} · last report {ago(agent.lastSeenAt)}
          </span>
          <span className="text-[var(--ink-3)]"> · started {day(agent.startedAt)}</span>
        </p>
        {error && <p className="text-[14px] text-[var(--ink-2)]">{error}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,340px)_1fr] gap-10">
        <section className="flex flex-col gap-3" aria-label="Tasks">
          <h2 className="smallcaps border-b border-[var(--rule)] pb-1.5">
            Tasks · {agent.openTasks} open
          </h2>
          {sorted.length === 0 ? (
            <p className="text-[15px] text-[var(--ink-3)]">No tasks reported yet.</p>
          ) : (
            <ul className="flex flex-col gap-3.5">
              {sorted.map((t) => {
                const stalled = isStalled(t, agent, now)
                return (
                  <li key={t.id} className={`flex gap-2.5 ${isOpen(t.status) ? '' : 'text-[var(--ink-3)]'}`}>
                    <span aria-hidden className="w-4 shrink-0 text-center">
                      {TASK_MARK[t.status]}
                    </span>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className={`text-[16px] break-words ${t.status === 'blocked' ? 'font-semibold' : ''}`}>
                        {t.title}
                      </span>
                      <span className="text-[13px] text-[var(--ink-3)]">
                        {TASK_LABEL[t.status]}
                        {stalled && <span className="text-[var(--ink)] font-semibold"> · stalled</span>} ·{' '}
                        {ago(t.updatedAt)}
                      </span>
                      {t.note && (
                        <span className="text-[14px] text-[var(--ink-2)] whitespace-pre-wrap break-words">{t.note}</span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3 min-w-0" aria-label="Timeline">
          <h2 className="smallcaps border-b border-[var(--rule)] pb-1.5">Timeline</h2>
          <ol className="flex flex-col">
            {timeline.map((e, i) => {
              const newDay = i === 0 || day(timeline[i - 1].at) !== day(e.at)
              return (
                <li key={e.id} className="flex flex-col">
                  {newDay && <span className="smallcaps pt-4 pb-2 first:pt-0">{day(e.at)}</span>}
                  <div className="grid grid-cols-[48px_16px_1fr] gap-x-3 py-1.5">
                    <span className="ctx-mono text-[13px] text-[var(--ink-3)] pt-[3px]">{clock(e.at)}</span>
                    <span aria-hidden className="text-center">
                      {EVENT_MARK[e.type]}
                    </span>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[15px] break-words">
                        <span className="text-[var(--ink-3)]">{EVENT_LABEL[e.type]}</span>
                        {e.taskTitle && <span className="font-semibold"> {e.taskTitle}</span>}
                        {e.source === 'user' && <span className="text-[var(--ink-3)]"> · by you</span>}
                      </span>
                      {e.text && (
                        <span className="text-[14px] text-[var(--ink-2)] whitespace-pre-wrap break-words">{e.text}</span>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
          {more && (
            <button onClick={loadOlder} disabled={busy} className={`self-start ${btnQuiet}`}>
              {busy ? 'Loading…' : 'Older entries'}
            </button>
          )}
        </section>
      </div>
    </div>
  )
}
