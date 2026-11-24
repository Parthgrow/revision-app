import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '../../auth'
import { tracker, trkErrorResponse } from '../../tracker'

// One page of the timeline, newest first: ?before=<at>&limit=<n ≤ 100>.
export async function GET(req: NextRequest, { params }: { params: Promise<{ aid: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { aid } = await params
  const sp = req.nextUrl.searchParams
  const before = sp.has('before') ? Number(sp.get('before')) : undefined
  const limit = sp.has('limit') ? Number(sp.get('limit')) : undefined
  try {
    return NextResponse.json(await tracker.timeline(session.userId, aid, { before, limit }))
  } catch (err) {
    return trkErrorResponse(err)
  }
}
