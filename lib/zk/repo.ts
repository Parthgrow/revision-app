import type { Note, Source } from './types'

// Storage seams for the Zettelkasten. Services depend only on these, so tests
// run against createMemoryStore() and production against the KV store.

export interface NoteRepository {
  get(userId: string, id: string): Promise<Note | null>
  getMany(userId: string, ids: string[]): Promise<Note[]> // missing ids are skipped
  listAll(userId: string): Promise<Note[]>
  existing(userId: string, ids: string[]): Promise<Set<string>>
}

export interface LinkIndex {
  backlinks(userId: string, id: string): Promise<string[]>
}

export interface AddressIndex {
  listAll(userId: string): Promise<Record<string, string>> // address → note id
  // Atomic counter per parent (null = top level): 1, 2, 3, ... never reused.
  nextChildIndex(userId: string, parent: string | null): Promise<number>
  // Claims `address` for `id` only if it is free (HSETNX). Returns success.
  claim(userId: string, address: string, id: string): Promise<boolean>
  release(userId: string, address: string): Promise<void>
}

export interface SourceRepository {
  get(userId: string, id: string): Promise<Source | null>
  list(userId: string): Promise<Source[]>
  noteIds(userId: string, sourceId: string): Promise<string[]>
}

// Multi-key writes are queued and applied together in commit(), so a note and
// the backlink sets that mirror its links can't drift apart.
export interface UnitOfWork {
  putNote(note: Note): void
  deleteNote(userId: string, id: string): void
  addBacklink(userId: string, target: string, from: string): void
  removeBacklink(userId: string, target: string, from: string): void
  putSource(source: Source): void
  deleteSource(userId: string, id: string): void
  linkSource(userId: string, sourceId: string, noteId: string): void
  unlinkSource(userId: string, sourceId: string, noteId: string): void
  commit(): Promise<void>
}

export type ZkStore = {
  notes: NoteRepository
  links: LinkIndex
  addresses: AddressIndex
  sources: SourceRepository
  begin(): UnitOfWork
}

// --- In-memory implementation (tests, local experiments) ---

export function createMemoryStore(): ZkStore {
  const notes = new Map<string, Note>() // `${userId}:${id}`
  const backlinks = new Map<string, Set<string>>()
  const addresses = new Map<string, Map<string, string>>() // userId → address → id
  const counters = new Map<string, number>()
  const sources = new Map<string, Source>()
  const sourceNotes = new Map<string, Set<string>>()

  const k = (userId: string, id: string) => `${userId}:${id}`
  const setOf = (m: Map<string, Set<string>>, key: string) => {
    if (!m.has(key)) m.set(key, new Set())
    return m.get(key)!
  }
  const addrOf = (userId: string) => {
    if (!addresses.has(userId)) addresses.set(userId, new Map())
    return addresses.get(userId)!
  }
  const clone = <T>(v: T): T => structuredClone(v)

  return {
    notes: {
      async get(userId, id) {
        const n = notes.get(k(userId, id))
        return n ? clone(n) : null
      },
      async getMany(userId, ids) {
        return ids.map((id) => notes.get(k(userId, id))).filter(Boolean).map((n) => clone(n!))
      },
      async listAll(userId) {
        return [...notes.values()].filter((n) => n.userId === userId).map(clone)
      },
      async existing(userId, ids) {
        return new Set(ids.filter((id) => notes.has(k(userId, id))))
      },
    },
    links: {
      async backlinks(userId, id) {
        return [...(backlinks.get(k(userId, id)) ?? [])]
      },
    },
    addresses: {
      async listAll(userId) {
        return Object.fromEntries(addrOf(userId))
      },
      async nextChildIndex(userId, parent) {
        const key = k(userId, parent ?? '')
        const n = (counters.get(key) ?? 0) + 1
        counters.set(key, n)
        return n
      },
      async claim(userId, address, id) {
        const m = addrOf(userId)
        if (m.has(address)) return false
        m.set(address, id)
        return true
      },
      async release(userId, address) {
        addrOf(userId).delete(address)
      },
    },
    sources: {
      async get(userId, id) {
        const s = sources.get(k(userId, id))
        return s ? clone(s) : null
      },
      async list(userId) {
        return [...sources.values()].filter((s) => s.userId === userId).map(clone)
      },
      async noteIds(userId, sourceId) {
        return [...(sourceNotes.get(k(userId, sourceId)) ?? [])]
      },
    },
    begin() {
      const ops: (() => void)[] = []
      return {
        putNote: (note) => ops.push(() => notes.set(k(note.userId, note.id), clone(note))),
        deleteNote: (userId, id) =>
          ops.push(() => {
            notes.delete(k(userId, id))
            backlinks.delete(k(userId, id))
          }),
        addBacklink: (userId, target, from) => ops.push(() => setOf(backlinks, k(userId, target)).add(from)),
        removeBacklink: (userId, target, from) => ops.push(() => backlinks.get(k(userId, target))?.delete(from)),
        putSource: (s) => ops.push(() => sources.set(k(s.userId, s.id), clone(s))),
        deleteSource: (userId, id) =>
          ops.push(() => {
            sources.delete(k(userId, id))
            sourceNotes.delete(k(userId, id))
          }),
        linkSource: (userId, sid, nid) => ops.push(() => setOf(sourceNotes, k(userId, sid)).add(nid)),
        unlinkSource: (userId, sid, nid) => ops.push(() => sourceNotes.get(k(userId, sid))?.delete(nid)),
        async commit() {
          ops.forEach((op) => op())
        },
      }
    },
  }
}
