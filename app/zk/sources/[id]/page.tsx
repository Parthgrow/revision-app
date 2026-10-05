import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { zk } from '@/lib/zk'
import { NotFoundError } from '@/lib/zk/errors'
import ZkShell from '@/components/zk/ZkShell'
import SourceClient from './SourceClient'

export default async function SourcePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return null

  const { id } = await params
  const data = await zk.getSource(session.userId, id).catch((err) => {
    if (err instanceof NotFoundError) notFound()
    throw err
  })

  return (
    <ZkShell>
      <SourceClient source={data.source} notes={data.notes} />
    </ZkShell>
  )
}
