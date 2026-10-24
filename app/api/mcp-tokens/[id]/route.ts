import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { mcpTokens } from '@/lib/mcp/tokens'

// Revokes a token; requests using it fail immediately.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await mcpTokens.revoke(session.userId, id)
  return NextResponse.json({ ok: true })
}
