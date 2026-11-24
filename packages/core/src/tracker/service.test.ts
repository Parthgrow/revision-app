import { beforeEach, describe, expect, it } from 'vitest'
import { TrkNotFoundError, TrkTransitionError, TrkValidationError } from './errors'
import { createMemoryTrkStore, EVENT_CAP, type TrkStore } from './repo'
import { createTrackerService, TRK_LIMITS, type TrackerService } from './service'
import { isActive, isStalled, type TaskStatus } from './types'

const U = 'u1'
let store: TrkStore
let svc: TrackerService
let clock: number

beforeEach(() => {
  clock = 1_000_000
  store = createMemoryTrkStore()
  svc = createTrackerService(store, () => clock)
})

async function agentWithTask(title = 'Add tracker service') {
  const agent = await svc.startAgent(U, { name: 'Tracker build', repo: 'revision-app', branch: 'feature/x' })
  const task = await svc.startTask(U, agent.id, title)
  return { agent, task }
}

describe('agents', () => {
  it('starts an agent with a timeline entry', async () => {
    const a = await svc.startAgent(U, { name: '  Monorepo   split ', repo: 'revision-app' })
    expect(a.id).toMatch(/^ag_[A-Za-z0-9]{10}$/)
    expect(a.name).toBe('Monorepo split')
    expect(a).toMatchObject({ openTasks: 0, blockedTasks: 0, startedAt: clock, lastSeenAt: clock })
    const tl = await svc.timeline(U, a.id)
    expect(tl).toEqual([expect.objectContaining({ type: 'agent_started', source: 'agent', text: 'revision-app' })])
  })

  it('requires a name and caps long ones', async () => {
    await expect(svc.startAgent(U, { name: '  ' })).rejects.toBeInstanceOf(TrkValidationError)
    const a = await svc.startAgent(U, { name: 'x'.repeat(200) })
    expect(a.name).toHaveLength(TRK_LIMITS.name)
    expect(a.name.endsWith('…')).toBe(true)
  })

  it('rejects unknown or malformed agent ids with a hint', async () => {
    await expect(svc.startTask(U, 'nope', 'x')).rejects.toThrow(/start_agent/)
    await expect(svc.startTask(U, 'ag_0123456789', 'x')).rejects.toBeInstanceOf(TrkNotFoundError)
    const a = await svc.startAgent(U, { name: 'mine' })
    await expect(svc.startTask('someone-else', a.id, 'x')).rejects.toBeInstanceOf(TrkNotFoundError)
  })

  it('finds agents by name, repo or branch, with their open tasks', async () => {
    const { agent } = await agentWithTask()
    clock += 10
    await svc.startAgent(U, { name: 'Notes search', repo: 'mindgym' })
    expect((await svc.findAgents(U)).map((a) => a.name)).toEqual(['Notes search', 'Tracker build'])
    const hits = await svc.findAgents(U, 'FEATURE/')
    expect(hits.map((a) => a.id)).toEqual([agent.id])
    expect(hits[0].open.map((t) => t.title)).toEqual(['Add tracker service'])
    expect(await svc.findAgents(U, 'nothing')).toEqual([])
  })

  it('lists agents most recently active first', async () => {
    const a = await svc.startAgent(U, { name: 'A' })
    clock += 10
    await svc.startAgent(U, { name: 'B' })
    clock += 10
    await svc.startTask(U, a.id, 'later work')
    expect((await svc.listAgents(U)).map((x) => x.name)).toEqual(['A', 'B'])
  })

  it('renames from the UI without counting as activity', async () => {
    const a = await svc.startAgent(U, { name: 'Old' })
    clock += 60_000
    const r = await svc.renameAgent(U, a.id, 'New')
    expect(r.name).toBe('New')
    expect(r.lastSeenAt).toBe(a.lastSeenAt)
    const [last] = await svc.timeline(U, a.id)
    expect(last).toMatchObject({ type: 'renamed', source: 'user', text: 'Old → New' })
  })

  it('deletes an agent with its tasks, timeline and index entries', async () => {
    const { agent, task } = await agentWithTask()
    await svc.transition(U, agent.id, task.id, 'blocked', 'needs access')
    await svc.deleteAgent(U, agent.id)
    expect(await svc.listAgents(U)).toEqual([])
    expect(await svc.openTasks(U)).toEqual([])
    expect(await store.tasks.get(U, task.id)).toBeNull()
    expect(await store.events.page(U, agent.id, { limit: 10 })).toEqual([])
  })
})

describe('tasks', () => {
  it('starts a task in progress and counts it open', async () => {
    const { agent, task } = await agentWithTask()
    expect(task).toMatchObject({ status: 'in_progress', title: 'Add tracker service', agentId: agent.id })
    expect((await svc.getAgent(U, agent.id)).openTasks).toBe(1)
    expect((await svc.openTasks(U)).map((t) => [t.title, t.agentName])).toEqual([['Add tracker service', 'Tracker build']])
  })

  const allowed: [TaskStatus, TaskStatus][] = [
    ['in_progress', 'pending'],
    ['in_progress', 'blocked'],
    ['in_progress', 'done'],
    ['in_progress', 'abandoned'],
    ['pending', 'in_progress'],
    ['pending', 'blocked'],
    ['pending', 'done'],
    ['pending', 'abandoned'],
    ['blocked', 'in_progress'],
    ['blocked', 'pending'],
    ['blocked', 'blocked'],
    ['blocked', 'done'],
    ['blocked', 'abandoned'],
  ]

  it.each(allowed)('allows %s → %s and keeps counters right', async (from, to) => {
    const { agent, task } = await agentWithTask()
    if (from !== 'in_progress') await svc.transition(U, agent.id, task.id, from, 'why')
    const t = await svc.transition(U, agent.id, task.id, to, 'note')
    expect(t.status).toBe(to)
    const a = await svc.getAgent(U, agent.id)
    const open = ['in_progress', 'pending', 'blocked'].includes(to)
    expect(a.openTasks).toBe(open ? 1 : 0)
    expect(a.blockedTasks).toBe(to === 'blocked' ? 1 : 0)
    expect((await svc.openTasks(U)).length).toBe(open ? 1 : 0)
    expect((await svc.openTasks(U, { blockedOnly: true })).length).toBe(to === 'blocked' ? 1 : 0)
    expect(t.closedAt !== undefined).toBe(!open)
  })

  it.each([
    ['in_progress', 'in_progress'],
    ['pending', 'pending'],
    ['done', 'in_progress'],
    ['done', 'done'],
    ['abandoned', 'pending'],
  ] as [TaskStatus, TaskStatus][])('refuses %s → %s', async (from, to) => {
    const { agent, task } = await agentWithTask()
    if (from !== 'in_progress') await svc.transition(U, agent.id, task.id, from)
    await expect(svc.transition(U, agent.id, task.id, to, 'x')).rejects.toBeInstanceOf(TrkTransitionError)
  })

  it('needs a reason to block, and resuming clears the note', async () => {
    const { agent, task } = await agentWithTask()
    await expect(svc.transition(U, agent.id, task.id, 'blocked')).rejects.toThrow(/why/)
    const b = await svc.transition(U, agent.id, task.id, 'blocked', 'No Vercel access')
    expect(b.note).toBe('No Vercel access')
    const r = await svc.transition(U, agent.id, task.id, 'in_progress')
    expect(r.note).toBeUndefined()
    const done = await svc.transition(U, agent.id, task.id, 'done', 'Shipped\nwith tests')
    expect(done.note).toBe('Shipped\nwith tests')
  })

  it('finds a task by title, preferring open ones, and reports ambiguity', async () => {
    const { agent, task } = await agentWithTask('Write tests')
    await svc.transition(U, agent.id, task.id, 'done')
    const again = await svc.startTask(U, agent.id, 'Write tests')
    expect((await svc.transition(U, agent.id, 'write TESTS', 'pending')).id).toBe(again.id)
    await svc.startTask(U, agent.id, 'Write tests')
    await expect(svc.transition(U, agent.id, 'Write tests', 'done')).rejects.toThrow(/2 tasks are titled/)
    await expect(svc.transition(U, agent.id, 'Unknown', 'done')).rejects.toThrow(/my_tasks/)
  })

  it("can't touch another agent's task", async () => {
    const { task } = await agentWithTask()
    const other = await svc.startAgent(U, { name: 'Other' })
    await expect(svc.transition(U, other.id, task.id, 'done')).rejects.toBeInstanceOf(TrkNotFoundError)
  })

  it('lists open tasks newest first, closed ones on request', async () => {
    const { agent, task } = await agentWithTask('First')
    clock += 5
    await svc.startTask(U, agent.id, 'Second')
    await svc.transition(U, agent.id, task.id, 'done')
    expect((await svc.listTasks(U, agent.id)).map((t) => t.title)).toEqual(['Second'])
    expect((await svc.listTasks(U, agent.id, { includeClosed: true })).map((t) => t.title)).toEqual(['Second', 'First'])
  })

  it('caps tasks per agent', async () => {
    const a = await svc.startAgent(U, { name: 'Busy' })
    for (let i = 0; i < TRK_LIMITS.tasksPerAgent; i++) await svc.startTask(U, a.id, `t${i}`)
    await expect(svc.startTask(U, a.id, 'one more')).rejects.toBeInstanceOf(TrkValidationError)
  })
})

describe('timeline', () => {
  it('records each step in order, newest first, even within the same millisecond', async () => {
    const { agent, task } = await agentWithTask()
    await svc.logNote(U, agent.id, 'Using the Context store pattern', task.id)
    await svc.transition(U, agent.id, task.id, 'blocked', 'Redis down')
    await svc.transition(U, agent.id, task.id, 'in_progress')
    await svc.transition(U, agent.id, task.id, 'done', 'All green')
    const tl = await svc.timeline(U, agent.id)
    expect(tl.map((e) => e.type)).toEqual([
      'task_done',
      'task_resumed',
      'task_blocked',
      'note',
      'task_started',
      'agent_started',
    ])
    expect(tl[0]).toMatchObject({ taskId: task.id, taskTitle: 'Add tracker service', text: 'All green' })
    const times = tl.map((e) => e.at)
    expect([...times].sort((a, b) => b - a)).toEqual(times)
    expect(new Set(times).size).toBe(times.length)
  })

  it('pages with before', async () => {
    const a = await svc.startAgent(U, { name: 'Pager' })
    for (let i = 0; i < 5; i++) await svc.logNote(U, a.id, `n${i}`)
    const first = await svc.timeline(U, a.id, { limit: 2 })
    expect(first.map((e) => e.text)).toEqual(['n4', 'n3'])
    const next = await svc.timeline(U, a.id, { before: first[1].at, limit: 2 })
    expect(next.map((e) => e.text)).toEqual(['n2', 'n1'])
  })

  it('keeps only the newest events', async () => {
    const a = await svc.startAgent(U, { name: 'Chatty' })
    const writes = EVENT_CAP + 5
    const uow = store.begin()
    for (let i = 0; i < writes; i++) {
      uow.addEvent(U, { id: `e${i}`, agentId: a.id, source: 'agent', type: 'note', text: `n${i}`, at: a.startedAt + 1 + i })
    }
    await uow.commit()
    const newest = await svc.timeline(U, a.id, { limit: 1 })
    expect(newest[0].text).toBe(`n${writes - 1}`)
    const all = await store.events.page(U, a.id, { limit: EVENT_CAP + 100 })
    expect(all).toHaveLength(EVENT_CAP)
  })

  it('trims long notes instead of refusing them', async () => {
    const a = await svc.startAgent(U, { name: 'Verbose' })
    const e = await svc.logNote(U, a.id, 'y'.repeat(5000))
    expect(e.text).toHaveLength(TRK_LIMITS.text)
  })
})

describe('derived state', () => {
  it('active for 30 minutes after the last report; stalled after 6 hours', async () => {
    const { agent, task } = await agentWithTask()
    expect(isActive(agent, clock + 29 * 60_000)).toBe(true)
    expect(isActive(agent, clock + 31 * 60_000)).toBe(false)
    expect(isStalled(task, agent, clock + 5 * 3600_000)).toBe(false)
    expect(isStalled(task, agent, clock + 6 * 3600_000)).toBe(true)
    expect(isStalled({ status: 'blocked' }, agent, clock + 9 * 3600_000)).toBe(false)
  })
})
