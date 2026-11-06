# revision-app

Two apps on one codebase and one database:

| App | Folder | What it is |
| --- | --- | --- |
| **MindGym** | `apps/mindgym` | Spaced repetition, Zettelkasten notes, memory palaces — and Context |
| **ContextMagic** | `apps/contextmagic` | Context on its own: schema, HLD and LLDs that Claude can read and edit |
| core | `packages/core` | Shared code: accounts, Context documents, the Claude (MCP) connector, shared UI and styles |

Both apps use the same Redis (Vercel KV) database and the same `JWT_SECRET`,
so one account works in both, and a project made in one shows up in the
other. A connector token generated in either app works against either app's
`/api/mcp` URL.

## Layout

```
apps/
  mindgym/        Next.js app (review, notes, palaces, context, settings)
  contextmagic/   Next.js app (context, settings, sign-in)
packages/
  core/
    src/auth.ts, users.ts   sessions and accounts
    src/context/            Context documents: service, repository, templates
    src/mcp/                Claude connector: tokens, tools, HTTP handler
    src/routes/             API handlers; each app's route.ts re-exports them
    src/pages/              shared pages; each app wraps them in its own nav
    src/ui/                 shared components (AuthForm, SideNav, Context UI)
    styles/                 paper.css (tokens, reset), context.css (docs, print)
```

Apps import shared code as `@revision-app/core/…`. The package ships
TypeScript source, and each app compiles it (`transpilePackages`).

## Development

```bash
npm install                 # once, at the repo root
npm run dev:mindgym         # http://localhost:3000
npm run dev:contextmagic    # http://localhost:3001
npm test                    # all unit tests (vitest)
npm run typecheck
npm run lint
```

Both apps need `KV_REST_API_URL`, `KV_REST_API_TOKEN` and `JWT_SECRET`
(e.g. in `apps/<app>/.env.local`).

## Deploying on Vercel

One Vercel project per app, both pointing at this repository:

- **MindGym**: Root Directory `apps/mindgym`
- **ContextMagic**: Root Directory `apps/contextmagic`

In both projects, connect the same KV / Redis store (Storage → Connect
Project) and set the same `JWT_SECRET`.
