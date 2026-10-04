import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { zk, zkErrorResponse } from '@/lib/zk'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const input = await req.json().catch(() => ({}))
    const note = await zk.continueThought(session.userId, id, input)
    return NextResponse.json(note, { status: 201 })
  } catch (err) {
    return zkErrorResponse(err)
  }
}
