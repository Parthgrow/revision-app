import { kv } from '@vercel/kv'
import { getAllItems, getItem, itemKey, type Item } from '@/lib/kv'
import type { MemoryPalace } from './types'
import type { PalaceStore, UnitOfWork } from './repo'

// Keys:
//   user:{u}:palaces     set   palace ids
//   palace:{u}:{id}      JSON  MemoryPalace
// Cards stay at item:{u}:{id}; this module only sets/clears their palaceId.

const palacesSet = (u: string) => `user:${u}:palaces`
const palaceKey = (u: string, id: string) => `palace:${u}:${id}`

function begin(): UnitOfWork {
  const tx = kv.multi()
  let empty = true
  const q = (fn: () => void) => {
    empty = false
    fn()
  }
  return {
    putPalace: (p) =>
      q(() => {
        tx.set(palaceKey(p.userId, p.id), p)
        tx.sadd(palacesSet(p.userId), p.id)
      }),
    deletePalace: (u, id) =>
      q(() => {
        tx.del(palaceKey(u, id))
        tx.srem(palacesSet(u), id)
      }),
    putCard: (c: Item) => q(() => tx.set(itemKey(c.userId, c.id), c)),
    async commit() {
      if (!empty) await tx.exec()
    },
  }
}

export const kvPalaceStore: PalaceStore = {
  palaces: {
    async get(u, id) {
      return kv.get<MemoryPalace>(palaceKey(u, id))
    },
    async listAll(u) {
      const ids = ((await kv.smembers(palacesSet(u))) ?? []).map(String)
      if (ids.length === 0) return []
      const rows = await kv.mget<(MemoryPalace | null)[]>(...ids.map((id) => palaceKey(u, id)))
      return rows.filter(Boolean) as MemoryPalace[]
    },
  },
  cards: { get: getItem, listAll: getAllItems },
  begin,
}
