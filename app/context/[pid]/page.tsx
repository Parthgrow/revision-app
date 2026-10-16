import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { ctx } from '@/lib/context'
import { CtxNotFoundError } from '@/lib/context/errors'

// A project opens on its HLD.
export default async function ProjectPage({ params }: { params: Promise<{ pid: string }> }) {
  const session = await getSession()
  if (!session) return null

  const { pid } = await params
  const { project } = await ctx.getToc(session.userId, pid).catch((err) => {
    if (err instanceof CtxNotFoundError) notFound()
    throw err
  })
  redirect(`/context/${project.id}/${project.hldId}`)
}
