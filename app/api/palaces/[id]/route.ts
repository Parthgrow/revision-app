import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { palaces, palaceErrorResponse } from '@/lib/palaces'

type Ctx = { params: Promise<{ id: string }> }

// { name?, networkAlphabet?, linkedPalaceId? }; linkedPalaceId null unlinks.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    return NextResponse.json(await palaces.updatePalace(session.userId, id, await req.json()))
  } catch (err) {
    return palaceErrorResponse(err)
  }
}

// Also clears links to this palace and takes its card out (the card stays).
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    return NextResponse.json(await palaces.deletePalace(session.userId, id))
  } catch (err) {
    return palaceErrorResponse(err)
  }
}
