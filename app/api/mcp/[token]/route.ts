import { mcpTokens } from '@/lib/mcp/tokens'
import { handleMcpRequest, methodNotAllowed } from '@/lib/mcp/http'

// MCP endpoint with the token in the URL, for claude.ai custom connectors,
// which only take a URL. The URL is the credential: anyone who has it can
// read and edit Context documents until the token is revoked at /settings.
// No WWW-Authenticate challenge: it would send those clients looking for an
// OAuth server this app doesn't run (yet).
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const userId = await mcpTokens.resolve(token)
  if (!userId) {
    return Response.json(
      { error: 'Invalid or revoked connector URL. Generate a new one at /settings.' },
      { status: 401 }
    )
  }
  return handleMcpRequest(req, userId)
}

export { methodNotAllowed as GET, methodNotAllowed as DELETE }
