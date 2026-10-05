import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { zk, zkErrorResponse } from '@/lib/zk'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    return NextResponse.json(await zk.getSource(session.userId, id))
  } catch (err) {
    return zkErrorResponse(err)
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    await zk.deleteSource(session.userId, id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return zkErrorResponse(err)
  }
}
