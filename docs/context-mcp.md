# Context — Claude connector (MCP)

Lets Claude (claude.ai apps and Claude Code) read and edit Context documents.
The approach matches NextConnection's connector: per-user tokens, stateless
Streamable HTTP, and the official `@modelcontextprotocol/sdk`.

```
 claude.ai ──POST──▶ /api/mcp/<token>        (token in URL: custom connectors)
 Claude Code ─POST─▶ /api/mcp                (Authorization: Bearer <token>)
                          │ sha256(token) → userId     401 if unknown/revoked
                          ▼
                 fresh McpServer per request (stateless, JSON responses)
                          │ 8 tools
                          ▼
                 ContextService  ── same rules as the web app ──▶  Redis ctx:{u}:…
```

## Setup
1. **Make a token.** In MindGym, open **Connect Claude** (nav) and click **Generate MCP token**. Copy the connector URL now; the token is shown only once.
2. **Add it to claude.ai.** Go to **Settings → Connectors → Add custom connector**, paste the URL, and choose **No auth**.
3. **Or add it to Claude Code** with the `claude mcp add …` command shown on the same page.

## Tools

| Tool | Does | Hints |
|---|---|---|
| `list_projects` | Projects, newest first, with LLD counts and links | read-only |
| `get_project` | A project's documents (schema, HLD, LLDs) with ids | read-only |
| `read_document` | Full markdown and `updatedAt` | read-only |
| `create_project` | New project; schema and HLD from templates | |
| `create_lld` | New LLD (template if no body) | |
| `edit_document` | Replace one exact passage (`old_text` must match once) | |
| `update_document` | Replace a whole document | idempotent |
| `rename_lld` | Rename an LLD (schema/HLD titles are fixed) | idempotent |

How the tools behave:
- **Lookups by name:** `project` accepts an id or a name. `document` accepts an id, `schema`, `hld`, or an LLD title. All matching ignores case, and an ambiguous name is an error that lists the ids to use instead.
- **Edits don't overwrite browser work:** edits accept `expected_updated_at` from `read_document`. If the document changed since, the tool refuses and asks Claude to read it again.
- **Deleting is web-only:** there are no tools for deleting an LLD or a project.

## Storage

| Key | Type | Holds |
|---|---|---|
| `mcp-token:{sha256}` | JSON | `{ userId, tokenId }`, looked up on every request |
| `user:{u}:mcp-tokens` | hash | tokenId → `{ id, name, hint, hash, createdAt }`, for the settings list |
| `user:{u}:mcp-tokens-used` | hash | tokenId → last-used time (ms), written on each request |

- **Hashes only:** the raw token (`mg_` + 32 random bytes) is never stored.
- **Limits:** at most 10 tokens per user.
- **Revoke:** removes all three entries in one transaction.

## Security
- **The connector URL is the credential.** Anyone with it can read and edit your Context documents, so revoke it at `/settings` if it leaks.
- **Tokens appear in hosting logs.** Request logs record URL paths, so tokens in URLs show up there.
- **OAuth is the planned upgrade.** claude.ai supports it for custom connectors; with it, no secret goes in the URL.
- **Scope:** only Context is reachable through MCP.
