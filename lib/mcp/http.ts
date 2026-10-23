import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { ctx } from '@/lib/context'
import { registerContextTools } from './tools'

// Public origin of the app, for links back to documents in tool results.
export function appOrigin(req: Request): string {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host
  const proto = req.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

// Stateless Streamable HTTP: a fresh server per request keeps it
// serverless-friendly, with no sessions shared between instances.
export async function handleMcpRequest(req: Request, userId: string): Promise<Response> {
  const server = new McpServer({ name: 'mindgym-context', version: '0.1.0' })
  registerContextTools(server, { userId, service: ctx, appUrl: appOrigin(req) })

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  await server.connect(transport)
  return transport.handleRequest(req)
}

// Stateless: no server-initiated stream and no session to delete.
export function methodNotAllowed(): Response {
  return Response.json(
    { jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null },
    { status: 405, headers: { Allow: 'POST' } }
  )
}
