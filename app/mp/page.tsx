import { getSession } from '@/lib/auth'
import { getAllMpItems } from '@/lib/kv'
import Nav from '@/components/Nav'
import MpClient from './MpClient'

export default async function MpPage() {
  const session = await getSession()
  if (!session) return null

  const items = await getAllMpItems(session.userId)

  return (
    <div className="min-h-screen bg-[var(--paper)] flex flex-col sm:flex-row">
      <Nav />
      <MpClient initialItems={items} />
    </div>
  )
}

