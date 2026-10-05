import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { zk, zkErrorResponse } from '@/lib/zk'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json(await zk.listSources(session.userId))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const source = await zk.createSource(session.userId, await req.json())
    return NextResponse.json(source, { status: 201 })
  } catch (err) {
    return zkErrorResponse(err)
  }
}
