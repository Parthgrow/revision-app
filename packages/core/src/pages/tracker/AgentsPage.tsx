import { getSession } from '../../auth'
import { tracker } from '../../tracker'
import AgentList from '../../ui/tracker/AgentList'
import type { PageFrame } from '../frame'

export default async function AgentsPage({ Frame }: { Frame: PageFrame }) {
  const session = await getSession()
  if (!session) return null
  return (
    <Frame>
      <AgentList agents={await tracker.listAgents(session.userId)} />
    </Frame>
  )
}
