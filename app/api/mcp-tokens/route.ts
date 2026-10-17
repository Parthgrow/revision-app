import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { mcpTokens, TooManyTokensError } from '@/lib/mcp/tokens'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json(await mcpTokens.list(session.userId))
}

// Creates a token. The raw token is in this response only; it is never
// stored and can't be shown again.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await req.json().catch(() => ({}))
  try {
    return NextResponse.json(await mcpTokens.create(session.userId, name), { status: 201 })
  } catch (err) {
    if (err instanceof TooManyTokensError) return NextResponse.json({ error: err.message }, { status: 400 })
    throw err
  }
}
