import { NextResponse } from 'next/server'
import { getSession } from '../../auth'
import { tracker } from '../../tracker'

// All agents, most recently active first.
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await tracker.listAgents(session.userId))
}
