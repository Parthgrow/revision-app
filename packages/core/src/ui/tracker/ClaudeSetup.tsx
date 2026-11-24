'use client'

import { useState } from 'react'
import { btnPrimary } from '../context/ui'

export const CLAUDE_MD_SNIPPET = `## AgentTracker
At the start of every chat, call the ContextMagic start_agent tool once (a short name for the chat, plus repo and branch) and keep the agent id it returns. Call start_task when you begin a piece of work, complete_task with a one-line summary when it's done, block_task with the reason when you're stuck, and mark_pending if you stop before finishing. If you lose the agent id, call list_agents.`

// Settings box: the optional CLAUDE.md lines for stricter reporting.
export default function ClaudeSetup() {
  const [copied, setCopied] = useState(false)
  return (
    <section className="flex flex-col gap-4 border-t border-[var(--rule-ink)] pt-6" aria-labelledby="tracker-setup">
      <header className="flex items-baseline justify-between gap-4">
        <h2 id="tracker-setup" className="text-[19px] font-semibold tracking-[-0.01em]">
          AgentTracker
        </h2>
        <span className="smallcaps">Optional</span>
      </header>
      <p className="text-[16px] text-[var(--ink-2)] max-w-[62ch]">
        With the connector added, Claude is already asked to register each chat and report what it starts,
        finishes and gets stuck on; you’ll see it under Agents. For stricter reporting in Claude Code, add these
        lines to <span className="ctx-mono text-[14px]">~/.claude/CLAUDE.md</span>:
      </p>
      <pre
        id="claude-md-snippet"
        className="ctx-mono whitespace-pre-wrap break-words border border-[var(--rule)] bg-[var(--paper-2)] px-4 py-3 text-[13px] leading-[1.5]"
      >
        {CLAUDE_MD_SNIPPET}
      </pre>
      <button
        onClick={() =>
          navigator.clipboard.writeText(CLAUDE_MD_SNIPPET).then(
            () => setCopied(true),
            () => window.getSelection()?.selectAllChildren(document.getElementById('claude-md-snippet')!)
          )
        }
        className={`${btnPrimary} self-start`}
      >
        {copied ? 'Copied' : 'Copy lines'}
      </button>
    </section>
  )
}
