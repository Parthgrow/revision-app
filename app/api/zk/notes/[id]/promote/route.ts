import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { zk, zkErrorResponse } from '@/lib/zk'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const { to, sourceId } = await req.json()
    return NextResponse.json(await zk.promote(session.userId, id, to, sourceId))
  } catch (err) {
    return zkErrorResponse(err)
  }
}
