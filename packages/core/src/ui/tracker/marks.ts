import type { EventType, TaskStatus } from '../../tracker/types'

// Shape, not colour: the paper palette has no hues to spend.
export const TASK_MARK: Record<TaskStatus, string> = {
  in_progress: '▶',
  pending: '‖',
  blocked: '■',
  done: '✓',
  abandoned: '✕',
}

export const TASK_LABEL: Record<TaskStatus, string> = {
  in_progress: 'In progress',
  pending: 'Pending',
  blocked: 'Blocked',
  done: 'Done',
  abandoned: 'Abandoned',
}

export const EVENT_MARK: Record<EventType, string> = {
  agent_started: '◆',
  renamed: '✎',
  task_started: '▶',
  task_resumed: '▶',
  task_pending: '‖',
  task_blocked: '■',
  task_done: '✓',
  task_abandoned: '✕',
  note: '·',
}

export const EVENT_LABEL: Record<EventType, string> = {
  agent_started: 'Agent started',
  renamed: 'Renamed',
  task_started: 'Started',
  task_resumed: 'Resumed',
  task_pending: 'Pending',
  task_blocked: 'Blocked',
  task_done: 'Done',
  task_abandoned: 'Abandoned',
  note: 'Note',
}

export const clock = (ts: number) =>
  new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })

export const day = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
