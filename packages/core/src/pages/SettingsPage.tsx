import { headers } from 'next/headers'
import { getSession } from '../auth'
import { mcpTokens, MAX_TOKENS_PER_USER } from '../mcp/tokens'
import ConnectClaude from '../ui/ConnectClaude'
import type { PageFrame } from './frame'

export default async function SettingsPage({ Frame }: { Frame: PageFrame }) {
  const session = await getSession()
  if (!session) return null

  const [tokens, h] = await Promise.all([mcpTokens.list(session.userId), headers()])
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')

  return (
    <Frame narrow>
      <ConnectClaude
        initial={tokens}
        mcpUrl={`${proto}://${host}/api/mcp`}
        email={session.email}
        max={MAX_TOKENS_PER_USER}
      />
    </Frame>
  )
}
