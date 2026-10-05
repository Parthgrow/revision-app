export type NoteType = 'fleeting' | 'literature' | 'permanent' | 'structure'

export const NOTE_TYPES: NoteType[] = ['fleeting', 'literature', 'permanent', 'structure']

// Allowed `promote` moves. Literature notes are never converted: a permanent
// note is written as a new note that links back to the literature note.
export const PROMOTIONS: Record<NoteType, NoteType[]> = {
  fleeting: ['permanent', 'literature'],
  literature: [],
  permanent: ['structure'],
  structure: ['permanent'],
}

export type Note = {
  id: string            // immutable — the only thing links point at
  userId: string
  type: NoteType
  title: string
  body: string          // markdown; links are [[id]] or [[id|label]]
  tags: string[]
  links: string[]       // derived on save: existing, non-self targets parsed from body
  address?: string      // Folgezettel, e.g. "3a2"; unique per user, optional
  sourceId?: string     // required when type === 'literature'
  reviewItemId?: string // set when the note is sent to SM-2 review
  createdAt: number
  updatedAt: number
}

export type NoteSummary = Pick<Note, 'id' | 'type' | 'title' | 'address' | 'tags' | 'updatedAt'> & {
  excerpt: string
  linkCount: number
  backlinkCount: number
}

export type Source = {
  id: string
  userId: string
  title: string
  author?: string
  url?: string
  year?: number
  createdAt: number
}

export type Sequence = {
  parent: NoteSummary | null
  prev: NoteSummary | null
  next: NoteSummary | null
  children: NoteSummary[]
}

export type NoteView = {
  note: Note
  outgoing: NoteSummary[]
  backlinks: NoteSummary[]
  brokenLinks: string[]
  sequence: Sequence
  source: Source | null
}

export type CreateNoteInput = {
  type?: NoteType
  title?: string
  body: string
  tags?: string[]
  sourceId?: string
  address?: string      // claim a specific address
  withAddress?: boolean // allocate the next free top-level address
}

export type UpdateNoteInput = {
  title?: string
  body?: string
  tags?: string[]
  sourceId?: string | null
  // Stale-save protection: the updatedAt the editor loaded. If the stored note
  // is newer, the save is rejected with 409 instead of overwriting.
  expectedUpdatedAt?: number
  force?: boolean
}

export type CreateSourceInput = {
  title: string
  author?: string
  url?: string
  year?: number
}
