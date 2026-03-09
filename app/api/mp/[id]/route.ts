import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { deleteMpItem, MpStatus, updateMpItemStatus } from '@/lib/kv'

const ALLOWED_STATUSES: MpStatus[] = ['prep', 'memorize', 'add-revision']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { status } = (body ?? {}) as { status?: string }

  if (!status || !ALLOWED_STATUSES.includes(status as MpStatus)) {
    return NextResponse.json({ error: 'Status must be one of prep/memorize/add-revision' }, { status: 400 })
  }

  const item = await updateMpItemStatus(session.userId, id, status as MpStatus)
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

  return NextResponse.json(item)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await deleteMpItem(session.userId, id)

  return NextResponse.json({ ok: true })
}

