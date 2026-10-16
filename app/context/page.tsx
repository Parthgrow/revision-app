import { getSession } from '@/lib/auth'
import { ctx } from '@/lib/context'
import CtxFrame from '@/components/context/CtxFrame'
import ProjectList from '@/components/context/ProjectList'

export default async function ContextPage() {
  const session = await getSession()
  if (!session) return null

  return (
    <CtxFrame>
      <ProjectList initial={await ctx.listProjects(session.userId)} />
    </CtxFrame>
  )
}
