import { getSession } from '@/lib/auth'
import { zk } from '@/lib/zk'
import ZkShell from '@/components/zk/ZkShell'
import GraphView from '@/components/zk/graph/GraphView'

export default async function GraphPage({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  const session = await getSession()
  if (!session) return null

  const [graph, { focus }] = await Promise.all([zk.graph(session.userId), searchParams])

  return (
    <ZkShell wide>
      <GraphView initial={graph} initialFocus={focus} />
    </ZkShell>
  )
}
