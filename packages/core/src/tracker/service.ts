import { customAlphabet } from 'nanoid'
import { TrkNotFoundError, TrkTransitionError, TrkValidationError } from './errors'
import type { TrkStore } from './repo'
import {
  isOpen,
  type Agent,
  type EventType,
  type OpenTask,
  type StartAgentInput,
  type Task,
  type TaskStatus,
  type TrackerEvent,
} from './types'

export const TRK_LIMITS = {
  name: 80,
  repo: 120,
  title: 120,
  text: 2000,
  agents: 1000,
  tasksPerAgent: 200,
  page: 100,
  found: 10,
} as const

const alnum = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 10)
export const newAgentId = () => `ag_${alnum()}`
export const newTaskId = () => `tk_${alnum()}`
const AGENT_ID = /^ag_[A-Za-z0-9]{10}$/
const TASK_ID = /^tk_[A-Za-z0-9]{10}$/

const EVENT_FOR: Record<TaskStatus, EventType> = {
  in_progress: 'task_resumed',
  pending: 'task_pending',
  blocked: 'task_blocked',
  done: 'task_done',
  abandoned: 'task_abandoned',
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  in_progress: 'in progress',
  pending: 'pending',
  blocked: 'blocked',
  done: 'done',
  abandoned: 'abandoned',
}

// Long text is shortened rather than refused: a tool call should never fail
// because Claude wrote a long summary.
function clip(v: string, max: number): string {
  return v.length > max ? v.slice(0, max - 1).trimEnd() + '…' : v
}

function required(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || !value.trim()) throw new TrkValidationError(`${field} is required`)
  return clip(value.trim().replace(/\s+/g, ' '), max)
}

function optional(value: unknown, field: string, max: number, keepLines = false): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') throw new TrkValidationError(`${field} must be text`)
  const v = keepLines ? value.replace(/\r\n?/g, '\n').trim() : value.trim().replace(/\s+/g, ' ')
  return v ? clip(v, max) : undefined
}

const agentNotFound = (ref: unknown) =>
  new TrkNotFoundError(
    `Agent “${String(ref ?? '')}” not found. Call start_agent to register this chat, or list_agents to find its id.`
  )

// Counters and indexes are read-modify-write without a lock. That is fine for
// one chat reporting its own work in sequence; two chats never share an agent.
export function createTrackerService(store: TrkStore, now: () => number = Date.now) {
  const { agents, tasks, events } = store

  async function requireAgent(userId: string, agentId: unknown): Promise<Agent> {
    const id = typeof agentId === 'string' ? agentId.trim() : ''
    if (!AGENT_ID.test(id)) throw agentNotFound(agentId)
    const a = await agents.get(userId, id)
    if (!a) throw agentNotFound(id)
    return a
  }

  // Timeline time: server clock, strictly increasing per agent. Only Claude's
  // own reports count as activity.
  function stamp(agent: Agent, source: TrackerEvent['source']): number {
    const at = Math.max(now(), agent.lastEventAt + 1)
    agent.lastEventAt = at
    if (source === 'agent') agent.lastSeenAt = at
    return at
  }

  function event(
    agent: Agent,
    at: number,
    type: EventType,
    source: TrackerEvent['source'],
    extra: Partial<Pick<TrackerEvent, 'text'>> & { task?: Task } = {}
  ): TrackerEvent {
    return {
      id: alnum(),
      agentId: agent.id,
      ...(extra.task && { taskId: extra.task.id, taskTitle: extra.task.title }),
      source,
      type,
      ...(extra.text && { text: extra.text }),
      at,
    }
  }

  async function agentTasks(userId: string, agentId: string): Promise<Task[]> {
    return tasks.getMany(userId, await tasks.idsForAgent(userId, agentId))
  }

  // A task of this agent by id, or by title (case-insensitive, open tasks first).
  async function resolveTask(userId: string, agent: Agent, ref: unknown): Promise<Task> {
    const key = typeof ref === 'string' ? ref.trim() : ''
    if (!key) throw new TrkValidationError('Name a task (its id or title)')
    if (TASK_ID.test(key)) {
      const t = await tasks.get(userId, key)
      if (t && t.agentId === agent.id) return t
      throw new TrkNotFoundError(`Task ${key} not found for this agent. Call my_tasks to see its tasks.`)
    }
    const lower = key.toLowerCase()
    const matches = (await agentTasks(userId, agent.id)).filter((t) => t.title.toLowerCase() === lower)
    const open = matches.filter((t) => isOpen(t.status))
    const pick = open.length > 0 ? open : matches
    if (pick.length === 1) return pick[0]
    if (pick.length > 1) {
      throw new TrkValidationError(
        `${pick.length} tasks are titled “${key}”. Use an id: ${pick.map((t) => t.id).join(', ')}`
      )
    }
    throw new TrkNotFoundError(`No task titled “${key}” for this agent. Call my_tasks to see its tasks.`)
  }

  async function withOpenTasks(userId: string, list: Agent[]) {
    return Promise.all(
      list.map(async (a) => ({ ...a, open: (await agentTasks(userId, a.id)).filter((t) => isOpen(t.status)) }))
    )
  }

  const service = {
    async startAgent(userId: string, input: StartAgentInput): Promise<Agent> {
      const name = required(input?.name, 'name', TRK_LIMITS.name)
      const repo = optional(input?.repo, 'repo', TRK_LIMITS.repo)
      const branch = optional(input?.branch, 'branch', TRK_LIMITS.repo)
      if ((await agents.count(userId)) >= TRK_LIMITS.agents) {
        throw new TrkValidationError(
          `You have ${TRK_LIMITS.agents} agents, the maximum. Delete old ones in ContextMagic under Agents.`
        )
      }
      const t = now()
      const agent: Agent = {
        id: newAgentId(),
        userId,
        name,
        ...(repo && { repo }),
        ...(branch && { branch }),
        openTasks: 0,
        blockedTasks: 0,
        startedAt: t,
        lastSeenAt: t,
        lastEventAt: t,
      }
      const where = [repo, branch].filter(Boolean).join(' · ')
      const uow = store.begin()
      uow.putAgent(agent)
      uow.addEvent(userId, event(agent, t, 'agent_started', 'agent', { text: where || undefined }))
      await uow.commit()
      return agent
    },

    // Up to 10 recent agents, optionally matching name / repo / branch, each
    // with its open tasks — for finding a lost id or continuing old work.
    async findAgents(userId: string, query?: string) {
      const q = typeof query === 'string' ? query.trim().toLowerCase() : ''
      const all = await agents.getMany(userId, await agents.listIds(userId, q ? undefined : TRK_LIMITS.found))
      const hits = q
        ? all.filter((a) => [a.name, a.repo, a.branch].some((f) => f?.toLowerCase().includes(q)))
        : all
      return withOpenTasks(userId, hits.slice(0, TRK_LIMITS.found))
    },

    async startTask(userId: string, agentId: string, title: unknown): Promise<Task> {
      const agent = await requireAgent(userId, agentId)
      const clean = required(title, 'title', TRK_LIMITS.title)
      if ((await tasks.idsForAgent(userId, agent.id)).length >= TRK_LIMITS.tasksPerAgent) {
        throw new TrkValidationError(
          `This agent has ${TRK_LIMITS.tasksPerAgent} tasks, the maximum. Start a new agent with start_agent.`
        )
      }
      const at = stamp(agent, 'agent')
      const task: Task = {
        id: newTaskId(),
        userId,
        agentId: agent.id,
        title: clean,
        status: 'in_progress',
        createdAt: at,
        updatedAt: at,
      }
      agent.openTasks += 1
      const uow = store.begin()
      uow.putTask(task)
      uow.putAgent(agent)
      uow.addEvent(userId, event(agent, at, 'task_started', 'agent', { task }))
      await uow.commit()
      return task
    },

    // Moves a task along the state machine (LLD §7). `note` is the summary,
    // blocker reason or pending note; resuming clears it.
    async transition(userId: string, agentId: string, ref: unknown, to: TaskStatus, note?: unknown): Promise<Task> {
      const agent = await requireAgent(userId, agentId)
      const task = await resolveTask(userId, agent, ref)
      const from = task.status
      if (!isOpen(from)) throw new TrkTransitionError(`Task “${task.title}” is already ${STATUS_LABEL[from]}`)
      if (from === to && to !== 'blocked') {
        throw new TrkTransitionError(`Task “${task.title}” is already ${STATUS_LABEL[from]}`)
      }
      const text = optional(note, 'note', TRK_LIMITS.text, true)
      if (to === 'blocked' && !text) throw new TrkValidationError('Say why the task is blocked (reason)')

      const at = stamp(agent, 'agent')
      if (!isOpen(to)) agent.openTasks = Math.max(0, agent.openTasks - 1)
      if (from === 'blocked') agent.blockedTasks = Math.max(0, agent.blockedTasks - 1)
      if (to === 'blocked') agent.blockedTasks += 1

      const updated: Task = { ...task, status: to, updatedAt: at }
      if (to !== 'in_progress' && text) updated.note = text
      else delete updated.note
      if (!isOpen(to)) updated.closedAt = at

      const uow = store.begin()
      uow.putTask(updated)
      uow.putAgent(agent)
      uow.addEvent(userId, event(agent, at, EVENT_FOR[to], 'agent', { task: updated, text }))
      await uow.commit()
      return updated
    },

    async logNote(userId: string, agentId: string, message: unknown, taskRef?: unknown): Promise<TrackerEvent> {
      const agent = await requireAgent(userId, agentId)
      const text = optional(message, 'message', TRK_LIMITS.text, true)
      if (!text) throw new TrkValidationError('message is required')
      const task =
        taskRef === undefined || taskRef === null || taskRef === '' ? undefined : await resolveTask(userId, agent, taskRef)
      const at = stamp(agent, 'agent')
      const e = event(agent, at, 'note', 'agent', { task, text })
      const uow = store.begin()
      uow.putAgent(agent)
      uow.addEvent(userId, e)
      await uow.commit()
      return e
    },

    // Newest first; open tasks only unless includeClosed.
    async listTasks(userId: string, agentId: string, { includeClosed = false } = {}): Promise<Task[]> {
      const agent = await requireAgent(userId, agentId)
      const list = await agentTasks(userId, agent.id)
      return includeClosed ? list : list.filter((t) => isOpen(t.status))
    },

    // --- web UI ---

    async listAgents(userId: string): Promise<Agent[]> {
      return agents.getMany(userId, await agents.listIds(userId))
    },

    async getAgent(userId: string, agentId: string): Promise<Agent> {
      return requireAgent(userId, agentId)
    },

    async timeline(userId: string, agentId: string, opts: { before?: number; limit?: number } = {}) {
      const agent = await requireAgent(userId, agentId)
      const limit = Math.min(Math.max(1, Math.floor(opts.limit ?? TRK_LIMITS.page)), TRK_LIMITS.page)
      const before = Number.isFinite(opts.before) ? opts.before : undefined
      return events.page(userId, agent.id, { before, limit })
    },

    // Open tasks across agents (or only blocked ones), most recently updated first.
    async openTasks(userId: string, { blockedOnly = false } = {}): Promise<OpenTask[]> {
      const list = await tasks.getMany(userId, await tasks.openIds(userId, blockedOnly))
      const owners = await agents.getMany(userId, [...new Set(list.map((t) => t.agentId))])
      const names = new Map(owners.map((a) => [a.id, a.name]))
      return list.filter((t) => names.has(t.agentId)).map((t) => ({ ...t, agentName: names.get(t.agentId)! }))
    },

    async renameAgent(userId: string, agentId: string, name: unknown): Promise<Agent> {
      const agent = await requireAgent(userId, agentId)
      const clean = required(name, 'name', TRK_LIMITS.name)
      if (clean === agent.name) return agent
      const at = stamp(agent, 'user')
      const old = agent.name
      agent.name = clean
      const uow = store.begin()
      uow.putAgent(agent)
      uow.addEvent(userId, event(agent, at, 'renamed', 'user', { text: `${old} → ${clean}` }))
      await uow.commit()
      return agent
    },

    // Removes the agent with its tasks and timeline.
    async deleteAgent(userId: string, agentId: string): Promise<void> {
      const agent = await requireAgent(userId, agentId)
      const ids = await tasks.idsForAgent(userId, agent.id)
      const uow = store.begin()
      uow.deleteAgent(userId, agent.id, ids)
      await uow.commit()
    },
  }
  return service
}

export type TrackerService = ReturnType<typeof createTrackerService>
