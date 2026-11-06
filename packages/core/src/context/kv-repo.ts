import { kv } from '@vercel/kv'
import type { ContextDoc, DocKind, Project, TocEntry } from './types'
import { tocEntryOf, type CtxStore, type UnitOfWork } from './repo'

// Key layout — everything for Context lives under ctx:
//   ctx:{u}:projects               set   project ids
//   ctx:{u}:project:{pid}          JSON  Project
//   ctx:{u}:project:{pid}:toc      hash  doc id → {"k":kind,"t":title,"c":createdAt}
//   ctx:{u}:doc:{did}              JSON  ContextDoc

const projectsSet = (u: string) => `ctx:${u}:projects`
const projectKey = (u: string, pid: string) => `ctx:${u}:project:${pid}`
const tocKey = (u: string, pid: string) => `ctx:${u}:project:${pid}:toc`
const docKey = (u: string, did: string) => `ctx:${u}:doc:${did}`

type TocValue = { k: DocKind; t: string; c: number }
const encodeToc = (e: TocEntry): string => JSON.stringify({ k: e.kind, t: e.title, c: e.createdAt } satisfies TocValue)

// KV may hand back hash values already parsed; accept both.
function decodeToc(id: string, raw: unknown): TocEntry {
  const v = (typeof raw === 'string' ? JSON.parse(raw) : raw) as TocValue
  return { id, kind: v.k, title: String(v.t), createdAt: Number(v.c) }
}

const asStrings = (xs: unknown[] | null) => (xs ?? []).map(String)

function begin(): UnitOfWork {
  const tx = kv.multi()
  let empty = true
  const q = (fn: () => void) => {
    empty = false
    fn()
  }
  return {
    putProject: (p) =>
      q(() => {
        tx.set(projectKey(p.userId, p.id), p)
        tx.sadd(projectsSet(p.userId), p.id)
      }),
    deleteProject: (u, pid) =>
      q(() => {
        tx.del(projectKey(u, pid), tocKey(u, pid))
        tx.srem(projectsSet(u), pid)
      }),
    putDoc: (d) =>
      q(() => {
        tx.set(docKey(d.userId, d.id), d)
        tx.hset(tocKey(d.userId, d.projectId), { [d.id]: encodeToc(tocEntryOf(d)) })
      }),
    deleteDoc: (u, pid, did) =>
      q(() => {
        tx.del(docKey(u, did))
        tx.hdel(tocKey(u, pid), did)
      }),
    async commit() {
      if (!empty) await tx.exec()
    },
  }
}

export const kvCtxStore: CtxStore = {
  projects: {
    async get(u, pid) {
      return kv.get<Project>(projectKey(u, pid))
    },
    async listIds(u) {
      return asStrings(await kv.smembers(projectsSet(u)))
    },
    async getMany(u, pids) {
      if (pids.length === 0) return []
      const rows = await kv.mget<(Project | null)[]>(...pids.map((pid) => projectKey(u, pid)))
      return rows.filter(Boolean) as Project[]
    },
    async docCounts(u, pids) {
      if (pids.length === 0) return new Map()
      const p = kv.pipeline()
      for (const pid of pids) p.hlen(tocKey(u, pid))
      const counts = (await p.exec()) as number[]
      return new Map(pids.map((pid, i) => [pid, Number(counts[i] ?? 0)]))
    },
  },
  docs: {
    async get(u, did) {
      return kv.get<ContextDoc>(docKey(u, did))
    },
    async getMany(u, dids) {
      if (dids.length === 0) return []
      const rows = await kv.mget<(ContextDoc | null)[]>(...dids.map((did) => docKey(u, did)))
      return rows.filter(Boolean) as ContextDoc[]
    },
    async toc(u, pid) {
      const h = await kv.hgetall<Record<string, unknown>>(tocKey(u, pid))
      return Object.entries(h ?? {}).map(([id, raw]) => decodeToc(id, raw))
    },
  },
  begin,
}
