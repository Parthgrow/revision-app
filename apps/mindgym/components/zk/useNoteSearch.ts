'use client'

import { useMemo } from 'react'
import MiniSearch from 'minisearch'
import type { NoteSummary } from '@/lib/zk/types'

// Client-side full-text search over note summaries (title, tags, excerpt,
// address). Rebuilt whenever the summaries change.
export function useNoteSearch(summaries: NoteSummary[]) {
  const index = useMemo(() => {
    const ms = new MiniSearch<NoteSummary>({
      fields: ['title', 'tagText', 'excerpt', 'address'],
      storeFields: ['id'],
      extractField: (doc, field) =>
        field === 'tagText' ? doc.tags.join(' ') : String((doc as Record<string, unknown>)[field] ?? ''),
      searchOptions: { boost: { title: 3, tagText: 2 }, prefix: true, fuzzy: 0.2 },
    })
    ms.addAll(summaries)
    return ms
  }, [summaries])

  const byId = useMemo(() => new Map(summaries.map((s) => [s.id, s])), [summaries])

  return (query: string, limit = 50): NoteSummary[] => {
    const q = query.trim()
    if (!q) return []
    return index
      .search(q)
      .slice(0, limit)
      .map((r) => byId.get(r.id as string))
      .filter((s): s is NoteSummary => !!s)
  }
}
