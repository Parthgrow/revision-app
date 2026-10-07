'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type { Graph, NoteType } from '@/lib/zk/types'
import { NOTE_TYPES } from '@/lib/zk/types'
import { input, link } from '@/components/zk/ui'
import GraphCanvas, { shapePath } from './GraphCanvas'

type Props = { initial: Graph; initialFocus?: string }

type Filters = { types: NoteType[]; sequence: boolean; hideOrphans: boolean; tag: string }

const TYPE_LABEL: Record<NoteType, string> = {
  permanent: 'Permanent',
  structure: 'Structure',
  literature: 'Literature',
  fleeting: 'Fleeting',
}
const LEGEND_ORDER: NoteType[] = ['permanent', 'structure', 'literature', 'fleeting']

function TypeMark({ type }: { type: NoteType }) {
  return (
    <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden className="zk-graph-mark shrink-0">
      <path className={`node-${type}`} d={shapePath(type, 4.5)} />
    </svg>
  )
}

export default function GraphView({ initial, initialFocus }: Props) {
  const [graph, setGraph] = useState(initial)
  const [filters, setFilters] = useState<Filters>({ types: NOTE_TYPES, sequence: true, hideOrphans: false, tag: '' })
  const { types, sequence, hideOrphans, tag } = filters
  const [query, setQuery] = useState('')
  const [focusId, setFocusId] = useState<string | null>(initialFocus ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef<AbortController | null>(null)

  // Tags offered in the filter come from the unfiltered collection, so picking
  // one doesn't make the others disappear from the list.
  const allTags = useMemo(() => [...new Set(initial.nodes.flatMap((n) => n.tags))].sort(), [initial])

  // Each filter change refetches the graph from the server.
  async function update(patch: Partial<Filters>) {
    const next = { ...filters, ...patch }
    setFilters(next)
    const params = new URLSearchParams()
    if (!next.sequence) params.set('sequence', '0')
    if (next.types.length < NOTE_TYPES.length) params.set('types', next.types.join(','))
    if (next.tag) params.set('tag', next.tag)
    if (next.hideOrphans) params.set('orphans', '1')

    pending.current?.abort()
    const ctrl = new AbortController()
    pending.current = ctrl
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/zk/graph?${params}`, { signal: ctrl.signal })
      if (!res.ok) throw new Error('Couldn’t load the graph. Try again.')
      setGraph(await res.json())
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError((err as Error).message)
    } finally {
      if (pending.current === ctrl) setLoading(false)
    }
  }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return graph.nodes.filter((n) => n.title.toLowerCase().includes(q) || n.address === q).slice(0, 8)
  }, [query, graph])

  const titleOf = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n.title])), [graph])
  const neighboursOf = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const e of graph.edges) {
      m.set(e.source, [...(m.get(e.source) ?? []), e.target])
      m.set(e.target, [...(m.get(e.target) ?? []), e.source])
    }
    return m
  }, [graph])

  const toggleType = (t: NoteType) =>
    update({ types: types.includes(t) ? types.filter((x) => x !== t) : [...types, t] })

  const empty = initial.nodes.length === 0
  const checkbox = 'flex items-center gap-2 text-[15px] text-[var(--ink-2)] cursor-pointer'

  return (
    <>
      <div className="flex items-baseline justify-between gap-4">
        <Link href="/zk" className={`text-[14px] ${link}`}>
          ← Notes
        </Link>
        <span className="text-[14px] text-[var(--ink-3)]" aria-live="polite">
          {loading ? 'Updating…' : `${graph.nodes.length} notes · ${graph.edges.length} connections`}
        </span>
      </div>

      <header className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-ink)] pb-3">
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Graph</h1>
        <span className="smallcaps">Every note and how it connects</span>
      </header>

      {empty ? (
        <p className="text-[16px] text-[var(--ink-3)] py-10">
          No notes yet. <Link href="/zk" className={link}>Capture a thought</Link>, then link notes with [[ in the editor.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <div className="relative">
              <input
                id="graph-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && matches[0]) {
                    setFocusId(matches[0].id)
                    setQuery('')
                  }
                }}
                placeholder="Find a note in the graph…"
                aria-label="Find a note in the graph"
                className={input}
              />
              {matches.length > 0 && (
                <ul className="absolute left-0 right-0 top-full z-20 mt-1 border border-[var(--ink-3)] bg-[var(--paper)] shadow-[0_12px_30px_-18px_rgba(33,31,28,0.6)]">
                  {matches.map((n) => (
                    <li key={n.id}>
                      <button
                        onClick={() => {
                          setFocusId(n.id)
                          setQuery('')
                        }}
                        className="w-full text-left flex items-baseline gap-3 px-3 py-2 border-none bg-transparent cursor-pointer text-[15px] hover:bg-[var(--paper-3)]"
                      >
                        <span className="w-10 shrink-0 text-[12px] text-[var(--ink-4)]">{n.address ?? ''}</span>
                        <span className="truncate flex-1">{n.title}</span>
                        <span className="smallcaps">{n.type}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {LEGEND_ORDER.map((t) => (
                <label key={t} htmlFor={`type-${t}`} className={checkbox}>
                  <input
                    id={`type-${t}`}
                    type="checkbox"
                    checked={types.includes(t)}
                    onChange={() => toggleType(t)}
                    className="accent-[var(--ink)]"
                  />
                  <TypeMark type={t} />
                  {TYPE_LABEL[t]}
                </label>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <label htmlFor="graph-sequence" className={checkbox}>
                <input
                  id="graph-sequence"
                  type="checkbox"
                  checked={sequence}
                  onChange={(e) => update({ sequence: e.target.checked })}
                  className="accent-[var(--ink)]"
                />
                Folgezettel lines
              </label>
              <label htmlFor="graph-orphans" className={checkbox}>
                <input
                  id="graph-orphans"
                  type="checkbox"
                  checked={hideOrphans}
                  onChange={(e) => update({ hideOrphans: e.target.checked })}
                  className="accent-[var(--ink)]"
                />
                Hide unconnected notes
              </label>
              {allTags.length > 0 && (
                <label htmlFor="graph-tag" className={checkbox}>
                  <span className="smallcaps">Tag</span>
                  <select
                    id="graph-tag"
                    value={tag}
                    onChange={(e) => update({ tag: e.target.value })}
                    className="bg-transparent border border-[var(--rule)] px-2 py-1 text-[15px]"
                  >
                    <option value="">All</option>
                    {allTags.map((t) => (
                      <option key={t} value={t}>
                        #{t}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>

          {error && <p className="text-[14px] text-[var(--ink-2)]">{error}</p>}

          {graph.nodes.length === 0 ? (
            <p className="text-[16px] text-[var(--ink-3)] border border-[var(--rule)] px-5 py-16 text-center">
              No notes match these filters.
            </p>
          ) : (
            <GraphCanvas graph={graph} focusId={focusId} height={600} />
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-[var(--ink-2)]">
            {LEGEND_ORDER.map((t) => (
              <span key={t} className="flex items-center gap-2">
                <TypeMark type={t} />
                {TYPE_LABEL[t]}
              </span>
            ))}
            <span className="flex items-center gap-2">
              <svg width="26" height="8" aria-hidden className="zk-graph-mark">
                <line className="edge edge-link" x1="1" y1="4" x2="25" y2="4" />
              </svg>
              Link
            </span>
            <span className="flex items-center gap-2">
              <svg width="26" height="8" aria-hidden className="zk-graph-mark">
                <line className="edge edge-sequence" x1="1" y1="4" x2="25" y2="4" />
              </svg>
              Folgezettel
            </span>
            <span className="text-[var(--ink-3)]">Bigger mark = more connections</span>
          </div>

          <details className="border-t border-[var(--rule)] pt-3">
            <summary className="smallcaps cursor-pointer">Connections as a list</summary>
            <ul className="mt-3 flex flex-col gap-2 text-[15px]">
              {graph.nodes.map((n) => {
                const near = neighboursOf.get(n.id) ?? []
                return (
                  <li key={n.id} className="flex flex-wrap items-baseline gap-x-2">
                    <span className="w-10 shrink-0 text-[13px] text-[var(--ink-4)]">{n.address ?? ''}</span>
                    <Link href={`/zk/${n.id}`} className={link}>
                      {n.title}
                    </Link>
                    <span className="text-[var(--ink-3)]">
                      {near.length === 0 ? '— no connections' : `→ ${near.map((id) => titleOf.get(id)).join(', ')}`}
                    </span>
                  </li>
                )
              })}
            </ul>
          </details>
        </>
      )}
    </>
  )
}
