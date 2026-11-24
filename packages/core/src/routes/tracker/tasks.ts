import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '../../auth'
import { tracker } from '../../tracker'

// Open tasks across all agents; ?blocked=1 for blocked ones only.
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const blockedOnly = req.nextUrl.searchParams.get('blocked') === '1'
  return NextResponse.json(await tracker.openTasks(session.userId, { blockedOnly }))
}
