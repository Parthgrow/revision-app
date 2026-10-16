import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { ctx, ctxErrorResponse } from '@/lib/context'

type Ctx = { params: Promise<{ pid: string }> }

// The project and its document menu (titles only, no bodies).
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pid } = await params
  try {
    return NextResponse.json(await ctx.getToc(session.userId, pid))
  } catch (err) {
    return ctxErrorResponse(err)
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pid } = await params
  try {
    return NextResponse.json(await ctx.updateProject(session.userId, pid, await req.json()))
  } catch (err) {
    return ctxErrorResponse(err)
  }
}

// Deletes the project and every document in it.
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pid } = await params
  try {
    await ctx.deleteProject(session.userId, pid)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return ctxErrorResponse(err)
  }
}
