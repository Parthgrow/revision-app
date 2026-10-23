import { beforeEach, describe, expect, it } from 'vitest'
import type { Item } from '@/lib/kv'
import { createMemoryPalaceStore, type PalaceStore } from './repo'
import { createPalaceService, type PalaceService } from './service'
import { PalaceNotFoundError, PalaceValidationError } from './errors'

const U = 'u1'
const card = (id: string, content: string, userId = U): Item => ({
  id,
  userId,
  content,
  createdAt: 0,
  interval: 0,
  easeFactor: 2.5,
  repetitions: 0,
  dueDate: 0,
})

let store: PalaceStore
let svc: PalaceService

beforeEach(() => {
  store = createMemoryPalaceStore([card('c1', 'Mitochondria'), card('c2', 'Krebs cycle'), card('x1', 'other user', 'u2')])
  svc = createPalaceService(store)
})

describe('palaces', () => {
  it('requires a name and one letter a–z, stored lowercase', async () => {
    const p = await svc.createPalace(U, { name: '  Childhood home ', networkAlphabet: 'A' })
    expect(p).toMatchObject({ name: 'Childhood home', networkAlphabet: 'a' })
    expect(p.linkedPalaceId).toBeUndefined()
    for (const bad of [{ name: '', networkAlphabet: 'a' }, { name: 'x', networkAlphabet: '' }, { name: 'x', networkAlphabet: 'ab' }, { name: 'x', networkAlphabet: '1' }]) {
      await expect(svc.createPalace(U, bad)).rejects.toBeInstanceOf(PalaceValidationError)
    }
  })

  it('lets several palaces share a letter and sorts by letter, then name', async () => {
    await svc.createPalace(U, { name: 'Zoo', networkAlphabet: 'b' })
    await svc.createPalace(U, { name: 'Kitchen', networkAlphabet: 'a' })
    await svc.createPalace(U, { name: 'Attic', networkAlphabet: 'a' })
    expect((await svc.listPalaces(U)).map((p) => `${p.networkAlphabet}:${p.name}`)).toEqual(['a:Attic', 'a:Kitchen', 'b:Zoo'])
  })
})

describe('links (optional, one-way)', () => {
  it('links, relinks and unlinks; shows linked-to and linked-from', async () => {
    const a = await svc.createPalace(U, { name: 'Home', networkAlphabet: 'a' })
    const b = await svc.createPalace(U, { name: 'School', networkAlphabet: 'b' })
    const c = await svc.createPalace(U, { name: 'Classroom', networkAlphabet: 'c', linkedPalaceId: b.id })
    await svc.updatePalace(U, a.id, { linkedPalaceId: b.id })

    let view = await svc.listPalaces(U)
    const vb = view.find((p) => p.id === b.id)!
    expect(vb.linkedTo).toBeNull()
    expect(vb.linkedFrom.map((r) => r.name)).toEqual(['Home', 'Classroom'])
    expect(view.find((p) => p.id === a.id)!.linkedTo).toEqual({ id: b.id, name: 'School', networkAlphabet: 'b' })

    await svc.updatePalace(U, a.id, { linkedPalaceId: c.id })
    await svc.updatePalace(U, c.id, { linkedPalaceId: null })
    view = await svc.listPalaces(U)
    expect(view.find((p) => p.id === a.id)!.linkedTo?.id).toBe(c.id)
    expect(view.find((p) => p.id === c.id)!.linkedPalaceId).toBeUndefined()
  })

  it('refuses links to itself, to missing palaces and to other users’ palaces', async () => {
    const a = await svc.createPalace(U, { name: 'Home', networkAlphabet: 'a' })
    const other = await svc.createPalace('u2', { name: 'Theirs', networkAlphabet: 'a' })
    await expect(svc.updatePalace(U, a.id, { linkedPalaceId: a.id })).rejects.toBeInstanceOf(PalaceValidationError)
    await expect(svc.updatePalace(U, a.id, { linkedPalaceId: 'nope' })).rejects.toBeInstanceOf(PalaceNotFoundError)
    await expect(svc.createPalace(U, { name: 'x', networkAlphabet: 'a', linkedPalaceId: other.id })).rejects.toBeInstanceOf(
      PalaceNotFoundError
    )
  })

  it('allows loops', async () => {
    const a = await svc.createPalace(U, { name: 'A', networkAlphabet: 'a' })
    const b = await svc.createPalace(U, { name: 'B', networkAlphabet: 'b', linkedPalaceId: a.id })
    await svc.updatePalace(U, a.id, { linkedPalaceId: b.id })
    expect((await svc.listPalaces(U)).every((p) => p.linkedTo)).toBe(true)
  })
})

describe('cards in palaces', () => {
  it('marks a palace occupied when a card is placed, one card per palace', async () => {
    const p = await svc.createPalace(U, { name: 'Home', networkAlphabet: 'a' })
    await svc.placeCard(U, 'c1', p.id)
    expect((await svc.listPalaces(U))[0].card).toEqual({ id: 'c1', content: 'Mitochondria' })
    await expect(svc.placeCard(U, 'c2', p.id)).rejects.toThrow(/already holds “Mitochondria”/)
    await svc.placeCard(U, 'c1', p.id) // placing the same card again is fine
  })

  it('moves a card between palaces and takes it out', async () => {
    const a = await svc.createPalace(U, { name: 'A', networkAlphabet: 'a' })
    const b = await svc.createPalace(U, { name: 'B', networkAlphabet: 'b' })
    await svc.placeCard(U, 'c1', a.id)
    await svc.placeCard(U, 'c1', b.id)
    let view = await svc.listPalaces(U)
    expect(view.map((p) => p.card?.id ?? null)).toEqual([null, 'c1'])
    const out = await svc.placeCard(U, 'c1', null)
    expect(out.palaceId).toBeUndefined()
    view = await svc.listPalaces(U)
    expect(view.every((p) => p.card === null)).toBe(true)
  })

  it('frees the palace when its card is deleted', async () => {
    const a = await svc.createPalace(U, { name: 'A', networkAlphabet: 'a' })
    await svc.placeCard(U, 'c1', a.id)
    // Deleting a review card removes its record; occupancy is derived from cards.
    const shrunk = createPalaceService({ ...store, cards: { get: store.cards.get, listAll: async (u) => (await store.cards.listAll(u)).filter((c) => c.id !== 'c1') } })
    expect((await shrunk.listPalaces(U))[0].card).toBeNull()
  })

  it('refuses unknown cards, unknown palaces and other users’ cards', async () => {
    const a = await svc.createPalace(U, { name: 'A', networkAlphabet: 'a' })
    await expect(svc.placeCard(U, 'nope', a.id)).rejects.toBeInstanceOf(PalaceNotFoundError)
    await expect(svc.placeCard(U, 'c1', 'nope')).rejects.toBeInstanceOf(PalaceNotFoundError)
    await expect(svc.placeCard(U, 'x1', a.id)).rejects.toBeInstanceOf(PalaceNotFoundError)
  })
})

describe('deleting a palace', () => {
  it('clears links to it and releases its card without deleting the card', async () => {
    const a = await svc.createPalace(U, { name: 'A', networkAlphabet: 'a' })
    const b = await svc.createPalace(U, { name: 'B', networkAlphabet: 'b', linkedPalaceId: a.id })
    await svc.placeCard(U, 'c1', a.id)
    expect(await svc.deletePalace(U, a.id)).toEqual({ unlinked: 1, releasedCard: true })

    const view = await svc.listPalaces(U)
    expect(view.map((p) => p.id)).toEqual([b.id])
    expect(view[0].linkedPalaceId).toBeUndefined()
    const c1 = await store.cards.get(U, 'c1')
    expect(c1).not.toBeNull()
    expect(c1!.palaceId).toBeUndefined()
  })

  it('404s for an unknown palace', async () => {
    await expect(svc.deletePalace(U, 'nope')).rejects.toBeInstanceOf(PalaceNotFoundError)
  })
})
