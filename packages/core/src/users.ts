import { kv } from '@vercel/kv'
import { nanoid } from 'nanoid'

// Accounts are shared by every app on the same database: one sign-in works
// in MindGym and ContextMagic alike.
export type User = {
  id: string
  email: string
  password: string
  createdAt: number
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const userId = await kv.get<string>(`user:email:${email}`)
  if (!userId) return null
  return kv.get<User>(`user:${userId}`)
}

export async function createUser(email: string, password: string): Promise<User> {
  const id = nanoid()
  const user: User = { id, email, password, createdAt: Date.now() }
  await kv.set(`user:${id}`, user)
  await kv.set(`user:email:${email}`, id)
  return user
}
