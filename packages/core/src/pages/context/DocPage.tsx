import { notFound } from 'next/navigation'
import { getSession } from '../../auth'
import { ctx } from '../../context'
import { CtxNotFoundError } from '../../context/errors'
import type { PageFrame } from '../frame'
import ProjectShell from '../../ui/context/ProjectShell'

export type DocPageProps = {
  params: Promise<{ pid: string; did: string }>
  searchParams: Promise<{ edit?: string }>
}

export default async function DocPage({ params, searchParams, Frame }: DocPageProps & { Frame: PageFrame }) {
  const session = await getSession()
  if (!session) return null

  const [{ pid, did }, { edit }] = await Promise.all([params, searchParams])
  const toc = await ctx.getToc(session.userId, pid).catch((err) => {
    if (err instanceof CtxNotFoundError) notFound()
    throw err
  })
  // An unknown document keeps the menu visible with a "not found" message.
  const doc = await ctx.getDoc(session.userId, pid, did).catch((err) => {
    if (err instanceof CtxNotFoundError) return null
    throw err
  })

  return (
    <Frame>
      <ProjectShell
        key={did}
        toc={toc}
        doc={doc}
        startEditing={edit === '1'}
      />
    </Frame>
  )
}
