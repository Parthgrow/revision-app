import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryCtxStore, type CtxStore } from './repo'
import { createContextService, sortToc, type ContextService } from './service'
import { CtxNotFoundError, CtxStaleWriteError, CtxValidationError } from './errors'

const U = 'u1'
let store: CtxStore
let svc: ContextService
let clock: number

beforeEach(() => {
  store = createMemoryCtxStore()
  clock = 1_000
  svc = createContextService(store, () => clock)
})

describe('projects', () => {
  it('creates the schema and HLD together with the project', async () => {
    const p = await svc.createProject(U, { name: '  MindGym ', description: 'notes app' })
    expect(p.name).toBe('MindGym')
    const { entries } = await svc.getToc(U, p.id)
    expect(entries.map((e) => [e.kind, e.title])).toEqual([
      ['schema', 'Database schema'],
      ['hld', 'HLD'],
    ])
    expect(entries.map((e) => e.id)).toEqual([p.schemaId, p.hldId])
    const hld = await svc.getDoc(U, p.id, p.hldId)
    expect(hld.body).toContain('High-level design for MindGym.')
    expect(hld.body).toContain('┌')
  })

  it('validates names', async () => {
    await expect(svc.createProject(U, { name: '  ' })).rejects.toBeInstanceOf(CtxValidationError)
    await expect(svc.createProject(U, { name: 'x'.repeat(81) })).rejects.toBeInstanceOf(CtxValidationError)
  })

  it('lists projects newest first with LLD counts', async () => {
    const a = await svc.createProject(U, { name: 'A' })
    clock += 10
    const b = await svc.createProject(U, { name: 'B' })
    clock += 10
    await svc.addLld(U, a.id, { title: 'Auth' }) // touches A
    const list = await svc.listProjects(U)
    expect(list.map((p) => [p.name, p.lldCount])).toEqual([
      ['A', 1],
      ['B', 0],
    ])
    expect(list[1].id).toBe(b.id)
  })

  it('renames and clears the description', async () => {
    const p = await svc.createProject(U, { name: 'A', description: 'd' })
    const r = await svc.updateProject(U, p.id, { name: 'B', description: null })
    expect(r.name).toBe('B')
    expect(r.description).toBeUndefined()
  })

  it('deletes a project and every document in it, leaving others alone', async () => {
    const a = await svc.createProject(U, { name: 'A' })
    const b = await svc.createProject(U, { name: 'B' })
    const l = await svc.addLld(U, a.id, { title: 'L' })
    await svc.deleteProject(U, a.id)
    for (const id of [a.schemaId, a.hldId, l.id]) expect(await store.docs.get(U, id)).toBeNull()
    expect(await store.docs.toc(U, a.id)).toEqual([])
    expect(await store.projects.listIds(U)).toEqual([b.id])
    expect((await svc.getToc(U, b.id)).entries).toHaveLength(2)
  })
})

describe('documents', () => {
  it('adds LLDs from the template and orders the menu by creation time', async () => {
    const p = await svc.createProject(U, { name: 'A' })
    clock += 5
    const second = await svc.addLld(U, p.id, { title: 'Zeta' })
    clock += 5
    const third = await svc.addLld(U, p.id, { title: 'Alpha' })
    expect(second.body).toContain('Low-level design for Zeta.')
    const { entries } = await svc.getToc(U, p.id)
    expect(entries.map((e) => e.title)).toEqual(['Database schema', 'HLD', 'Zeta', 'Alpha'])
    expect(entries.slice(2).map((e) => e.id)).toEqual([second.id, third.id])
  })

  it('renames an LLD and updates the menu', async () => {
    const p = await svc.createProject(U, { name: 'A' })
    const l = await svc.addLld(U, p.id, { title: 'Old' })
    await svc.updateDoc(U, p.id, l.id, { title: 'New' })
    expect((await svc.getToc(U, p.id)).entries[2].title).toBe('New')
  })

  it('keeps schema and HLD titles fixed and undeletable, but editable', async () => {
    const p = await svc.createProject(U, { name: 'A' })
    await expect(svc.updateDoc(U, p.id, p.hldId, { title: 'Other' })).rejects.toBeInstanceOf(CtxValidationError)
    await expect(svc.deleteLld(U, p.id, p.schemaId)).rejects.toBeInstanceOf(CtxValidationError)
    const edited = await svc.updateDoc(U, p.id, p.hldId, { title: 'HLD', body: 'new body' })
    expect(edited.body).toBe('new body')
  })

  it('deletes an LLD', async () => {
    const p = await svc.createProject(U, { name: 'A' })
    const l = await svc.addLld(U, p.id, { title: 'L' })
    await svc.deleteLld(U, p.id, l.id)
    expect((await svc.getToc(U, p.id)).entries).toHaveLength(2)
    await expect(svc.getDoc(U, p.id, l.id)).rejects.toBeInstanceOf(CtxNotFoundError)
  })

  it('treats a document opened under the wrong project as not found', async () => {
    const a = await svc.createProject(U, { name: 'A' })
    const b = await svc.createProject(U, { name: 'B' })
    await expect(svc.getDoc(U, b.id, a.hldId)).rejects.toBeInstanceOf(CtxNotFoundError)
    await expect(svc.updateDoc(U, b.id, a.hldId, { body: 'x' })).rejects.toBeInstanceOf(CtxNotFoundError)
    await expect(svc.getDoc('someone-else', a.id, a.hldId)).rejects.toBeInstanceOf(CtxNotFoundError)
  })

  it('stores tabs as two spaces so ASCII diagrams stay aligned', async () => {
    const p = await svc.createProject(U, { name: 'A' })
    const d = await svc.updateDoc(U, p.id, p.hldId, { body: '│\tx\r\ny' })
    expect(d.body).toBe('│  x\ny')
  })

  it('enforces size and count limits', async () => {
    const p = await svc.createProject(U, { name: 'A' })
    await expect(svc.updateDoc(U, p.id, p.hldId, { body: 'x'.repeat(200_001) })).rejects.toBeInstanceOf(
      CtxValidationError
    )
    for (let i = 0; i < 100; i++) await svc.addLld(U, p.id, { title: `L${i}`, body: '' })
    await expect(svc.addLld(U, p.id, { title: 'one more' })).rejects.toBeInstanceOf(CtxValidationError)
  })
})

describe('stale-save protection', () => {
  it('rejects a save based on an old version and returns the stored one', async () => {
    const p = await svc.createProject(U, { name: 'A' })
    const loaded = await svc.getDoc(U, p.id, p.hldId)
    await svc.updateDoc(U, p.id, p.hldId, { body: 'tab B', expectedUpdatedAt: loaded.updatedAt })
    const err = await svc
      .updateDoc(U, p.id, p.hldId, { body: 'stale tab A', expectedUpdatedAt: loaded.updatedAt })
      .catch((e) => e)
    expect(err).toBeInstanceOf(CtxStaleWriteError)
    expect(err.current.body).toBe('tab B')
  })

  it('overwrites with force', async () => {
    const p = await svc.createProject(U, { name: 'A' })
    const loaded = await svc.getDoc(U, p.id, p.hldId)
    await svc.updateDoc(U, p.id, p.hldId, { body: 'tab B' })
    const d = await svc.updateDoc(U, p.id, p.hldId, { body: 'mine', expectedUpdatedAt: loaded.updatedAt, force: true })
    expect(d.body).toBe('mine')
    expect(d.updatedAt).toBeGreaterThan(loaded.updatedAt)
  })
})

describe('printing', () => {
  it('returns one document or the whole project in menu order', async () => {
    const p = await svc.createProject(U, { name: 'A' })
    clock += 1
    const l = await svc.addLld(U, p.id, { title: 'L' })
    expect((await svc.getPrintable(U, p.id, l.id)).docs.map((d) => d.id)).toEqual([l.id])
    expect((await svc.getPrintable(U, p.id)).docs.map((d) => d.kind)).toEqual(['schema', 'hld', 'lld'])
  })
})

describe('sortToc', () => {
  it('puts schema and HLD first regardless of time', () => {
    const e = (id: string, kind: 'schema' | 'hld' | 'lld', createdAt: number) => ({ id, kind, title: id, createdAt })
    expect(sortToc([e('l2', 'lld', 3), e('h', 'hld', 9), e('l1', 'lld', 1), e('s', 'schema', 9)]).map((x) => x.id)).toEqual(
      ['s', 'h', 'l1', 'l2']
    )
  })
})

describe('lookups for the Claude connector', () => {
  it('finds a project by id or case-insensitive name, and reports ambiguity', async () => {
    const a = await svc.createProject(U, { name: 'MindGym' })
    expect((await svc.findProject(U, a.id)).id).toBe(a.id)
    expect((await svc.findProject(U, '  mindgym ')).id).toBe(a.id)
    await expect(svc.findProject(U, 'nope')).rejects.toBeInstanceOf(CtxNotFoundError)
    await svc.createProject(U, { name: 'mindGYM' })
    await expect(svc.findProject(U, 'MindGym')).rejects.toBeInstanceOf(CtxValidationError)
  })

  it('finds documents by id, schema/hld, or LLD title', async () => {
    const p = await svc.createProject(U, { name: 'A' })
    const l = await svc.addLld(U, p.id, { title: 'Graph view' })
    expect((await svc.findDoc(U, p.id, 'schema')).id).toBe(p.schemaId)
    expect((await svc.findDoc(U, p.id, 'Database schema')).id).toBe(p.schemaId)
    expect((await svc.findDoc(U, p.id, 'HLD')).id).toBe(p.hldId)
    expect((await svc.findDoc(U, p.id, 'graph VIEW')).id).toBe(l.id)
    expect((await svc.findDoc(U, p.id, l.id)).id).toBe(l.id)
    await expect(svc.findDoc(U, p.id, 'Auth')).rejects.toBeInstanceOf(CtxNotFoundError)
    await svc.addLld(U, p.id, { title: 'graph view' })
    await expect(svc.findDoc(U, p.id, 'Graph view')).rejects.toBeInstanceOf(CtxValidationError)
  })

  it('does not find a document from another project by id', async () => {
    const a = await svc.createProject(U, { name: 'A' })
    const b = await svc.createProject(U, { name: 'B' })
    await expect(svc.findDoc(U, b.id, a.hldId)).rejects.toBeInstanceOf(CtxNotFoundError)
  })

  it('replaces exactly one passage', async () => {
    const p = await svc.createProject(U, { name: 'A' })
    await svc.updateDoc(U, p.id, p.hldId, { body: '## Goals\n- fast\n\n## Risks\n- fast\n' })
    await expect(svc.replaceInDoc(U, p.id, p.hldId, '- fast', '- quick')).rejects.toThrow(/appears 2 times/)
    await expect(svc.replaceInDoc(U, p.id, p.hldId, 'missing', 'x')).rejects.toThrow(/not found/)
    const d = await svc.replaceInDoc(U, p.id, p.hldId, '## Risks\n- fast', '## Risks\n- slow cold starts')
    expect(d.body).toBe('## Goals\n- fast\n\n## Risks\n- slow cold starts\n')
  })

  it('refuses a passage edit based on an old version', async () => {
    const p = await svc.createProject(U, { name: 'A' })
    const read = await svc.getDoc(U, p.id, p.hldId)
    await svc.updateDoc(U, p.id, p.hldId, { body: read.body + '\nedited in the browser' })
    await expect(
      svc.replaceInDoc(U, p.id, p.hldId, '## Goals', '## Aims', read.updatedAt)
    ).rejects.toBeInstanceOf(CtxStaleWriteError)
  })
})
