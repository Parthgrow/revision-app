import { customAlphabet } from 'nanoid'
import type { Item } from '@/lib/kv'
import { PalaceNotFoundError, PalaceValidationError } from './errors'
import type { PalaceStore } from './repo'
import type { CreatePalaceInput, MemoryPalace, PalaceRef, PalaceView, UpdatePalaceInput } from './types'

export const PALACE_LIMITS = { name: 80 } as const
export const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('')

const newPalaceId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 10)

function cleanName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new PalaceValidationError('A palace needs a name')
  const name = value.trim()
  if (name.length > PALACE_LIMITS.name) {
    throw new PalaceValidationError(`Name must be ${PALACE_LIMITS.name} characters or fewer`)
  }
  return name
}

// Required, one letter a–z. Uppercase is accepted and stored lowercase.
function cleanLetter(value: unknown): string {
  const letter = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!/^[a-z]$/.test(letter)) throw new PalaceValidationError('Network alphabet must be one letter from a to z')
  return letter
}

// Copy of an object without one optional key (cleaner than destructuring).
function without<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const copy = { ...obj }
  delete copy[key]
  return copy
}

const ref = (p: MemoryPalace): PalaceRef => ({ id: p.id, name: p.name, networkAlphabet: p.networkAlphabet })

// Letter first, then name — the order the network page groups by.
export function comparePalaces(a: MemoryPalace, b: MemoryPalace): number {
  return a.networkAlphabet.localeCompare(b.networkAlphabet) || a.name.localeCompare(b.name) || (a.id < b.id ? -1 : 1)
}

export function createPalaceService(store: PalaceStore, now: () => number = Date.now) {
  const { palaces, cards } = store
  const next = (prev: number) => Math.max(now(), prev + 1)

  async function requirePalace(userId: string, id: string): Promise<MemoryPalace> {
    const p = await palaces.get(userId, id)
    if (!p) throw new PalaceNotFoundError()
    return p
  }

  // Optional one-way link: none, or an existing palace of yours other than itself.
  async function cleanLink(userId: string, selfId: string, value: unknown): Promise<string | undefined> {
    if (value === undefined || value === null || value === '') return undefined
    if (typeof value !== 'string') throw new PalaceValidationError('Linked palace must be an id')
    if (value === selfId) throw new PalaceValidationError('A palace can’t link to itself')
    if (!(await palaces.get(userId, value))) throw new PalaceNotFoundError('Linked palace')
    return value
  }

  function views(all: MemoryPalace[], allCards: Item[]): PalaceView[] {
    const byId = new Map(all.map((p) => [p.id, p]))
    const occupant = new Map<string, Item>()
    for (const c of allCards) if (c.palaceId && byId.has(c.palaceId) && !occupant.has(c.palaceId)) occupant.set(c.palaceId, c)
    return [...all].sort(comparePalaces).map((p) => {
      const target = p.linkedPalaceId ? byId.get(p.linkedPalaceId) : undefined
      const card = occupant.get(p.id)
      return {
        ...p,
        linkedTo: target ? ref(target) : null,
        linkedFrom: all.filter((o) => o.linkedPalaceId === p.id).sort(comparePalaces).map(ref),
        card: card ? { id: card.id, content: card.content } : null,
      }
    })
  }

  return {
    async listPalaces(userId: string): Promise<PalaceView[]> {
      const [all, allCards] = await Promise.all([palaces.listAll(userId), cards.listAll(userId)])
      return views(all, allCards)
    },

    async createPalace(userId: string, input: CreatePalaceInput): Promise<MemoryPalace> {
      const id = newPalaceId()
      const t = now()
      const linkedPalaceId = await cleanLink(userId, id, input?.linkedPalaceId)
      const palace: MemoryPalace = {
        id,
        userId,
        name: cleanName(input?.name),
        networkAlphabet: cleanLetter(input?.networkAlphabet),
        ...(linkedPalaceId && { linkedPalaceId }),
        createdAt: t,
        updatedAt: t,
      }
      const uow = store.begin()
      uow.putPalace(palace)
      await uow.commit()
      return palace
    },

    async updatePalace(userId: string, id: string, input: UpdatePalaceInput): Promise<MemoryPalace> {
      const p = await requirePalace(userId, id)
      const updated: MemoryPalace = { ...p, updatedAt: next(p.updatedAt) }
      if (input?.name !== undefined) updated.name = cleanName(input.name)
      if (input?.networkAlphabet !== undefined) updated.networkAlphabet = cleanLetter(input.networkAlphabet)
      if (input?.linkedPalaceId !== undefined) {
        const link = await cleanLink(userId, id, input.linkedPalaceId)
        if (link) updated.linkedPalaceId = link
        else delete updated.linkedPalaceId
      }
      const uow = store.begin()
      uow.putPalace(updated)
      await uow.commit()
      return updated
    },

    // Removes the palace, clears links that pointed to it, and takes its card
    // out of the palace (the card itself stays) — all in one transaction.
    async deletePalace(userId: string, id: string): Promise<{ unlinked: number; releasedCard: boolean }> {
      await requirePalace(userId, id)
      const [all, allCards] = await Promise.all([palaces.listAll(userId), cards.listAll(userId)])
      const uow = store.begin()
      const pointing = all.filter((o) => o.linkedPalaceId === id)
      for (const o of pointing) uow.putPalace({ ...without(o, 'linkedPalaceId'), updatedAt: next(o.updatedAt) })
      const placed = allCards.filter((c) => c.palaceId === id)
      for (const c of placed) uow.putCard(without(c, 'palaceId'))
      uow.deletePalace(userId, id)
      await uow.commit()
      return { unlinked: pointing.length, releasedCard: placed.length > 0 }
    },

    // Puts a review card in a palace (one card per palace), moves it from
    // another palace, or takes it out with palaceId null.
    async placeCard(userId: string, cardId: string, palaceId: string | null): Promise<Item> {
      const card = await cards.get(userId, cardId)
      if (!card) throw new PalaceNotFoundError('Card')
      let updated: Item
      if (palaceId === null || palaceId === undefined || palaceId === '') {
        updated = without(card, 'palaceId')
      } else {
        const palace = await requirePalace(userId, String(palaceId))
        const occupant = (await cards.listAll(userId)).find((c) => c.palaceId === palace.id && c.id !== card.id)
        if (occupant) {
          throw new PalaceValidationError(
            `[${palace.networkAlphabet}] ${palace.name} already holds “${occupant.content.slice(0, 60)}”. Take that card out first.`
          )
        }
        updated = { ...card, palaceId: palace.id }
      }
      const uow = store.begin()
      uow.putCard(updated)
      await uow.commit()
      return updated
    },
  }
}

export type PalaceService = ReturnType<typeof createPalaceService>
