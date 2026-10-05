import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { zk, zkErrorResponse } from '@/lib/zk'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    return NextResponse.json(await zk.getView(session.userId, id))
  } catch (err) {
    return zkErrorResponse(err)
  }
}

// Body may carry expectedUpdatedAt (the version the editor loaded). A newer
// stored version returns 409 with { current } unless force is set.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    return NextResponse.json(await zk.update(session.userId, id, await req.json()))
  } catch (err) {
    return zkErrorResponse(err)
  }
}

// ?dryRun=1 reports the notes that link here without deleting anything.
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1'
  try {
    return NextResponse.json(await zk.delete(session.userId, id, { dryRun }))
  } catch (err) {
    return zkErrorResponse(err)
  }
}
