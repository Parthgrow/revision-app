import { getSession } from '../../auth'
import { ctx } from '../../context'
import type { PageFrame } from '../frame'
import ProjectList from '../../ui/context/ProjectList'

export default async function ProjectsPage({ Frame }: { Frame: PageFrame }) {
  const session = await getSession()
  if (!session) return null

  return (
    <Frame>
      <ProjectList initial={await ctx.listProjects(session.userId)} />
    </Frame>
  )
}
