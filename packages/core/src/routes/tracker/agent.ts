import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '../../auth'
import { tracker, trkErrorResponse } from '../../tracker'

type Ctx = { params: Promise<{ aid: string }> }

// The agent with all its tasks (open and closed).
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { aid } = await params
  try {
    const [agent, tasks] = await Promise.all([
      tracker.getAgent(session.userId, aid),
      tracker.listTasks(session.userId, aid, { includeClosed: true }),
    ])
    return NextResponse.json({ agent, tasks })
  } catch (err) {
    return trkErrorResponse(err)
  }
}

// Rename: { name }.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { aid } = await params
  try {
    const { name } = await req.json()
    return NextResponse.json(await tracker.renameAgent(session.userId, aid, name))
  } catch (err) {
    return trkErrorResponse(err)
  }
}

// Deletes the agent with its tasks and timeline.
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { aid } = await params
  try {
    await tracker.deleteAgent(session.userId, aid)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return trkErrorResponse(err)
  }
}
