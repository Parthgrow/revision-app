import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { kv } from '@vercel/kv'

// Per-user tokens for the MCP endpoint (Claude connectors). The raw token is
// returned exactly once from createToken; storage only ever holds its
// SHA-256, so leaked storage doesn't leak usable tokens.
//
//   mcp-token:{sha256}            JSON  { userId, tokenId }       lookup per request
//   user:{u}:mcp-tokens           hash  tokenId → McpTokenInfo    settings page list
//   user:{u}:mcp-tokens-used      hash  tokenId → last-used ms    written on each request

export const MAX_TOKENS_PER_USER = 10
export const TOKEN_PREFIX = 'mg_'

export type McpTokenInfo = {
  id: string
  name: string
  hint: string // first characters of the raw token, to tell tokens apart
  hash: string
  createdAt: number
}

export type McpTokenRow = Omit<McpTokenInfo, 'hash'> & { lastUsedAt: number | null }

export class TooManyTokensError extends Error {}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

// Storage seam, so the token rules can be tested without Redis.
export interface TokenStore {
  count(userId: string): Promise<number>
  list(userId: string): Promise<McpTokenInfo[]>
  lastUsed(userId: string): Promise<Record<string, number>>
  get(userId: string, tokenId: string): Promise<McpTokenInfo | null>
  lookup(hash: string): Promise<{ userId: string; tokenId: string } | null>
  save(userId: string, info: McpTokenInfo): Promise<void> // both keys, one transaction
  remove(userId: string, info: McpTokenInfo): Promise<void> // all keys, one transaction
  touch(userId: string, tokenId: string, at: number): Promise<void>
}

const lookupKey = (hash: string) => `mcp-token:${hash}`
const indexKey = (u: string) => `user:${u}:mcp-tokens`
const usedKey = (u: string) => `user:${u}:mcp-tokens-used`

export const kvTokenStore: TokenStore = {
  async count(u) {
    return kv.hlen(indexKey(u))
  },
  async list(u) {
    const all = await kv.hgetall<Record<string, McpTokenInfo>>(indexKey(u))
    return Object.values(all ?? {})
  },
  async lastUsed(u) {
    const all = await kv.hgetall<Record<string, unknown>>(usedKey(u))
    return Object.fromEntries(Object.entries(all ?? {}).map(([id, v]) => [id, Number(v)]))
  },
  async get(u, id) {
    return kv.hget<McpTokenInfo>(indexKey(u), id)
  },
  async lookup(hash) {
    return kv.get<{ userId: string; tokenId: string }>(lookupKey(hash))
  },
  async save(u, info) {
    const tx = kv.multi()
    tx.set(lookupKey(info.hash), { userId: u, tokenId: info.id })
    tx.hset(indexKey(u), { [info.id]: info })
    await tx.exec()
  },
  async remove(u, info) {
    const tx = kv.multi()
    tx.del(lookupKey(info.hash))
    tx.hdel(indexKey(u), info.id)
    tx.hdel(usedKey(u), info.id)
    await tx.exec()
  },
  async touch(u, id, at) {
    await kv.hset(usedKey(u), { [id]: at })
  },
}

export function createMemoryTokenStore(): TokenStore {
  const index = new Map<string, Map<string, McpTokenInfo>>()
  const used = new Map<string, Map<string, number>>()
  const lookups = new Map<string, { userId: string; tokenId: string }>()
  const of = <T>(m: Map<string, Map<string, T>>, u: string) => {
    if (!m.has(u)) m.set(u, new Map())
    return m.get(u)!
  }
  return {
    async count(u) {
      return index.get(u)?.size ?? 0
    },
    async list(u) {
      return [...(index.get(u)?.values() ?? [])].map((i) => ({ ...i }))
    },
    async lastUsed(u) {
      return Object.fromEntries(used.get(u) ?? [])
    },
    async get(u, id) {
      const i = index.get(u)?.get(id)
      return i ? { ...i } : null
    },
    async lookup(hash) {
      return lookups.get(hash) ?? null
    },
    async save(u, info) {
      lookups.set(info.hash, { userId: u, tokenId: info.id })
      of(index, u).set(info.id, { ...info })
    },
    async remove(u, info) {
      lookups.delete(info.hash)
      index.get(u)?.delete(info.id)
      used.get(u)?.delete(info.id)
    },
    async touch(u, id, at) {
      of(used, u).set(id, at)
    },
  }
}

// What the settings page sees: everything except the hash.
const toRow = (i: McpTokenInfo, lastUsedAt: number | null): McpTokenRow => ({
  id: i.id,
  name: i.name,
  hint: i.hint,
  createdAt: i.createdAt,
  lastUsedAt,
})

export function createTokenService(store: TokenStore = kvTokenStore, now: () => number = Date.now) {
  return {
    async list(userId: string): Promise<McpTokenRow[]> {
      const [infos, used] = await Promise.all([store.list(userId), store.lastUsed(userId)])
      return infos
        .map((i) => toRow(i, used[i.id] ?? null))
        .sort((a, b) => b.createdAt - a.createdAt)
    },

    // Returns the raw token; this is the only time it exists outside the client.
    async create(userId: string, name: string): Promise<{ token: string; info: McpTokenRow }> {
      if ((await store.count(userId)) >= MAX_TOKENS_PER_USER) {
        throw new TooManyTokensError(`You can have at most ${MAX_TOKENS_PER_USER} tokens. Revoke one first.`)
      }
      const token = TOKEN_PREFIX + randomBytes(32).toString('base64url')
      const info: McpTokenInfo = {
        id: randomUUID(),
        name: String(name ?? '').trim().slice(0, 50) || 'Claude',
        hint: token.slice(0, TOKEN_PREFIX.length + 6),
        hash: hashToken(token),
        createdAt: now(),
      }
      await store.save(userId, info)
      return { token, info: toRow(info, null) }
    },

    async revoke(userId: string, tokenId: string): Promise<void> {
      const info = await store.get(userId, tokenId)
      if (info) await store.remove(userId, info)
    },

    // Token → userId, or null when unknown, malformed or revoked.
    async resolve(token: string | undefined | null): Promise<string | null> {
      if (!token?.startsWith(TOKEN_PREFIX) || token.length > 200) return null
      const record = await store.lookup(hashToken(token))
      if (!record) return null
      // Best effort: a failed "last used" write must not fail the request.
      store.touch(record.userId, record.tokenId, now()).catch(() => {})
      return record.userId
    },
  }
}

export const mcpTokens = createTokenService()
