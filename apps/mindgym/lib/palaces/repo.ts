import type { Item } from '@/lib/kv'
import type { MemoryPalace } from './types'

// Storage seams for the Memory Palace Network. Cards are the existing review
// items; this module only reads them and sets/clears their palaceId.

export interface PalaceRepository {
  get(userId: string, id: string): Promise<MemoryPalace | null>
  listAll(userId: string): Promise<MemoryPalace[]>
}

export interface CardRepository {
  get(userId: string, id: string): Promise<Item | null>
  listAll(userId: string): Promise<Item[]>
}

// Writes queued and applied together in commit() (one Redis MULTI).
export interface UnitOfWork {
  putPalace(p: MemoryPalace): void
  deletePalace(userId: string, id: string): void
  putCard(card: Item): void
  commit(): Promise<void>
}

export type PalaceStore = {
  palaces: PalaceRepository
  cards: CardRepository
  begin(): UnitOfWork
}

// --- In-memory implementation (tests) ---

export function createMemoryPalaceStore(seedCards: Item[] = []): PalaceStore {
  const palaces = new Map<string, MemoryPalace>() // `${u}:${id}`
  const cards = new Map<string, Item>(seedCards.map((c) => [`${c.userId}:${c.id}`, structuredClone(c)]))
  const k = (u: string, id: string) => `${u}:${id}`
  const clone = <T>(v: T): T => structuredClone(v)

  return {
    palaces: {
      async get(u, id) {
        const p = palaces.get(k(u, id))
        return p ? clone(p) : null
      },
      async listAll(u) {
        return [...palaces.values()].filter((p) => p.userId === u).map(clone)
      },
    },
    cards: {
      async get(u, id) {
        const c = cards.get(k(u, id))
        return c ? clone(c) : null
      },
      async listAll(u) {
        return [...cards.values()].filter((c) => c.userId === u).map(clone)
      },
    },
    begin() {
      const ops: (() => void)[] = []
      return {
        putPalace: (p) => ops.push(() => palaces.set(k(p.userId, p.id), clone(p))),
        deletePalace: (u, id) => ops.push(() => palaces.delete(k(u, id))),
        putCard: (c) => ops.push(() => cards.set(k(c.userId, c.id), clone(c))),
        async commit() {
          ops.forEach((op) => op())
        },
      }
    },
  }
}
