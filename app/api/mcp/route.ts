import { mcpTokens } from '@/lib/mcp/tokens'
import { handleMcpRequest, methodNotAllowed } from '@/lib/mcp/http'

// MCP endpoint for clients that can send a header (e.g. Claude Code):
//   Authorization: Bearer mg_…
// middleware.ts skips /api, so this route authenticates itself.
export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1]
  const userId = await mcpTokens.resolve(token)
  if (!userId) {
    return Response.json(
      { error: 'Missing or invalid MCP token. Generate one at /settings.' },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="mindgym"' } }
    )
  }
  return handleMcpRequest(req, userId)
}

export { methodNotAllowed as GET, methodNotAllowed as DELETE }
