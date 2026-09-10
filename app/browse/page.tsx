import { getSession } from '@/lib/auth'
import { getAllItems } from '@/lib/kv'
import Nav from '@/components/Nav'
import BrowseClient from './BrowseClient'

export default async function BrowsePage() {
  const session = await getSession()
  if (!session) return null

  const items = await getAllItems(session.userId)
  const sorted = items.sort((a, b) => a.dueDate - b.dueDate)

  return (
    <div className="min-h-screen bg-[var(--paper)] flex flex-col sm:flex-row">
      <Nav />
      <BrowseClient initialItems={sorted} />
    </div>
  )
}
