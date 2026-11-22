import type { Note, NoteSummary } from './types'

function excerptOf(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[\[[A-Za-z0-9]+\|([^\]]*)\]\]/g, '$1')
    .replace(/[#>*_`\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300)
}

export function summarize(note: Note, backlinkCount: number): NoteSummary {
  return {
    id: note.id,
    type: note.type,
    title: note.title,
    address: note.address,
    tags: note.tags,
    updatedAt: note.updatedAt,
    excerpt: excerptOf(note.body),
    linkCount: note.links.length,
    backlinkCount,
  }
}
