import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { ctx, ctxErrorResponse } from '@/lib/context'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json(await ctx.listProjects(session.userId))
}

// Creates a project together with its schema and HLD documents.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    return NextResponse.json(await ctx.createProject(session.userId, await req.json()), { status: 201 })
  } catch (err) {
    return ctxErrorResponse(err)
  }
}
