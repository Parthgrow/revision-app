import { beforeEach, describe, expect, it } from 'vitest'
import { buildGraph, seedPosition, toGraphEntry } from './graph'
import { createMemoryStore, type ZkStore } from './repo'
import { createNoteService, type NoteService } from './service'
import { createReviewBridge } from './review-bridge'
import { formatLink } from './links'
import type { GraphEntry } from './types'
import type { Item } from '@/lib/kv'

const card = (t: string, extra: Partial<GraphEntry> = {}): GraphEntry => ({ t, y: 'permanent', g: [], l: [], ...extra })

describe('buildGraph', () => {
  it('makes one undirected edge per linked pair', () => {
    const g = buildGraph({
      A: card('A', { l: ['B'] }),
      B: card('B', { l: ['A'] }), // links back: still one edge
      C: card('C'),
    })
    expect(g.edges).toEqual([{ source: 'A', target: 'B', kinds: ['link'] }])
    expect(g.nodes.map((n) => [n.id, n.degree])).toEqual([['A', 1], ['B', 1], ['C', 0]])
  })

  it('adds Folgezettel parent → child edges and merges them with links', () => {
    const g = buildGraph({
      P: card('Parent', { a: '1' }),
      C: card('Child', { a: '1a', l: ['P'] }), // "Continues [[P]]"
      D: card('Grandchild', { a: '1a1' }),
    })
    expect(g.edges).toEqual([
      { source: 'C', target: 'D', kinds: ['sequence'] },
      { source: 'C', target: 'P', kinds: ['link', 'sequence'] },
    ])
  })

  it('can leave sequence edges out', () => {
    const g = buildGraph({ P: card('P', { a: '1' }), C: card('C', { a: '1a' }) }, { sequence: false })
    expect(g.edges).toEqual([])
  })

  it('skips links to missing notes and to itself', () => {
    const g = buildGraph({ A: card('A', { l: ['GONE', 'A'] }) })
    expect(g.edges).toEqual([])
    expect(g.nodes[0].degree).toBe(0)
  })

  it('filters by type and tag, dropping edges to filtered-out notes', () => {
    const entries = {
      A: card('A', { y: 'fleeting', l: ['B'] }),
      B: card('B', { g: ['db'] }),
      C: card('C', { g: ['db'], l: ['B'] }),
    }
    const byType = buildGraph(entries, { types: ['permanent'] })
    expect(byType.nodes.map((n) => n.id)).toEqual(['B', 'C'])
    expect(byType.edges).toEqual([{ source: 'B', target: 'C', kinds: ['link'] }])
    expect(buildGraph(entries, { tag: 'db' }).nodes.map((n) => n.id)).toEqual(['B', 'C'])
  })

  it('hides orphans on request', () => {
    const g = buildGraph({ A: card('A', { l: ['B'] }), B: card('B'), C: card('C') }, { hideOrphans: true })
    expect(g.nodes.map((n) => n.id)).toEqual(['A', 'B'])
  })
})

describe('seedPosition', () => {
  it('is stable per id and spreads ids apart', () => {
    expect(seedPosition('aedQ0gH9Qj')).toEqual(seedPosition('aedQ0gH9Qj'))
    const points = ['a', 'b', 'c', 'd', 'e'].map((id) => seedPosition(id).join(','))
    expect(new Set(points).size).toBe(5)
    for (const [x, y] of ['a', 'zz', 'Wfn7y7h9Dv'].map((id) => seedPosition(id, 100))) {
      expect(Math.hypot(x, y)).toBeLessThanOrEqual(100)
    }
  })
})

describe('graph index stays in step with notes', () => {
  const U = 'u1'
  let store: ZkStore
  let zk: NoteService

  beforeEach(() => {
    store = createMemoryStore()
    zk = createNoteService(store, () => 1_000)
  })

  async function expectIndexMatchesNotes() {
    const notes = await store.notes.listAll(U)
    const expected = Object.fromEntries(notes.map((n) => [n.id, toGraphEntry(n)]))
    expect(await store.graph.all(U)).toEqual(expected)
    expect(await store.graph.isComplete(U)).toBe(true)
  }

  it('after create, edit, continue, promote, review and delete', async () => {
    const a = await zk.create(U, { body: 'Database' })
    const b = await zk.create(U, { body: `Indexes ${formatLink(a.id)}`, tags: ['db'] })
    await expectIndexMatchesNotes()

    await zk.update(U, b.id, { title: 'Database indexes', body: 'no link now' })
    await zk.continueThought(U, a.id, {}) // also gives `a` an address
    await zk.promote(U, a.id, 'permanent')
    await expectIndexMatchesNotes()

    const items = new Map<string, Item>()
    const bridge = createReviewBridge(zk, {
      get: async (_u, id) => items.get(id) ?? null,
      create: async (userId, content, extra) => {
        const item = { id: 'i1', userId, content, createdAt: 0, interval: 0, easeFactor: 2.5, repetitions: 0, dueDate: 0, ...extra }
        items.set(item.id, item)
        return item
      },
      delete: async (_u, id) => void items.delete(id),
    })
    await bridge.sendToReview(U, b.id)
    await zk.delete(U, b.id)
    await expectIndexMatchesNotes()
  })

  it('rebuilds a missing index on the next graph load', async () => {
    const a = await zk.create(U, { body: 'A', withAddress: true })
    await zk.continueThought(U, a.id, {})
    await store.graph.rebuild(U, []) // simulate notes written before the index existed
    expect(await store.graph.isComplete(U)).toBe(false)

    const g = await zk.graph(U)
    expect(g.nodes).toHaveLength(2)
    expect(g.edges[0].kinds).toEqual(['link', 'sequence'])
    await expectIndexMatchesNotes()
  })
})
