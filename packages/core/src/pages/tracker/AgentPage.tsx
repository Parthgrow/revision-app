import { notFound } from 'next/navigation'
import { getSession } from '../../auth'
import { tracker } from '../../tracker'
import { TrkNotFoundError } from '../../tracker/errors'
import AgentView from '../../ui/tracker/AgentView'
import type { PageFrame } from '../frame'

export type AgentPageProps = { params: Promise<{ aid: string }> }

export default async function AgentPage({ params, Frame }: AgentPageProps & { Frame: PageFrame }) {
  const session = await getSession()
  if (!session) return null
  const { aid } = await params
  const u = session.userId
  const [agent, tasks, events] = await Promise.all([
    tracker.getAgent(u, aid),
    tracker.listTasks(u, aid, { includeClosed: true }),
    tracker.timeline(u, aid),
  ]).catch((err) => {
    if (err instanceof TrkNotFoundError) notFound()
    throw err
  })
  return (
    <Frame>
      <AgentView agent={agent} tasks={tasks} events={events} />
    </Frame>
  )
}
