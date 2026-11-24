import { getSession } from '../../auth'
import { tracker } from '../../tracker'
import OpenTaskList from '../../ui/tracker/OpenTaskList'
import type { PageFrame } from '../frame'

export default async function OpenTasksPage({ Frame }: { Frame: PageFrame }) {
  const session = await getSession()
  if (!session) return null
  const [tasks, agents] = await Promise.all([tracker.openTasks(session.userId), tracker.listAgents(session.userId)])
  return (
    <Frame>
      <OpenTaskList tasks={tasks} agents={agents} />
    </Frame>
  )
}
