import { beforeEach, describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createMemoryCtxStore, type CtxStore } from '@/lib/context/repo'
import { createContextService, type ContextService } from '@/lib/context/service'
import { registerContextTools } from './tools'

const U = 'u1'
let store: CtxStore
let service: ContextService
let client: Client

// A real MCP client talking to the tools over an in-memory transport.
beforeEach(async () => {
  store = createMemoryCtxStore()
  service = createContextService(store)
  const server = new McpServer({ name: 'test', version: '0' })
  registerContextTools(server, { userId: U, service, appUrl: 'https://app.test' })
  const [a, b] = InMemoryTransport.createLinkedPair()
  client = new Client({ name: 'test-client', version: '0' })
  await Promise.all([server.connect(a), client.connect(b)])
})

async function call(name: string, args: Record<string, unknown> = {}) {
  const res = (await client.callTool({ name, arguments: args })) as {
    content: { type: string; text: string }[]
    isError?: boolean
  }
  const text = res.content[0].text
  return { isError: !!res.isError, text, data: res.isError ? null : JSON.parse(text) }
}

describe('Context MCP tools', () => {
  it('exposes the agreed tools and no delete tools', async () => {
    const { tools } = await client.listTools()
    expect(tools.map((t) => t.name).sort()).toEqual([
      'create_lld',
      'create_project',
      'edit_document',
      'get_project',
      'list_projects',
      'read_document',
      'rename_lld',
      'update_document',
    ])
    expect(tools.find((t) => t.name === 'read_document')?.annotations?.readOnlyHint).toBe(true)
  })

  it('creates a project, adds an LLD and reads it by name', async () => {
    const created = await call('create_project', { name: 'MindGym', description: 'notes app' })
    expect(created.data.documents.map((d: { kind: string }) => d.kind)).toEqual(['schema', 'hld'])

    await call('create_lld', { project: 'mindgym', title: 'Graph view', body: '## Flow\n```\n┌──┐\n└──┘\n```' })
    const proj = await call('get_project', { project: 'MindGym' })
    expect(proj.data.documents.map((d: { title: string }) => d.title)).toEqual(['Database schema', 'HLD', 'Graph view'])

    const read = await call('read_document', { project: 'MindGym', document: 'graph view' })
    expect(read.data.document.body).toContain('┌──┐')
    expect(read.data.document.url).toMatch(/^https:\/\/app\.test\/context\/\w+\/\w+$/)
  })

  it('edits one passage and protects edits made since the read', async () => {
    await call('create_project', { name: 'A' })
    const read = await call('read_document', { project: 'A', document: 'hld' })
    const edited = await call('edit_document', {
      project: 'A',
      document: 'hld',
      old_text: '## Non-goals\n-',
      new_text: '## Non-goals\n- Collaboration',
      expected_updated_at: read.data.document.updatedAt,
    })
    expect(edited.isError).toBe(false)

    // The read is now stale: a second edit with it is refused, not applied.
    const stale = await call('update_document', {
      project: 'A',
      document: 'hld',
      body: 'overwrite',
      expected_updated_at: read.data.document.updatedAt,
    })
    expect(stale.isError).toBe(true)
    expect(stale.text).toMatch(/changed since you read it/)
    const now = await call('read_document', { project: 'A', document: 'hld' })
    expect(now.data.document.body).toContain('- Collaboration')
  })

  it('returns readable errors for bad references and fixed titles', async () => {
    await call('create_project', { name: 'A' })
    expect((await call('read_document', { project: 'Nope', document: 'hld' })).text).toMatch(/Project “Nope” not found/)
    expect((await call('read_document', { project: 'A', document: 'Auth' })).text).toMatch(/Document “Auth” in A not found/)
    const rename = await call('rename_lld', { project: 'A', document: 'hld', new_title: 'X' })
    expect(rename.isError).toBe(true)
    expect(rename.text).toMatch(/titles are fixed/)
  })

  it('renames an LLD', async () => {
    await call('create_project', { name: 'A' })
    await call('create_lld', { project: 'A', title: 'Old' })
    await call('rename_lld', { project: 'A', document: 'Old', new_title: 'New' })
    const list = await call('get_project', { project: 'A' })
    expect(list.data.documents[2].title).toBe('New')
  })
})
