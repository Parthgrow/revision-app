import { isOpen, type Agent, type Task, type TrackerEvent } from './types'

// Storage seams for AgentTracker. The service depends only on these;
// production uses Redis (kv-repo.ts), tests use createMemoryTrkStore().

export interface AgentRepository {
  get(userId: string, agentId: string): Promise<Agent | null>
  getMany(userId: string, agentIds: string[]): Promise<Agent[]>
  // Most recently seen first.
  listIds(userId: string, limit?: number): Promise<string[]>
  count(userId: string): Promise<number>
}

export interface TaskRepository {
  get(userId: string, taskId: string): Promise<Task | null>
  getMany(userId: string, taskIds: string[]): Promise<Task[]>
  // Newest first.
  idsForAgent(userId: string, agentId: string): Promise<string[]>
  // Open (or only blocked) tasks across agents, most recently updated first.
  openIds(userId: string, blockedOnly: boolean): Promise<string[]>
}

export interface EventRepository {
  // Newest first; `before` is exclusive.
  page(userId: string, agentId: string, opts: { before?: number; limit: number }): Promise<TrackerEvent[]>
}

// Writes queued and applied together in commit() (one MULTI), so a task, its
// agent's counters, the open/blocked indexes and the timeline never disagree.
export interface UnitOfWork {
  putAgent(agent: Agent): void // agent + agents index
  putTask(task: Task): void // task + agent's task list + open/blocked indexes by status
  addEvent(userId: string, event: TrackerEvent): void // append + trim to EVENT_CAP
  deleteAgent(userId: string, agentId: string, taskIds: string[]): void
  commit(): Promise<void>
}

export type TrkStore = {
  agents: AgentRepository
  tasks: TaskRepository
  events: EventRepository
  begin(): UnitOfWork
}

export const EVENT_CAP = 2000

// --- In-memory implementation (tests) ---

export function createMemoryTrkStore(): TrkStore {
  const agents = new Map<string, Agent>() // `${u}:${aid}`
  const tasks = new Map<string, Task>() // `${u}:${tid}`
  const events = new Map<string, TrackerEvent[]>() // `${u}:${aid}`, oldest first

  const k = (u: string, id: string) => `${u}:${id}`
  const clone = <T>(v: T): T => structuredClone(v)
  const userAgents = (u: string) => [...agents.values()].filter((a) => a.userId === u)
  const userTasks = (u: string) => [...tasks.values()].filter((t) => t.userId === u)

  return {
    agents: {
      async get(u, aid) {
        const a = agents.get(k(u, aid))
        return a ? clone(a) : null
      },
      async getMany(u, aids) {
        return aids.map((aid) => agents.get(k(u, aid))).filter(Boolean).map((a) => clone(a!))
      },
      async listIds(u, limit) {
        const ids = userAgents(u)
          .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
          .map((a) => a.id)
        return limit === undefined ? ids : ids.slice(0, limit)
      },
      async count(u) {
        return userAgents(u).length
      },
    },
    tasks: {
      async get(u, tid) {
        const t = tasks.get(k(u, tid))
        return t ? clone(t) : null
      },
      async getMany(u, tids) {
        return tids.map((tid) => tasks.get(k(u, tid))).filter(Boolean).map((t) => clone(t!))
      },
      async idsForAgent(u, aid) {
        return userTasks(u)
          .filter((t) => t.agentId === aid)
          .sort((a, b) => b.createdAt - a.createdAt)
          .map((t) => t.id)
      },
      async openIds(u, blockedOnly) {
        return userTasks(u)
          .filter((t) => (blockedOnly ? t.status === 'blocked' : isOpen(t.status)))
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map((t) => t.id)
      },
    },
    events: {
      async page(u, aid, { before, limit }) {
        return (events.get(k(u, aid)) ?? [])
          .filter((e) => before === undefined || e.at < before)
          .slice()
          .reverse()
          .slice(0, limit)
          .map(clone)
      },
    },
    begin() {
      const ops: (() => void)[] = []
      return {
        putAgent: (a) => ops.push(() => agents.set(k(a.userId, a.id), clone(a))),
        putTask: (t) => ops.push(() => tasks.set(k(t.userId, t.id), clone(t))),
        addEvent: (u, e) =>
          ops.push(() => {
            const list = events.get(k(u, e.agentId)) ?? []
            list.push(clone(e))
            events.set(k(u, e.agentId), list.slice(-EVENT_CAP))
          }),
        deleteAgent: (u, aid, tids) =>
          ops.push(() => {
            agents.delete(k(u, aid))
            events.delete(k(u, aid))
            for (const tid of tids) tasks.delete(k(u, tid))
          }),
        async commit() {
          ops.forEach((op) => op())
        },
      }
    },
  }
}
