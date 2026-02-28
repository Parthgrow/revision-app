import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDueItems } from '@/lib/kv'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await getDueItems(session.userId)
  return NextResponse.json(items)
}
