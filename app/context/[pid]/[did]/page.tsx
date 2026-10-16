import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { ctx } from '@/lib/context'
import { CtxNotFoundError } from '@/lib/context/errors'
import CtxFrame from '@/components/context/CtxFrame'
import ProjectShell from '@/components/context/ProjectShell'

type Props = {
  params: Promise<{ pid: string; did: string }>
  searchParams: Promise<{ edit?: string }>
}

export default async function DocPage({ params, searchParams }: Props) {
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
    <CtxFrame>
      <ProjectShell
        key={did}
        toc={toc}
        doc={doc}
        startEditing={edit === '1'}
      />
    </CtxFrame>
  )
}
