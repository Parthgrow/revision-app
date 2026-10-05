import { getSession } from '@/lib/auth'
import { zk } from '@/lib/zk'
import ZkShell from '@/components/zk/ZkShell'
import SourcesClient from './SourcesClient'

export default async function SourcesPage() {
  const session = await getSession()
  if (!session) return null

  return (
    <ZkShell>
      <SourcesClient initial={await zk.listSources(session.userId)} />
    </ZkShell>
  )
}
