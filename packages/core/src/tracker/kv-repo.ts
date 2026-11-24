import { kv } from '@vercel/kv'
import { EVENT_CAP, type TrkStore, type UnitOfWork } from './repo'
import { isOpen, type Agent, type Task, type TrackerEvent } from './types'

// Key layout — everything for AgentTracker lives under at:
//   at:{u}:agents               zset  agent id, score lastSeenAt
//   at:{u}:agent:{aid}          JSON  Agent
//   at:{u}:agent:{aid}:events   zset  JSON TrackerEvent, score at
//   at:{u}:agent:{aid}:tasks    zset  task id, score createdAt
//   at:{u}:task:{tid}           JSON  Task
//   at:{u}:open                 zset  task id, score updatedAt (in progress / pending / blocked)
//   at:{u}:blocked              zset  task id, score updatedAt

const agentsKey = (u: string) => `at:${u}:agents`
const agentKey = (u: string, aid: string) => `at:${u}:agent:${aid}`
const eventsKey = (u: string, aid: string) => `at:${u}:agent:${aid}:events`
const agentTasksKey = (u: string, aid: string) => `at:${u}:agent:${aid}:tasks`
const taskKey = (u: string, tid: string) => `at:${u}:task:${tid}`
const openKey = (u: string) => `at:${u}:open`
const blockedKey = (u: string) => `at:${u}:blocked`

const asStrings = (xs: unknown[] | null) => (xs ?? []).map(String)

// KV may hand back members already parsed; accept both.
const asEvent = (raw: unknown): TrackerEvent => (typeof raw === 'string' ? JSON.parse(raw) : raw) as TrackerEvent

async function many<T>(keys: string[]): Promise<T[]> {
  if (keys.length === 0) return []
  const rows = await kv.mget<(T | null)[]>(...keys)
  return rows.filter(Boolean) as T[]
}

function begin(): UnitOfWork {
  const tx = kv.multi()
  let empty = true
  const q = (fn: () => void) => {
    empty = false
    fn()
  }
  return {
    putAgent: (a) =>
      q(() => {
        tx.set(agentKey(a.userId, a.id), a)
        tx.zadd(agentsKey(a.userId), { score: a.lastSeenAt, member: a.id })
      }),
    putTask: (t) =>
      q(() => {
        const u = t.userId
        tx.set(taskKey(u, t.id), t)
        tx.zadd(agentTasksKey(u, t.agentId), { score: t.createdAt, member: t.id })
        if (isOpen(t.status)) tx.zadd(openKey(u), { score: t.updatedAt, member: t.id })
        else tx.zrem(openKey(u), t.id)
        if (t.status === 'blocked') tx.zadd(blockedKey(u), { score: t.updatedAt, member: t.id })
        else tx.zrem(blockedKey(u), t.id)
      }),
    addEvent: (u, e) =>
      q(() => {
        tx.zadd(eventsKey(u, e.agentId), { score: e.at, member: JSON.stringify(e) })
        tx.zremrangebyrank(eventsKey(u, e.agentId), 0, -(EVENT_CAP + 1))
      }),
    deleteAgent: (u, aid, tids) =>
      q(() => {
        tx.del(agentKey(u, aid), eventsKey(u, aid), agentTasksKey(u, aid), ...tids.map((tid) => taskKey(u, tid)))
        tx.zrem(agentsKey(u), aid)
        if (tids.length) {
          tx.zrem(openKey(u), ...tids)
          tx.zrem(blockedKey(u), ...tids)
        }
      }),
    async commit() {
      if (!empty) await tx.exec()
    },
  }
}

export const kvTrkStore: TrkStore = {
  agents: {
    async get(u, aid) {
      return kv.get<Agent>(agentKey(u, aid))
    },
    async getMany(u, aids) {
      return many<Agent>(aids.map((aid) => agentKey(u, aid)))
    },
    async listIds(u, limit) {
      const end = limit === undefined ? -1 : limit - 1
      return asStrings(await kv.zrange(agentsKey(u), 0, end, { rev: true }))
    },
    async count(u) {
      return kv.zcard(agentsKey(u))
    },
  },
  tasks: {
    async get(u, tid) {
      return kv.get<Task>(taskKey(u, tid))
    },
    async getMany(u, tids) {
      return many<Task>(tids.map((tid) => taskKey(u, tid)))
    },
    async idsForAgent(u, aid) {
      return asStrings(await kv.zrange(agentTasksKey(u, aid), 0, -1, { rev: true }))
    },
    async openIds(u, blockedOnly) {
      return asStrings(await kv.zrange(blockedOnly ? blockedKey(u) : openKey(u), 0, -1, { rev: true }))
    },
  },
  events: {
    async page(u, aid, { before, limit }) {
      // With REV + BYSCORE, Redis takes max first, then min.
      const max = before === undefined ? '+inf' : (`(${before}` as const)
      const rows = await kv.zrange(eventsKey(u, aid), max, '-inf', {
        byScore: true,
        rev: true,
        offset: 0,
        count: limit,
      })
      return (rows as unknown[]).map(asEvent)
    },
  },
  begin,
}
