import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createMpItem, getAllMpItems, MpStatus } from '@/lib/kv'

const ALLOWED_STATUSES: MpStatus[] = ['prep', 'memorize', 'add-revision']

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await getAllMpItems(session.userId)
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { content, status } = (body ?? {}) as {
    content?: string
    status?: string
  }

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Content required' }, { status: 400 })
  }

  let finalStatus: MpStatus = 'prep'
  if (status !== undefined) {
    if (!ALLOWED_STATUSES.includes(status as MpStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    finalStatus = status as MpStatus
  }

  const item = await createMpItem(session.userId, content.trim(), finalStatus)
  return NextResponse.json(item)
}

