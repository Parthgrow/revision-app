import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAllItems, createItem } from '@/lib/kv'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await getAllItems(session.userId)
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await req.json()
  if (!content?.trim()) {
    return NextResponse.json({ error: 'Content required' }, { status: 400 })
  }

  const item = await createItem(session.userId, content.trim())
  return NextResponse.json(item)
}
