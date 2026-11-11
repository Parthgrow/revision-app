# Second-brain / persistent agent memory — repos to study

Saved 2026-11-11. Goal: give our AI agents memory that survives the session
(relevant to MindGym notes, ContextMagic and the Claude connector).

| # | Project | Link | One line |
|---|---------|------|----------|
| 1 | GBrain | https://github.com/garrytan/gbrain | Long-term memory and knowledge management for AI agents. |
| 2 | LLM Wiki (Karpathy) | https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f | Blueprint for an AI-maintained Markdown wiki that improves with every source. |
| 3 | AI Memory | https://github.com/akitaonrails/ai-memory | Share project context and handoffs across Claude Code, Codex, Cursor and other agents. |
| 4 | Agent Second Brain | https://github.com/smixs/agent-second-brain | Telegram voice notes → organized, linked notes in Obsidian. |
| 5 | COG Second Brain | https://github.com/huytieu/COG-second-brain | Self-improving Markdown system with specialized agents, skills and verification workflows. |

## Notes from a first look (secondary sources, not yet verified in code)

- **LLM Wiki** — a pattern, not a product: the LLM keeps a persistent,
  interlinked Markdown wiki, updates pages as sources arrive, flags
  contradictions, and runs a periodic "lint" health check. Human sources and
  asks; the LLM summarizes, cross-references and files.
- **AI Memory** — git-backed Markdown-wiki memory for coding agents; typed
  handoffs (owned, claimable once) so a session can move from Claude Code to
  Codex and continue. Claude Code / Codex integrate via MCP + lifecycle hooks.
  Self-described as Karpathy-wiki inspired.
- **Agent Second Brain** — Python; Telegram bot + Deepgram transcription,
  runs 24/7 on a VPS, writes typed, linked notes into an Obsidian vault.
  Memory layer is a separate project ("autograph"). A scanner flagged a
  remote-install step in its README — review before running any installer.
- **COG Second Brain** — MIT; folder of Markdown + agent skills (people CRM,
  braindump, etc.) for Claude Code / Cursor; verification harness where the
  worker never grades its own output. Inspired by GBrain.
- **GBrain** — Garry Tan's agent memory / knowledge system; inspiration for COG.

## Overlap with what we already have

- MindGym Zettelkasten (notes, links, graph) ≈ a human-written wiki; LLM Wiki
  / COG suggest letting Claude maintain it via the connector.
- ContextMagic + MCP connector ≈ shared project context for Claude; AI Memory's
  handoffs are the closest comparison.

## Next steps

- [ ] Read each README / gist in full and confirm the notes above.
- [ ] Pick which ideas to bring into MindGym / ContextMagic.
