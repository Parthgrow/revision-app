import { getSession } from '@/lib/auth'
import { getAllItems, getStreak } from '@/lib/kv'
import Nav from '@/components/Nav'
import HomeClient from './HomeClient'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) return null

  const [all, streak] = await Promise.all([
    getAllItems(session.userId),
    getStreak(session.userId),
  ])

  // Overdue first, then nearest due — one list, no separate library.
  const sorted = [...all].sort((a, b) => a.dueDate - b.dueDate)

  return (
    <div className="min-h-screen bg-[var(--paper)] flex flex-col sm:flex-row">
      <Nav />
      <div className="flex-1 min-w-0 flex justify-center">
        <HomeClient items={sorted} streak={streak} />
      </div>
    </div>
  )
}
