import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { ctx, ctxErrorResponse } from '@/lib/context'

// Adds an LLD to the project.
export async function POST(req: NextRequest, { params }: { params: Promise<{ pid: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pid } = await params
  try {
    return NextResponse.json(await ctx.addLld(session.userId, pid, await req.json()), { status: 201 })
  } catch (err) {
    return ctxErrorResponse(err)
  }
}
