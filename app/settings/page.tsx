import { headers } from 'next/headers'
import { getSession } from '@/lib/auth'
import { mcpTokens, MAX_TOKENS_PER_USER } from '@/lib/mcp/tokens'
import Nav from '@/components/Nav'
import ConnectClaude from './ConnectClaude'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) return null

  const [tokens, h] = await Promise.all([mcpTokens.list(session.userId), headers()])
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')

  return (
    <div className="min-h-screen bg-[var(--paper)] flex flex-col sm:flex-row">
      <Nav />
      <div className="flex-1 min-w-0 flex justify-center">
        <main className="w-full max-w-[760px] px-4 sm:px-10 py-8 sm:py-12 flex flex-col gap-8 min-w-0">
          <ConnectClaude
            initial={tokens}
            mcpUrl={`${proto}://${host}/api/mcp`}
            email={session.email}
            max={MAX_TOKENS_PER_USER}
          />
        </main>
      </div>
    </div>
  )
}
