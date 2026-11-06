// Memory Palace Network: a library of memory palaces, separate from the
// existing Palace entries (lib/kv.ts MpItem).

export type MemoryPalace = {
  id: string
  userId: string
  name: string
  networkAlphabet: string // one lowercase letter a–z; several palaces may share one
  linkedPalaceId?: string // optional one-way link to one other palace
  createdAt: number
  updatedAt: number
}

// The slice of a review card this module reads and writes.
export type PlacedCard = { id: string; content: string; palaceId?: string }

export type PalaceRef = Pick<MemoryPalace, 'id' | 'name' | 'networkAlphabet'>

// What the pages show: a palace with its links and its occupant resolved.
// Occupancy is derived from cards (card.palaceId), never stored on the palace.
export type PalaceView = MemoryPalace & {
  linkedTo: PalaceRef | null
  linkedFrom: PalaceRef[]
  card: { id: string; content: string } | null
}

export type CreatePalaceInput = { name: string; networkAlphabet: string; linkedPalaceId?: string | null }
export type UpdatePalaceInput = { name?: string; networkAlphabet?: string; linkedPalaceId?: string | null }
