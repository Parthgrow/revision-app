import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryStore, type ZkStore } from './repo'
import { createNoteService, type NoteService } from './service'
import { createReviewBridge } from './review-bridge'
import { AddressTakenError, NotFoundError, StaleWriteError, ValidationError } from './errors'
import { formatLink } from './links'
import type { Item } from '@/lib/kv'

const U = 'user1'
let store: ZkStore
let zk: NoteService
let clock: number

beforeEach(() => {
  store = createMemoryStore()
  clock = 1_000
  zk = createNoteService(store, () => clock)
})

const backlinksOf = (id: string) => store.links.backlinks(U, id)

describe('create', () => {
  it('defaults to a fleeting note titled from the first line', async () => {
    const n = await zk.create(U, { body: '# Spacing works\nmore text' })
    expect(n.type).toBe('fleeting')
    expect(n.title).toBe('Spacing works')
    expect(n.id).toMatch(/^[A-Za-z0-9]{10}$/)
  })

  it('requires text or a title', async () => {
    await expect(zk.create(U, { body: '   ' })).rejects.toBeInstanceOf(ValidationError)
  })

  it('normalises and validates tags', async () => {
    const n = await zk.create(U, { body: 'x', tags: ['#Memory', 'memory', 'sm-2'] })
    expect(n.tags).toEqual(['memory', 'sm-2'])
    await expect(zk.create(U, { body: 'x', tags: ['two words'] })).rejects.toBeInstanceOf(ValidationError)
  })

  it('keeps only links to notes that exist, never to itself', async () => {
    const a = await zk.create(U, { body: 'A' })
    const b = await zk.create(U, { body: `B → ${formatLink(a.id)} and ${formatLink('ZZZZZZZZZZ')}` })
    expect(b.links).toEqual([a.id])
    expect(await backlinksOf(a.id)).toEqual([b.id])
  })

  it('requires a source for literature notes', async () => {
    await expect(zk.create(U, { body: 'x', type: 'literature' })).rejects.toBeInstanceOf(ValidationError)
    const s = await zk.createSource(U, { title: 'Make It Stick' })
    const n = await zk.create(U, { body: 'x', type: 'literature', sourceId: s.id })
    expect((await zk.getSource(U, s.id)).notes.map((x) => x.id)).toEqual([n.id])
  })

  it('claims a hand-picked address once', async () => {
    await zk.create(U, { body: 'x', address: '7' })
    await expect(zk.create(U, { body: 'y', address: '7' })).rejects.toBeInstanceOf(AddressTakenError)
    await expect(zk.create(U, { body: 'y', address: '7?' })).rejects.toBeInstanceOf(ValidationError)
  })
})

describe('update keeps backlinks in sync', () => {
  it('adds and removes backlinks as links change', async () => {
    const a = await zk.create(U, { body: 'A' })
    const b = await zk.create(U, { body: 'B' })
    const c = await zk.create(U, { body: `C ${formatLink(a.id)}` })

    await zk.update(U, c.id, { body: `C ${formatLink(b.id)}` })
    expect(await backlinksOf(a.id)).toEqual([])
    expect(await backlinksOf(b.id)).toEqual([c.id])
  })

  it('leaves the title alone when only the body changes', async () => {
    const a = await zk.create(U, { body: 'x', title: 'Fixed' })
    expect((await zk.update(U, a.id, { body: 'new first line' })).title).toBe('Fixed')
  })

  it('always moves updatedAt forward', async () => {
    const a = await zk.create(U, { body: 'x' })
    const b = await zk.update(U, a.id, { body: 'y' }) // same clock tick
    expect(b.updatedAt).toBeGreaterThan(a.updatedAt)
  })
})

describe('stale-save protection', () => {
  it('rejects a save based on an old version and returns the current one', async () => {
    const a = await zk.create(U, { body: 'v1' })
    clock += 10
    const fromTabB = await zk.update(U, a.id, { body: 'v2', expectedUpdatedAt: a.updatedAt })

    const err = await zk.update(U, a.id, { body: 'v1 + typo fix', expectedUpdatedAt: a.updatedAt }).catch((e) => e)
    expect(err).toBeInstanceOf(StaleWriteError)
    expect(err.current.body).toBe('v2')
    expect((await store.notes.get(U, a.id))!.updatedAt).toBe(fromTabB.updatedAt)
  })

  it('lets the user overwrite deliberately with force', async () => {
    const a = await zk.create(U, { body: 'v1' })
    await zk.update(U, a.id, { body: 'v2' })
    const n = await zk.update(U, a.id, { body: 'mine', expectedUpdatedAt: a.updatedAt, force: true })
    expect(n.body).toBe('mine')
  })
})

describe('delete', () => {
  it('reports incoming links on a dry run and changes nothing', async () => {
    const a = await zk.create(U, { body: 'A' })
    const b = await zk.create(U, { body: `B ${formatLink(a.id)}` })
    const { brokenIncoming } = await zk.delete(U, a.id, { dryRun: true })
    expect(brokenIncoming.map((s) => s.id)).toEqual([b.id])
    expect(await store.notes.get(U, a.id)).not.toBeNull()
  })

  it('removes outgoing backlinks and shows dangling links as broken', async () => {
    const a = await zk.create(U, { body: 'A' })
    const b = await zk.create(U, { body: `B ${formatLink(a.id)}` })
    const c = await zk.create(U, { body: `C ${formatLink(b.id)}` })

    await zk.delete(U, b.id)
    expect(await backlinksOf(a.id)).toEqual([])
    const view = await zk.getView(U, c.id)
    expect(view.brokenLinks).toEqual([b.id])
    await expect(zk.getView(U, b.id)).rejects.toBeInstanceOf(NotFoundError)
  })

  it('frees the address but never reissues it', async () => {
    const root = await zk.create(U, { body: 'root', withAddress: true })
    const child = await zk.continueThought(U, root.id, {})
    expect(child.address).toBe('1a')
    await zk.delete(U, child.id)
    expect((await zk.continueThought(U, root.id, {})).address).toBe('1b')
  })
})

describe('Folgezettel', () => {
  it('gives a parent without an address a top-level one first', async () => {
    const p = await zk.create(U, { body: 'P' })
    const c = await zk.continueThought(U, p.id, {})
    expect((await store.notes.get(U, p.id))!.address).toBe('1')
    expect(c.address).toBe('1a')
    expect(c.links).toEqual([p.id]) // pre-filled "Continues [[parent]]"
    expect((await store.notes.get(U, p.id))!.updatedAt).toBe(p.updatedAt)
  })

  it('hands out distinct addresses to concurrent continues', async () => {
    const p = await zk.create(U, { body: 'P', withAddress: true })
    const kids = await Promise.all([1, 2, 3, 4].map(() => zk.continueThought(U, p.id, {})))
    expect(new Set(kids.map((k) => k.address)).size).toBe(4)
  })

  it('skips addresses already taken by hand', async () => {
    const p = await zk.create(U, { body: 'P', address: '3' })
    await zk.create(U, { body: 'manual', address: '3a' })
    expect((await zk.continueThought(U, p.id, {})).address).toBe('3b')
  })

  it('builds parent / siblings / children for a note', async () => {
    const one = await zk.create(U, { body: 'one', withAddress: true })
    const a = await zk.continueThought(U, one.id, { body: 'a' })
    const b = await zk.continueThought(U, one.id, { body: 'b' })
    const c = await zk.continueThought(U, one.id, { body: 'c' })
    const b1 = await zk.continueThought(U, b.id, { body: 'b1' })

    const { sequence } = await zk.getView(U, b.id)
    expect(sequence.parent?.id).toBe(one.id)
    expect(sequence.prev?.id).toBe(a.id)
    expect(sequence.next?.id).toBe(c.id)
    expect(sequence.children.map((s) => s.id)).toEqual([b1.id])
  })
})

describe('promote', () => {
  it('allows only the defined transitions', async () => {
    const n = await zk.create(U, { body: 'x' })
    expect((await zk.promote(U, n.id, 'permanent')).type).toBe('permanent')
    expect((await zk.promote(U, n.id, 'structure')).type).toBe('structure')
    await expect(zk.promote(U, n.id, 'fleeting')).rejects.toBeInstanceOf(ValidationError)
  })

  it('needs a source to become literature', async () => {
    const n = await zk.create(U, { body: 'x' })
    await expect(zk.promote(U, n.id, 'literature')).rejects.toBeInstanceOf(ValidationError)
    const s = await zk.createSource(U, { title: 'Book' })
    expect((await zk.promote(U, n.id, 'literature', s.id)).sourceId).toBe(s.id)
    await expect(zk.deleteSource(U, s.id)).rejects.toBeInstanceOf(ValidationError)
  })
})

describe('summaries', () => {
  it('counts links both ways and finds orphans', async () => {
    const a = await zk.create(U, { body: 'A', type: 'permanent' })
    const lonely = await zk.create(U, { body: 'alone', type: 'permanent' })
    await zk.create(U, { body: `B ${formatLink(a.id)}`, type: 'permanent' })

    const all = await zk.listSummaries(U)
    expect(all.find((s) => s.id === a.id)?.backlinkCount).toBe(1)
    expect((await zk.listSummaries(U, { orphans: true })).map((s) => s.id)).toEqual([lonely.id])
  })
})

describe('review bridge', () => {
  function fakeItems() {
    const items = new Map<string, Item>()
    let n = 0
    return {
      items,
      gateway: {
        get: async (_u: string, id: string) => items.get(id) ?? null,
        create: async (userId: string, content: string, extra: { noteId: string }) => {
          const item = { id: `item${++n}`, userId, content, createdAt: 0, interval: 0, easeFactor: 2.5, repetitions: 0, dueDate: 0, ...extra }
          items.set(item.id, item)
          return item
        },
        delete: async (_u: string, id: string) => void items.delete(id),
      },
    }
  }

  it('creates one card per note and links both ways', async () => {
    const { items, gateway } = fakeItems()
    const bridge = createReviewBridge(zk, gateway)
    const n = await zk.create(U, { body: 'x', title: 'Testing effect' })

    const first = await bridge.sendToReview(U, n.id)
    const again = await bridge.sendToReview(U, n.id)
    expect(again.id).toBe(first.id)
    expect(items.size).toBe(1)
    expect(first).toMatchObject({ content: 'Testing effect', noteId: n.id })

    const stored = (await store.notes.get(U, n.id))!
    expect(stored.reviewItemId).toBe(first.id)
    expect(stored.updatedAt).toBe(n.updatedAt) // no false stale-save conflict
  })

  it('recreates the card if it was deleted from the Review screen', async () => {
    const { items, gateway } = fakeItems()
    const bridge = createReviewBridge(zk, gateway)
    const n = await zk.create(U, { body: 'x' })
    const first = await bridge.sendToReview(U, n.id)
    items.delete(first.id)
    expect((await bridge.sendToReview(U, n.id)).id).not.toBe(first.id)
  })

  it('removes the card and clears the note', async () => {
    const { items, gateway } = fakeItems()
    const bridge = createReviewBridge(zk, gateway)
    const n = await zk.create(U, { body: 'x' })
    await bridge.sendToReview(U, n.id)
    await bridge.removeFromReview(U, n.id)
    expect(items.size).toBe(0)
    expect((await store.notes.get(U, n.id))!.reviewItemId).toBeUndefined()
  })
})
