import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { palaces, palaceErrorResponse } from '@/lib/palaces'

// Places a review card in a palace ({ palaceId }) or takes it out ({ palaceId: null }).
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const { palaceId } = await req.json()
    return NextResponse.json(await palaces.placeCard(session.userId, id, palaceId ?? null))
  } catch (err) {
    return palaceErrorResponse(err)
  }
}
