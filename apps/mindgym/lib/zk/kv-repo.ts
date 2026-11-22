import { kv } from '@vercel/kv'
import type { GraphEntry, Note, Source } from './types'
import { toGraphEntry } from './graph'
import type { ZkStore, UnitOfWork } from './repo'

// Key layout (alongside the existing user:/item:/mp: keys):
//   note:{u}:{id}                   Note JSON
//   user:{u}:notes                  set of note ids
//   note:{u}:{id}:backlinks         set of ids linking to {id}
//   user:{u}:zk-addr                hash address → note id
//   user:{u}:zk-addr-next:{parent}  counter of children issued under parent
//   source:{u}:{id}                 Source JSON
//   user:{u}:sources                set of source ids
//   source:{u}:{id}:notes           set of literature note ids citing it
//   user:{u}:zk-graph               hash note id → GraphEntry (derived)

const noteKey = (u: string, id: string) => `note:${u}:${id}`
const notesSet = (u: string) => `user:${u}:notes`
const backlinksKey = (u: string, id: string) => `note:${u}:${id}:backlinks`
const addrHash = (u: string) => `user:${u}:zk-addr`
const addrCounter = (u: string, parent: string | null) => `user:${u}:zk-addr-next:${parent ?? ''}`
const sourceKey = (u: string, id: string) => `source:${u}:${id}`
const sourcesSet = (u: string) => `user:${u}:sources`
const sourceNotesKey = (u: string, id: string) => `source:${u}:${id}:notes`
const graphHash = (u: string) => `user:${u}:zk-graph`

async function mgetNotes(userId: string, ids: string[]): Promise<Note[]> {
  if (ids.length === 0) return []
  const rows = await kv.mget<(Note | null)[]>(...ids.map((id) => noteKey(userId, id)))
  return rows.filter(Boolean) as Note[]
}

// KV deserialises values that look numeric, so ids read back from sets and
// hashes are coerced to strings.
const asStrings = (xs: unknown[] | null) => (xs ?? []).map(String)

function begin(): UnitOfWork {
  const tx = kv.multi()
  let empty = true
  const q = <T>(fn: () => T) => {
    empty = false
    fn()
  }
  return {
    putNote: (note) =>
      q(() => {
        tx.set(noteKey(note.userId, note.id), note)
        tx.sadd(notesSet(note.userId), note.id)
        tx.hset(graphHash(note.userId), { [note.id]: JSON.stringify(toGraphEntry(note)) })
      }),
    deleteNote: (u, id) =>
      q(() => {
        tx.del(noteKey(u, id), backlinksKey(u, id))
        tx.srem(notesSet(u), id)
        tx.hdel(graphHash(u), id)
      }),
    addBacklink: (u, target, from) => q(() => tx.sadd(backlinksKey(u, target), from)),
    removeBacklink: (u, target, from) => q(() => tx.srem(backlinksKey(u, target), from)),
    putSource: (s) =>
      q(() => {
        tx.set(sourceKey(s.userId, s.id), s)
        tx.sadd(sourcesSet(s.userId), s.id)
      }),
    deleteSource: (u, id) =>
      q(() => {
        tx.del(sourceKey(u, id), sourceNotesKey(u, id))
        tx.srem(sourcesSet(u), id)
      }),
    linkSource: (u, sid, nid) => q(() => tx.sadd(sourceNotesKey(u, sid), nid)),
    unlinkSource: (u, sid, nid) => q(() => tx.srem(sourceNotesKey(u, sid), nid)),
    async commit() {
      if (!empty) await tx.exec()
    },
  }
}

export const kvStore: ZkStore = {
  notes: {
    async get(u, id) {
      return kv.get<Note>(noteKey(u, id))
    },
    getMany: mgetNotes,
    async listAll(u) {
      return mgetNotes(u, asStrings(await kv.smembers(notesSet(u))))
    },
    async existing(u, ids) {
      if (ids.length === 0) return new Set()
      const flags = await kv.smismember(notesSet(u), ids)
      return new Set(ids.filter((_, i) => flags[i] === 1))
    },
  },
  links: {
    async backlinks(u, id) {
      return asStrings(await kv.smembers(backlinksKey(u, id)))
    },
  },
  addresses: {
    async listAll(u) {
      const h = await kv.hgetall<Record<string, unknown>>(addrHash(u))
      return Object.fromEntries(Object.entries(h ?? {}).map(([a, id]) => [a, String(id)]))
    },
    async nextChildIndex(u, parent) {
      return kv.incr(addrCounter(u, parent))
    },
    async claim(u, address, id) {
      return (await kv.hsetnx(addrHash(u), address, id)) === 1
    },
    async release(u, address) {
      await kv.hdel(addrHash(u), address)
    },
  },
  sources: {
    async get(u, id) {
      return kv.get<Source>(sourceKey(u, id))
    },
    async list(u) {
      const ids = asStrings(await kv.smembers(sourcesSet(u)))
      if (ids.length === 0) return []
      const rows = await kv.mget<(Source | null)[]>(...ids.map((id) => sourceKey(u, id)))
      return rows.filter(Boolean) as Source[]
    },
    async noteIds(u, sid) {
      return asStrings(await kv.smembers(sourceNotesKey(u, sid)))
    },
  },
  graph: {
    async all(u) {
      const h = await kv.hgetall<Record<string, unknown>>(graphHash(u))
      // Values are JSON strings; KV may already have parsed them.
      return Object.fromEntries(
        Object.entries(h ?? {}).map(([id, v]) => [id, (typeof v === 'string' ? JSON.parse(v) : v) as GraphEntry])
      )
    },
    async isComplete(u) {
      const [cards, total] = await Promise.all([kv.hlen(graphHash(u)), kv.scard(notesSet(u))])
      return cards === total
    },
    async rebuild(u, list) {
      const tx = kv.multi()
      tx.del(graphHash(u))
      if (list.length > 0) {
        tx.hset(graphHash(u), Object.fromEntries(list.map((n) => [n.id, JSON.stringify(toGraphEntry(n))])))
      }
      await tx.exec()
    },
  },
  begin,
}
