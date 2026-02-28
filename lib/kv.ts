import { kv } from '@vercel/kv'
import { nanoid } from 'nanoid'
import { initialSM2, applyReview, Rating } from './sm2'

export type User = {
  id: string
  email: string
  password: string
  createdAt: number
}

export type Item = {
  id: string
  userId: string
  content: string
  createdAt: number
  interval: number
  easeFactor: number
  repetitions: number
  dueDate: number
}

// --- User ---

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

// --- Items ---

export async function createItem(userId: string, content: string): Promise<Item> {
  const id = nanoid()
  const item: Item = {
    id,
    userId,
    content,
    createdAt: Date.now(),
    ...initialSM2(),
  }
  await kv.set(`item:${userId}:${id}`, item)
  await kv.sadd(`user:${userId}:items`, id)
  return item
}

export async function getAllItems(userId: string): Promise<Item[]> {
  const ids = await kv.smembers<string[]>(`user:${userId}:items`)
  if (!ids || ids.length === 0) return []
  const keys = ids.map((id) => `item:${userId}:${id}`)
  const items = await kv.mget<Item[]>(...keys)
  return items.filter(Boolean) as Item[]
}

export async function getDueItems(userId: string): Promise<Item[]> {
  const all = await getAllItems(userId)
  const now = Date.now()
  return all.filter((item) => item.dueDate <= now)
}

export async function reviewItem(userId: string, itemId: string, rating: Rating): Promise<Item | null> {
  const item = await kv.get<Item>(`item:${userId}:${itemId}`)
  if (!item) return null
  const updated: Item = {
    ...item,
    ...applyReview(item, rating),
  }
  await kv.set(`item:${userId}:${itemId}`, updated)
  return updated
}

export async function deleteItem(userId: string, itemId: string): Promise<void> {
  await kv.del(`item:${userId}:${itemId}`)
  await kv.srem(`user:${userId}:items`, itemId)
}

// --- Streak ---

export type StreakData = {
  current: number
  lastReviewedDate: string | null // 'YYYY-MM-DD'
}

export async function getStreak(userId: string): Promise<StreakData> {
  const data = await kv.get<StreakData>(`streak:${userId}`)
  return data ?? { current: 0, lastReviewedDate: null }
}

export async function updateStreak(userId: string): Promise<StreakData> {
  const today = new Date().toISOString().split('T')[0]
  const streak = await getStreak(userId)

  if (streak.lastReviewedDate === today) return streak

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const current = streak.lastReviewedDate === yesterday ? streak.current + 1 : 1

  const updated: StreakData = { current, lastReviewedDate: today }
  await kv.set(`streak:${userId}`, updated)
  return updated
}
