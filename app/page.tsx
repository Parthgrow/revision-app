import { getSession } from '@/lib/auth'
import { getDueItems, getAllItems, getStreak } from '@/lib/kv'
import Nav from '@/components/Nav'
import HomeClient from './HomeClient'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) return null

  const [due, all, streak] = await Promise.all([
    getDueItems(session.userId),
    getAllItems(session.userId),
    getStreak(session.userId),
  ])

  return (
    <div className="min-h-screen bg-[var(--paper)] flex flex-col sm:flex-row">
      <Nav />
      <HomeClient dueItems={due} totalCount={all.length} streak={streak} />
    </div>
  )
}
