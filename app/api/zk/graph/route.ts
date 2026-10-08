import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { zk } from '@/lib/zk'
import { graphOptionsFrom } from '@/lib/zk/graph'

// GET /api/zk/graph?sequence=0|1&types=a,b&tag=x&orphans=1
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams
  return NextResponse.json(await zk.graph(session.userId, graphOptionsFrom((k) => q.get(k))))
}
