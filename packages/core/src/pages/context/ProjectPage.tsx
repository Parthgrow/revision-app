import { notFound, redirect } from 'next/navigation'
import { getSession } from '../../auth'
import { ctx } from '../../context'
import { CtxNotFoundError } from '../../context/errors'

export type ProjectPageProps = { params: Promise<{ pid: string }> }

// A project opens on its HLD.
export default async function ProjectPage({ params }: ProjectPageProps) {
  const session = await getSession()
  if (!session) return null

  const { pid } = await params
  const { project } = await ctx.getToc(session.userId, pid).catch((err) => {
    if (err instanceof CtxNotFoundError) notFound()
    throw err
  })
  redirect(`/context/${project.id}/${project.hldId}`)
}
