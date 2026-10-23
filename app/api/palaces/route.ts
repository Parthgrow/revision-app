import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { palaces, palaceErrorResponse } from '@/lib/palaces'

// Palaces with links and occupancy resolved, sorted by letter then name.
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json(await palaces.listPalaces(session.userId))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    return NextResponse.json(await palaces.createPalace(session.userId, await req.json()), { status: 201 })
  } catch (err) {
    return palaceErrorResponse(err)
  }
}
