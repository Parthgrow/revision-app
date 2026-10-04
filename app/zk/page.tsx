import { getSession } from '@/lib/auth'
import { zk } from '@/lib/zk'
import ZkShell from '@/components/zk/ZkShell'
import ZkHomeClient from './ZkHomeClient'

export default async function ZkHomePage() {
  const session = await getSession()
  if (!session) return null

  const summaries = await zk.listSummaries(session.userId)

  return (
    <ZkShell wide>
      <ZkHomeClient initial={summaries} />
    </ZkShell>
  )
}
