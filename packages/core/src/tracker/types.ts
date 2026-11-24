// AgentTracker: a timeline of what each Claude Code chat ("agent") is doing.
// v1 is tools only — Claude reports through the connector.

export type TaskStatus = 'in_progress' | 'pending' | 'blocked' | 'done' | 'abandoned'

export const OPEN_STATUSES: readonly TaskStatus[] = ['in_progress', 'pending', 'blocked']
export const isOpen = (s: TaskStatus) => OPEN_STATUSES.includes(s)

export type Agent = {
  id: string // "ag_" + 10 chars, issued by start_agent
  userId: string
  name: string
  repo?: string
  branch?: string
  sessionId?: string // reserved for hooks later
  openTasks: number // in_progress + pending + blocked
  blockedTasks: number
  startedAt: number
  lastSeenAt: number // last thing Claude reported; drives "active" / "stalled"
  lastEventAt: number // last timeline entry from anyone; keeps event order strict
}

export type Task = {
  id: string // "tk_" + 10 chars
  userId: string
  agentId: string
  title: string
  status: TaskStatus
  note?: string // latest summary / blocker / pending note
  createdAt: number
  updatedAt: number
  closedAt?: number // done / abandoned
}

export type EventType =
  | 'agent_started'
  | 'renamed'
  | 'task_started'
  | 'task_done'
  | 'task_blocked'
  | 'task_pending'
  | 'task_resumed'
  | 'task_abandoned'
  | 'note'

export type TrackerEvent = {
  id: string
  agentId: string
  taskId?: string
  taskTitle?: string // copied so the timeline reads without loading tasks
  source: 'agent' | 'user'
  type: EventType
  text?: string
  at: number // server time, strictly increasing per agent
}

export type StartAgentInput = { name: string; repo?: string; branch?: string }

export type OpenTask = Task & { agentName: string }

// Derived, never stored.
export const ACTIVE_WINDOW_MS = 30 * 60_000
export const STALL_AFTER_MS = 6 * 60 * 60_000
export const isActive = (a: Pick<Agent, 'lastSeenAt'>, now: number) => now - a.lastSeenAt < ACTIVE_WINDOW_MS
export const isStalled = (t: Pick<Task, 'status'>, a: Pick<Agent, 'lastSeenAt'>, now: number) =>
  t.status === 'in_progress' && now - a.lastSeenAt >= STALL_AFTER_MS
