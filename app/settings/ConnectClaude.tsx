'use client'

import { useState } from 'react'
import type { McpTokenRow } from '@/lib/mcp/tokens'

type Props = { initial: McpTokenRow[]; mcpUrl: string; email: string; max: number }

const btnPrimary =
  'px-5 py-2 text-[14px] font-semibold border-none bg-[var(--ink)] text-[var(--paper)] cursor-pointer transition-opacity duration-150 hover:opacity-85 disabled:opacity-40 disabled:cursor-default'
const btnQuiet =
  'px-0 py-1 text-[14px] text-[var(--ink-2)] bg-transparent border-none cursor-pointer underline underline-offset-4 decoration-[var(--rule)] hover:text-[var(--ink)] hover:decoration-[var(--ink)] disabled:opacity-40'

function when(ts: number | null): string {
  if (!ts) return 'never used'
  const mins = Math.floor((Date.now() - ts) / 60_000)
  if (mins < 1) return 'used just now'
  if (mins < 60) return `used ${mins} min ago`
  if (mins < 1440) return `used ${Math.floor(mins / 60)} h ago`
  return `used ${new Date(ts).toLocaleDateString()}`
}

function CopyBlock({ id, title, hint, text }: { id: string; title: string; hint: string; text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      <p className="text-[14px] text-[var(--ink-2)]">{hint}</p>
      <div className="flex items-stretch gap-2 min-w-0">
        <code
          id={id}
          className="ctx-mono flex-1 min-w-0 overflow-x-auto whitespace-nowrap border border-[var(--rule)] bg-[var(--paper-2)] px-3 py-2 text-[13px] select-all"
        >
          {text}
        </code>
        <button
          onClick={() =>
            navigator.clipboard.writeText(text).then(
              () => setCopied(true),
              () => window.getSelection()?.selectAllChildren(document.getElementById(id)!)
            )
          }
          className={`${btnPrimary} shrink-0 px-4`}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

export default function ConnectClaude({ initial, mcpUrl, email, max }: Props) {
  const [tokens, setTokens] = useState(initial)
  const [name, setName] = useState('')
  const [created, setCreated] = useState<{ token: string; name: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  async function generate(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await fetch('/api/mcp-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setError(data.error ?? 'Couldn’t create a token. Try again.')
      return
    }
    setCreated({ token: data.token, name: data.info.name })
    setTokens((prev) => [data.info, ...prev])
    setName('')
  }

  async function revoke(id: string) {
    const res = await fetch(`/api/mcp-tokens/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setTokens((prev) => prev.filter((t) => t.id !== id))
      setConfirmId(null)
    } else {
      setError('Couldn’t revoke that token. Try again.')
    }
  }

  const full = tokens.length >= max

  return (
    <>
      <header className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-ink)] pb-3">
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Connect Claude</h1>
        <span className="smallcaps">Context documents</span>
      </header>

      <p className="text-[16px] text-[var(--ink-2)] max-w-[62ch]">
        Generate a token so Claude can read and edit the Context projects of{' '}
        <span className="text-[var(--ink)] font-semibold">{email}</span>: list projects, read documents, create
        projects and LLDs, and edit the schema, HLD and LLDs. Deleting stays here in the app. Anyone with a token has
        that access, so treat it like a password.
      </p>

      <form onSubmit={generate} className="flex flex-col sm:flex-row gap-3">
        <input
          id="token-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          placeholder="Token name, e.g. claude.ai"
          aria-label="Token name"
          className="flex-1 min-w-0 bg-transparent border border-[var(--rule)] text-[var(--ink)] px-3 py-2 text-[16px] outline-none focus:border-[var(--ink-3)] placeholder:text-[var(--ink-4)]"
        />
        <button type="submit" disabled={busy || full} className={`${btnPrimary} shrink-0`}>
          {busy ? 'Generating…' : 'Generate MCP token'}
        </button>
      </form>
      {full && <p className="text-[14px] text-[var(--ink-2)] -mt-5">You have {max} tokens. Revoke one to make another.</p>}
      {error && <p className="text-[14px] text-[var(--ink-2)] -mt-5">{error}</p>}

      {created && (
        <section className="flex flex-col gap-5 border border-[var(--ink-3)] p-5" aria-live="polite">
          <p className="text-[15px]">
            Token <span className="font-semibold">{created.name}</span> created.{' '}
            <span className="font-semibold">Copy what you need now. It won’t be shown again.</span>
          </p>
          <CopyBlock
            id="connector-url"
            title="claude.ai connector URL (web, desktop and mobile apps)"
            hint="In claude.ai open Settings → Connectors → Add custom connector, paste this URL and choose No auth. The URL itself is the password: don’t share it, and revoke the token if it leaks."
            text={`${mcpUrl}/${created.token}`}
          />
          <CopyBlock
            id="claude-code-command"
            title="Claude Code (terminal)"
            hint="Run this in a terminal to add the same tools to Claude Code."
            text={`claude mcp add --transport http mindgym-context ${mcpUrl} --header "Authorization: Bearer ${created.token}"`}
          />
        </section>
      )}

      <section className="flex flex-col">
        <h2 className="smallcaps px-1 pb-2 border-b border-[var(--rule)]">
          Active tokens · {tokens.length}/{max}
        </h2>
        {tokens.length === 0 ? (
          <p className="px-1 py-4 text-[15px] text-[var(--ink-3)]">No tokens yet.</p>
        ) : (
          <ul className="ledger flex flex-col">
            {tokens.map((t) => (
              <li key={t.id} className="row flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-3">
                <span className="flex flex-col min-w-0">
                  <span className="text-[16px] font-semibold truncate">{t.name}</span>
                  <span className="text-[13px] text-[var(--ink-3)]">
                    <code className="ctx-mono">{t.hint}…</code> · created {new Date(t.createdAt).toLocaleDateString()} ·{' '}
                    {when(t.lastUsedAt)}
                  </span>
                </span>
                {confirmId === t.id ? (
                  <span className="flex items-baseline gap-4">
                    <button onClick={() => revoke(t.id)} className={btnQuiet}>
                      Revoke now
                    </button>
                    <button onClick={() => setConfirmId(null)} className={btnQuiet}>
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button onClick={() => setConfirmId(t.id)} className={btnQuiet}>
                    Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
