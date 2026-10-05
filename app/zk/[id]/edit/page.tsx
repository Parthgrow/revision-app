import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { zk } from '@/lib/zk'
import { NotFoundError } from '@/lib/zk/errors'
import ZkShell from '@/components/zk/ZkShell'
import NoteEditor from '@/components/zk/NoteEditor'

export default async function EditNotePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return null

  const { id } = await params
  const [note, summaries, sources] = await Promise.all([
    zk.get(session.userId, id).catch((err) => {
      if (err instanceof NotFoundError) notFound()
      throw err
    }),
    zk.listSummaries(session.userId),
    zk.listSources(session.userId),
  ])

  return (
    <ZkShell>
      <NoteEditor key={note.updatedAt} note={note} summaries={summaries} sources={sources} />
    </ZkShell>
  )
}
