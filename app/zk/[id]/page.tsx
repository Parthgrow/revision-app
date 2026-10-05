import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { reviewBridge, zk } from '@/lib/zk'
import { NotFoundError } from '@/lib/zk/errors'
import ZkShell from '@/components/zk/ZkShell'
import NoteViewClient from './NoteViewClient'

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return null

  const { id } = await params
  const view = await zk.getView(session.userId, id).catch((err) => {
    if (err instanceof NotFoundError) notFound()
    throw err
  })
  const [inReview, sources] = await Promise.all([
    reviewBridge.isInReview(session.userId, view.note.reviewItemId),
    view.note.type === 'fleeting' ? zk.listSources(session.userId) : Promise.resolve([]),
  ])

  return (
    <ZkShell>
      {/* Keyed by version so a fresh server render resets client state. */}
      <NoteViewClient key={view.note.updatedAt} view={view} inReview={inReview} sources={sources} />
    </ZkShell>
  )
}
