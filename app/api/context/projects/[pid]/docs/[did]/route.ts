import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { ctx, ctxErrorResponse } from '@/lib/context'

type Ctx = { params: Promise<{ pid: string; did: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pid, did } = await params
  try {
    return NextResponse.json(await ctx.getDoc(session.userId, pid, did))
  } catch (err) {
    return ctxErrorResponse(err)
  }
}

// Body may carry expectedUpdatedAt; a newer stored version returns 409 with
// { current } unless force is set.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pid, did } = await params
  try {
    return NextResponse.json(await ctx.updateDoc(session.userId, pid, did, await req.json()))
  } catch (err) {
    return ctxErrorResponse(err)
  }
}

// LLDs only; the schema and HLD can't be deleted.
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pid, did } = await params
  try {
    await ctx.deleteLld(session.userId, pid, did)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return ctxErrorResponse(err)
  }
}
