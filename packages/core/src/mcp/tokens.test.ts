import { describe, expect, it } from 'vitest'
import { createMemoryTokenStore, createTokenService, hashToken, MAX_TOKENS_PER_USER, TooManyTokensError } from './tokens'

describe('MCP tokens', () => {
  it('creates an mg_ token that resolves to its user', async () => {
    const svc = createTokenService(createMemoryTokenStore())
    const { token, info } = await svc.create('u1', '  claude.ai ')
    expect(token).toMatch(/^mg_[A-Za-z0-9_-]{43}$/)
    expect(info.name).toBe('claude.ai')
    expect(info.hint).toBe(token.slice(0, 9))
    expect(await svc.resolve(token)).toBe('u1')
  })

  it('stores only the hash, never the raw token', async () => {
    const store = createMemoryTokenStore()
    const svc = createTokenService(store)
    const { token } = await svc.create('u1', 'x')
    const [info] = await store.list('u1')
    expect(info.hash).toBe(hashToken(token))
    expect(JSON.stringify(info)).not.toContain(token)
    expect(JSON.stringify(await svc.list('u1'))).not.toContain(info.hash)
  })

  it('rejects unknown, malformed and revoked tokens', async () => {
    const svc = createTokenService(createMemoryTokenStore())
    const { token, info } = await svc.create('u1', 'x')
    expect(await svc.resolve('mg_nope')).toBeNull()
    expect(await svc.resolve('nc_' + token.slice(3))).toBeNull()
    expect(await svc.resolve(undefined)).toBeNull()
    await svc.revoke('u1', info.id)
    expect(await svc.resolve(token)).toBeNull()
    expect(await svc.list('u1')).toEqual([])
  })

  it('caps tokens per user', async () => {
    const svc = createTokenService(createMemoryTokenStore())
    for (let i = 0; i < MAX_TOKENS_PER_USER; i++) await svc.create('u1', `t${i}`)
    await expect(svc.create('u1', 'one more')).rejects.toBeInstanceOf(TooManyTokensError)
    await svc.create('u2', 'other user is unaffected')
  })

  it('records when a token was last used, newest token first', async () => {
    let clock = 1000
    const svc = createTokenService(createMemoryTokenStore(), () => clock)
    const a = await svc.create('u1', 'a')
    clock = 2000
    await svc.create('u1', 'b')
    clock = 5000
    await svc.resolve(a.token)
    await new Promise((r) => setTimeout(r, 0)) // touch is fire-and-forget
    const rows = await svc.list('u1')
    expect(rows.map((r) => [r.name, r.lastUsedAt])).toEqual([
      ['b', null],
      ['a', 5000],
    ])
  })
})
