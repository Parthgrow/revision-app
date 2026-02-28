import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { reviewItem, deleteItem } from '@/lib/kv'
import { Rating } from '@/lib/sm2'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { rating } = await req.json()

  if (rating === undefined || rating < 0 || rating > 3) {
    return NextResponse.json({ error: 'Rating must be 0-3' }, { status: 400 })
  }

  const item = await reviewItem(session.userId, id, rating as Rating)
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

  return NextResponse.json(item)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await deleteItem(session.userId, id)
  return NextResponse.json({ ok: true })
}
