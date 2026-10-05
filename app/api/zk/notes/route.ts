import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { zk, zkErrorResponse } from '@/lib/zk'
import { NOTE_TYPES, type NoteType } from '@/lib/zk/types'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams
  const type = q.get('type')
  const summaries = await zk.listSummaries(session.userId, {
    type: type && NOTE_TYPES.includes(type as NoteType) ? (type as NoteType) : undefined,
    tag: q.get('tag') ?? undefined,
    orphans: q.get('orphans') === '1',
  })
  return NextResponse.json(summaries)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const note = await zk.create(session.userId, await req.json())
    return NextResponse.json(note, { status: 201 })
  } catch (err) {
    return zkErrorResponse(err)
  }
}
