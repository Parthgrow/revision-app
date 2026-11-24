import { beforeEach, describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createMemoryTrkStore } from '../tracker/repo'
import { createTrackerService, type TrackerService } from '../tracker/service'
import { registerTrackerTools, TRACKER_INSTRUCTIONS } from './tracker-tools'

const U = 'u1'
let service: TrackerService
let client: Client

beforeEach(async () => {
  service = createTrackerService(createMemoryTrkStore())
  const server = new McpServer({ name: 'test', version: '0' }, { instructions: TRACKER_INSTRUCTIONS })
  registerTrackerTools(server, { userId: U, service })
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

describe('AgentTracker MCP tools', () => {
  it('exposes the agreed tools and tells Claude how to use them', async () => {
    const { tools } = await client.listTools()
    expect(tools.map((t) => t.name).sort()).toEqual([
      'abandon_task',
      'block_task',
      'complete_task',
      'list_agents',
      'log',
      'mark_pending',
      'my_tasks',
      'resume_task',
      'start_agent',
      'start_task',
    ])
    expect(client.getInstructions()).toContain('call start_agent once')
    const block = tools.find((t) => t.name === 'block_task')!
    expect(block.inputSchema.required).toEqual(expect.arrayContaining(['agent', 'task', 'reason']))
  })

  it('runs a chat end to end: start, block, resume, complete', async () => {
    const started = await call('start_agent', { name: 'Tracker build', repo: 'revision-app' })
    const agent = started.data.agent.id
    expect(started.data.next).toContain(agent)

    const t = await call('start_task', { agent, title: 'Add tracker tools' })
    expect(t.data.task).toMatchObject({ title: 'Add tracker tools', status: 'in_progress' })

    const b = await call('block_task', { agent, task: 'add tracker tools', reason: 'Waiting on review' })
    expect(b.data.task).toMatchObject({ status: 'blocked', note: 'Waiting on review' })

    await call('resume_task', { agent, task: t.data.task.id })
    await call('log', { agent, message: 'Reviewer approved', task: t.data.task.id })
    const done = await call('complete_task', { agent, task: t.data.task.id, summary: 'Merged' })
    expect(done.data.task).toMatchObject({ status: 'done', note: 'Merged' })

    expect((await call('my_tasks', { agent })).data.count).toBe(0)
    expect((await call('my_tasks', { agent, include_closed: true })).data.count).toBe(1)

    const types = (await service.timeline(U, agent)).map((e) => e.type)
    expect(types).toEqual(['task_done', 'note', 'task_resumed', 'task_blocked', 'task_started', 'agent_started'])
  })

  it('lets a new chat find and continue an earlier agent', async () => {
    const first = await call('start_agent', { name: 'Notes search', branch: 'feature/search' })
    const agent = first.data.agent.id
    await call('start_task', { agent, title: 'Index note bodies' })
    await call('mark_pending', { agent, task: 'Index note bodies', note: 'Half the fields done' })

    const found = await call('list_agents', { query: 'search' })
    expect(found.data.agents[0]).toMatchObject({ id: agent, openTasks: 1 })
    expect(found.data.agents[0].open[0]).toMatchObject({ status: 'pending', note: 'Half the fields done' })
  })

  it('returns readable errors instead of failing', async () => {
    const noAgent = await call('start_task', { agent: 'ag_missing00', title: 'x' })
    expect(noAgent.isError).toBe(true)
    expect(noAgent.text).toMatch(/start_agent/)

    const { data } = await call('start_agent', { name: 'Errors' })
    const agent = data.agent.id
    const noTask = await call('complete_task', { agent, task: 'Nothing like this' })
    expect(noTask.isError).toBe(true)
    expect(noTask.text).toMatch(/my_tasks/)

    await call('start_task', { agent, title: 'Once' })
    await call('complete_task', { agent, task: 'Once' })
    const twice = await call('complete_task', { agent, task: 'Once' })
    expect(twice.isError).toBe(true)
    expect(twice.text).toMatch(/already done/)
  })
})
