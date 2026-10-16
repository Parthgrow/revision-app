# Context — Design (HLD · LLD · Database schema)

Status: **Implemented** (decisions in §0; build notes at the end)

Context is a separate module in MindGym. You create **projects**, and each project holds its design documents as separate files:

```
 Project
 ├── Database schema   exactly 1, created with the project, can't be deleted
 ├── HLD               exactly 1, created with the project, can't be deleted
 └── LLDs              0..n, add / rename / delete freely
```

Decisions already made:

| Decision | Choice |
|---|---|
| Relationship to the Zettelkasten | **None.** Separate code, separate routes, separate Redis keys, no links either way. |
| Version history | No |
| Status on LLD documents | No |
| "Copy context" button | No |
| Diagrams | As much support as possible, **ASCII first** |
| Download as PDF | Yes |
| Publish for other people | Next phase; not built now |
| Layout | `/context` lists projects; a project opens with the document menu on the left and the document on the right |

---

# Part 1 — HLD

## 1.1 Goals and non-goals

**Goals**
- Keep the design context of several projects in one place.
- Every project always has a database schema document and an HLD document, plus any number of LLDs.
- Write documents in markdown with first-class ASCII diagrams.
- Download any document, or a whole project, as a PDF.

**Non-goals for this phase**
- Publishing or sharing (next phase).
- Version history or document status.
- Any connection to notes, the graph, or SM-2 review.
- Collaboration or multiple editors.

## 1.2 Where it sits in the app

```
                       ┌──────────────────────────────────────────┐
                       │                MindGym                   │
                       │                                          │
   Nav ───────────────▶│  Review   Notes   Palace   Add   Context │
                       └──────┬────────┬───────┬──────────┬───────┘
                              │        │       │          │
                       existing modules (untouched)   NEW module
                                                          │
                       ┌──────────────────────────────────▼───────┐
                       │  app/context/*   app/api/context/*        │
                       │  components/context/*   lib/context/*     │
                       └──────────────────────────────────┬───────┘
                                                          │
                       shared platform only:  auth (getSession), Vercel KV client,
                       Nav, page tokens (paper/ink), react-markdown
                                                          │
                                                ┌─────────▼─────────┐
                                                │ Vercel KV (Redis) │
                                                │  keys: ctx:{u}:…  │
                                                └───────────────────┘
```

**Isolation rule:** nothing in `lib/context` or `components/context` imports from `lib/zk` or `components/zk`, and the reverse is also true. Context gets its own types, errors, storage, service and UI. A small helper that exists in both modules is copied, not shared, so either one can change or be deleted without touching the other.

## 1.3 Components

```
┌──────────────────────────── Browser ────────────────────────────┐
│                                                                  │
│  /context ─────────────▶ ProjectList                             │
│                                                                  │
│  /context/[projectId]/[docId]                                    │
│     ┌──────────────┬───────────────────────────────────────┐    │
│     │ DocMenu      │ DocView  ─or─  DocEditor               │    │
│     │  (left)      │  (right)        └─ DiagramPalette      │    │
│     └──────────────┴───────────────────────────────────────┘    │
│                                                                  │
│  /context/[projectId]/print?doc=… ──▶ PrintView ──▶ PDF          │
└───────────────────────────────┬──────────────────────────────────┘
                                │ fetch (JSON)
┌───────────────────────────────▼──────────────────────────────────┐
│  API routes   /api/context/projects …   /api/context/docs …      │
│               check session → validate → one service call        │
├──────────────────────────────────────────────────────────────────┤
│  ContextService     projects + documents, all the rules          │
├──────────────────────────────────────────────────────────────────┤
│  Domain             Project, ContextDoc, DocKind, templates,     │
│                     CtxError family (pure, no I/O)               │
├──────────────────────────────────────────────────────────────────┤
│  Storage            ProjectRepository, DocRepository,            │
│                     UnitOfWork  →  KV impl  |  memory impl       │
└──────────────────────────────────────────────────────────────────┘
```

## 1.4 Main flows

```
Create project
  user ─▶ "New project" ─▶ POST /api/context/projects
        ─▶ service creates Project + Schema doc + HLD doc  (one MULTI)
        ─▶ redirect to /context/{pid}/{hldId}

Read a document
  user ─▶ /context/{pid}/{docId}
        ─▶ server loads: project, table of contents (titles only), this doc
        ─▶ menu on the left, rendered markdown on the right

Edit
  user ─▶ "Edit" ─▶ editor replaces the view (menu stays)
        ─▶ PATCH with expectedUpdatedAt ─▶ 200, or 409 if changed elsewhere

Download PDF
  user ─▶ "Download PDF" ─▶ /context/{pid}/print?doc={docId}  (or ?doc=all)
        ─▶ print-ready page ─▶ browser saves PDF  (see §1.6, open question)
```

## 1.5 Non-functional requirements

| Concern | Approach |
|---|---|
| **Fast menu** | The left menu comes from one small "table of contents" hash, never from document bodies. |
| **Consistency** | Project, schema and HLD are created together in one transaction. Deleting a project removes all its keys in one transaction. |
| **Lost edits** | The same stale-save guard as notes: compare `updatedAt`, return 409 on mismatch. No history is stored. |
| **Size** | Document body up to 200 KB, project name up to 80 characters, document title up to 120, up to 100 LLDs per project. |
| **Security** | Every key is scoped by `userId`; every route checks the session; middleware already protects `/context`. |
| **Diagrams align** | Monospace font with full box-drawing glyphs in both the editor and the view. Diagram blocks never wrap; they scroll sideways. |

## 1.6 PDF approach (needs your pick)

| Option | How it works | Pros | Cons |
|---|---|---|---|
| **A. Print-ready page** (recommended to start) | A clean print layout, then the browser's "Save as PDF" | Text stays selectable; ASCII diagrams stay sharp; no server cost; small | Shows the browser's print dialog instead of a direct file download |
| B. Server-generated PDF | Headless Chromium in an API route returns a `.pdf` file | True one-click download | Large dependency (~50 MB), 2–5 s cold starts on Vercel |
| C. In-browser PDF library | jsPDF / html2pdf | One click, no server | Usually turns text into images: blurry diagrams, text not selectable |

A and B share the same print layout, so moving from A to B later only adds the server step.

## 1.7 Ready for "Publish" (next phase, nothing built now)

Publishing will add a public read-only route, for example `/p/{slug}`, and one lookup key `ctx:public:{slug} → {userId, projectId}`. The design below already keeps everything a published view needs (project, table of contents, documents) readable by ID, so publishing adds keys and routes without reshaping anything.

---

# Part 2 — Database schema changes

All new keys live under the `ctx:` prefix. **No existing key changes**, and nothing from the Zettelkasten is touched.

## 2.1 New keys

| Key | Redis type | Holds |
|---|---|---|
| `ctx:{u}:projects` | set | ids of the user's projects |
| `ctx:{u}:project:{pid}` | string (JSON) | `Project` |
| `ctx:{u}:project:{pid}:toc` | hash | **table of contents:** doc id → `{"k":kind,"t":title,"c":createdAt}` |
| `ctx:{u}:doc:{did}` | string (JSON) | `ContextDoc`, including the body |

That's four key patterns in total.

## 2.2 Records

```
Project                                   ContextDoc
┌────────────────────────────────┐        ┌────────────────────────────────┐
│ id          string (10 chars)  │        │ id          string (10 chars)  │
│ userId      string             │        │ userId      string             │
│ name        string  ≤ 80       │  1   n │ projectId   string ────────────┼──▶ Project
│ description string? ≤ 300      │◀───────│ kind        schema | hld | lld │
│ schemaId    string ────────────┼───┐    │ title       string  ≤ 120      │
│ hldId       string ────────────┼─┐ │    │ body        markdown ≤ 200 KB  │
│ createdAt   number             │ │ │    │ createdAt   number             │
│ updatedAt   number             │ │ │    │ updatedAt   number  (409 check)│
└────────────────────────────────┘ │ │    └────────────────────────────────┘
                                   │ └──▶ the schema doc
                                   └────▶ the HLD doc
```

`schemaId` and `hldId` on the project are what guarantee "exactly one schema and one HLD": they are set once when the project is created and never change.

## 2.3 Example (what Redis would hold for one project)

```
SMEMBERS ctx:u1:projects
  → { "Pq7Zk2mLxa" }

GET ctx:u1:project:Pq7Zk2mLxa
  → {"id":"Pq7Zk2mLxa","userId":"u1","name":"MindGym",
     "description":"Spaced repetition + notes app",
     "schemaId":"Sc4aB8nQ1r","hldId":"Hd9cT3vW6e",
     "createdAt":1792100000000,"updatedAt":1792100500000}

HGETALL ctx:u1:project:Pq7Zk2mLxa:toc
  Sc4aB8nQ1r → {"k":"schema","t":"Database schema","c":1792100000000}
  Hd9cT3vW6e → {"k":"hld","t":"HLD","c":1792100000000}
  Ld2xY5pK8s → {"k":"lld","t":"Zettelkasten notes","c":1792100200000}
  Lg7mN1qR4t → {"k":"lld","t":"Graph view","c":1792100400000}

GET ctx:u1:doc:Lg7mN1qR4t
  → {"id":"Lg7mN1qR4t","projectId":"Pq7Zk2mLxa","kind":"lld",
     "title":"Graph view","body":"# Graph view\n\n```\n┌──────┐ …",
     "createdAt":1792100400000,"updatedAt":1792100500000}
```

## 2.4 What each action writes

```
                         project  projects  toc        doc
Action                   JSON     set       hash       JSON
────────────────────────────────────────────────────────────────────
Create project           SET      SADD      HSET ×2    SET ×2 (schema, HLD)
Rename project           SET      ·         ·          ·
Add LLD                  SET*     ·         HSET       SET
Edit doc (body/title)    SET*     ·         HSET†      SET
Delete LLD               SET*     ·         HDEL       DEL
Delete project           DEL      SREM      DEL        DEL ×n
────────────────────────────────────────────────────────────────────
*  bumps project.updatedAt so the project list sorts by "last touched"
†  only when the title changed
Each row runs as one MULTI transaction.
```

## 2.5 Updated key map for the whole app

```
Accounts        user:{id}  user:email:{email}
Revision        item:{u}:{id}  user:{u}:items  streak:{u}
Memory palace   mp:{u}:{id}  user:{u}:mp-items
Zettelkasten    note:… source:… user:{u}:notes|zk-addr|zk-addr-next|zk-graph|sources
Context  NEW    ctx:{u}:projects  ctx:{u}:project:{pid}  ctx:{u}:project:{pid}:toc  ctx:{u}:doc:{did}
```

---

# Part 3 — LLD

## 3.1 Types (`lib/context/types.ts`)

```ts
export type DocKind = 'schema' | 'hld' | 'lld'

export type Project = {
  id: string
  userId: string
  name: string
  description?: string
  schemaId: string
  hldId: string
  createdAt: number
  updatedAt: number
}

export type ContextDoc = {
  id: string
  userId: string
  projectId: string
  kind: DocKind
  title: string
  body: string
  createdAt: number
  updatedAt: number
}

// One row of the left-hand menu (from the toc hash; no body).
export type TocEntry = { id: string; kind: DocKind; title: string; createdAt: number }

// The menu, already ordered: schema, HLD, then LLDs by creation time.
export type ProjectToc = { project: Project; entries: TocEntry[] }

export type ProjectSummary = Pick<Project, 'id' | 'name' | 'description' | 'updatedAt'> & {
  lldCount: number
}

export type CreateProjectInput = { name: string; description?: string }
export type UpdateProjectInput = { name?: string; description?: string | null }
export type CreateLldInput = { title: string; body?: string }
export type UpdateDocInput = {
  title?: string          // schema and HLD titles are fixed; only LLDs can be renamed
  body?: string
  expectedUpdatedAt?: number
  force?: boolean
}
```

## 3.2 Class model

```
┌─────────────────────────────┐       ┌──────────────────────────────────┐
│ «service» ContextService    │       │ «module» templates               │
│ createContextService(store, │──────▶│ schemaTemplate(projectName)      │
│                      now)   │ uses  │ hldTemplate(projectName)         │
├─────────────────────────────┤       │ lldTemplate(title)               │
│ + listProjects(u)           │       │ DIAGRAM_SNIPPETS: Snippet[]      │
│ + createProject(u, input)   │       └──────────────────────────────────┘
│ + updateProject(u, pid, in) │
│ + deleteProject(u, pid)     │       ┌──────────────────────────────────┐
│ + getToc(u, pid)            │──────▶│ «abstract» CtxError  status      │
│ + getDoc(u, pid, did)       │throws │  ▷ CtxNotFoundError       404    │
│ + addLld(u, pid, input)     │       │  ▷ CtxValidationError     400    │
│ + updateDoc(u, pid, did, in)│       │  ▷ CtxStaleWriteError     409    │
│ + deleteLld(u, pid, did)    │       │      (carries current doc)       │
│ + getPrintable(u, pid, did?)│       └──────────────────────────────────┘
└──────────────┬──────────────┘
               │ depends on (interfaces only)
┌──────────────▼──────────────────────────────────────────────────────────┐
│ «aggregate» CtxStore                                                     │
│   projects: ProjectRepository   docs: DocRepository   begin(): UnitOfWork│
└──────┬───────────────────────────────┬──────────────────────────┬───────┘
       │                               │                          │
┌──────▼───────────────────┐ ┌─────────▼────────────────┐ ┌───────▼──────────────────┐
│ «interface»              │ │ «interface»              │ │ «interface» UnitOfWork    │
│ ProjectRepository        │ │ DocRepository            │ │ putProject(p)             │
│ get(u, pid)              │ │ get(u, did)              │ │ deleteProject(u, pid)     │
│ listIds(u)               │ │ getMany(u, dids)         │ │ putDoc(doc)  (+toc entry) │
│ getMany(u, pids)         │ │ toc(u, pid): TocEntry[]  │ │ deleteDoc(u, pid, did)    │
│ tocSizes(u, pids)        │ │                          │ │ commit()   one MULTI      │
└──────────────────────────┘ └──────────────────────────┘ └───────────────────────────┘
       ▲  implemented by kvCtxStore (Redis) and createMemoryCtxStore() (tests)
```

Same pattern as before: interfaces in `repo.ts`, Redis in `kv-repo.ts`, a factory function for the service, real `class` only for errors. All of it is new code under `lib/context/`; none of it is imported from `lib/zk`.

## 3.3 Service rules (pseudo-code)

```
createProject(u, {name, description})
  validate name (1–80), description (≤300)
  pid, sid, hid = newId() ×3
  p   = Project{ id:pid, name, schemaId:sid, hldId:hid, … }
  s   = Doc{ id:sid, kind:'schema', title:'Database schema', body: schemaTemplate(name) }
  h   = Doc{ id:hid, kind:'hld',    title:'HLD',             body: hldTemplate(name) }
  uow.putProject(p); uow.putDoc(s); uow.putDoc(h); commit      ← one MULTI
  return p

addLld(u, pid, {title, body?})
  project must exist; title 1–120; ≤ 100 LLDs in toc
  d = Doc{ kind:'lld', title, body: body ?? lldTemplate(title) }
  uow.putDoc(d); uow.putProject(touch(project)); commit

updateDoc(u, pid, did, input)
  doc must exist and doc.projectId == pid          ← else 404
  if !force and expectedUpdatedAt ≠ doc.updatedAt → CtxStaleWriteError(doc)
  if title given and doc.kind ≠ 'lld'             → CtxValidationError
  next = {…doc, title?, body?, updatedAt: max(now, doc.updatedAt+1)}
  uow.putDoc(next); uow.putProject(touch(project)); commit

deleteLld(u, pid, did)
  doc.kind must be 'lld'                           ← schema/HLD can't be deleted
  uow.deleteDoc(u, pid, did); uow.putProject(touch(project)); commit

deleteProject(u, pid)
  ids = toc(u, pid)
  uow.deleteDoc(…) for each id; uow.deleteProject(u, pid); commit

getToc(u, pid)
  entries = toc hash → sorted: schema, hld, then LLDs by createdAt

getPrintable(u, pid, did?)
  did given  → [that doc]
  none       → all docs in toc order (whole project in one PDF)
```

## 3.4 Request sequence: saving an edit

```
 Editor            PATCH /api/context/docs/[did]    ContextService       KV (MULTI)
   │  Save (⌘S)              │                            │                  │
   │──{title?,body,──────────▶│                            │                  │
   │   expectedUpdatedAt}    │── getSession() ──┐         │                  │
   │                         │◀─────────────────┘         │                  │
   │                         │── updateDoc(u,pid,did,in) ─▶│                  │
   │                         │                            │── GET doc ──────▶│
   │                         │                            │◀─────────────────│
   │                         │                            │ updatedAt match? │
   │                         │                            │   no → 409 + doc │
   │                         │                            │── SET doc        │
   │                         │                            │   HSET toc       │
   │                         │                            │   SET project ──▶│ EXEC
   │◀──── 200 doc ───────────│◀───────── doc ─────────────│                  │
```

## 3.5 API

| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | `/api/context/projects` | — | `ProjectSummary[]` (newest first) |
| POST | `/api/context/projects` | `{name, description?}` | `201 Project` |
| GET | `/api/context/projects/[pid]` | — | `ProjectToc` |
| PATCH | `/api/context/projects/[pid]` | `{name?, description?}` | `Project` |
| DELETE | `/api/context/projects/[pid]` | — | `{ok}` |
| POST | `/api/context/projects/[pid]/docs` | `{title, body?}` (adds an LLD) | `201 ContextDoc` |
| GET | `/api/context/projects/[pid]/docs/[did]` | — | `ContextDoc` |
| PATCH | `/api/context/projects/[pid]/docs/[did]` | `UpdateDocInput` | `ContextDoc` · `409 {current}` |
| DELETE | `/api/context/projects/[pid]/docs/[did]` | — (LLDs only) | `{ok}` |

Errors: 401 without a session, 404 for an unknown project or document (or a document from another project), 400 for validation, 409 for a stale save.

## 3.6 Screens

**`/context`: project list**
```
┌───────────────────────────────────────────────────────────────┐
│ Context                                          3 projects   │
├───────────────────────────────────────────────────────────────┤
│ [ New project name…                    ] [ Create project ]   │
│                                                               │
│ MindGym                         4 LLDs        edited 2 d ago  │
│ Spaced repetition + notes app                                 │
│ ───────────────────────────────────────────────────────────── │
│ Payments service                1 LLD         edited 5 d ago  │
│ ───────────────────────────────────────────────────────────── │
│ URL shortener                   0 LLDs        edited 3 w ago  │
└───────────────────────────────────────────────────────────────┘
```

**`/context/[pid]/[did]`: project view (menu left, document right)**
```
┌──────────────────────┬───────────────────────────────────────────────┐
│ ← Context            │ HLD                    [Edit] [Download PDF ▾] │
│                      │ MindGym · edited 12 Oct                       │
│ MindGym          ⋯   │ ───────────────────────────────────────────── │
│                      │ ## Components                                 │
│ CORE                 │                                               │
│ ▸ Database schema    │  ┌─────────┐    ┌─────────┐    ┌─────────┐    │
│ ▸ HLD             ●  │  │  Pages  │───▶│   API   │───▶│ Service │    │
│                      │  └─────────┘    └─────────┘    └────┬────┘    │
│ LLDS                 │                                    ▼          │
│ ▸ Zettelkasten notes │                               ┌─────────┐     │
│ ▸ Graph view         │                               │   KV    │     │
│ ▸ Auth               │                               └─────────┘     │
│ + New LLD            │                                               │
│                      │ ## Data flow …                                │
└──────────────────────┴───────────────────────────────────────────────┘
```
- `/context/[pid]` with no document opens the HLD.
- The `⋯` menu next to the project name holds rename project, edit description, and delete project (with a confirmation that lists every document).
- In an LLD, the document header also has *Rename* and *Delete*.
- **Download PDF ▾** offers *This document* or *Whole project*.
- **On a phone:** the menu collapses into a "Documents ▾" picker above the document.

**Editor** (replaces the right side; the menu stays)
```
┌──────────────────────┬───────────────────────────────────────────────┐
│ (menu unchanged)     │ [Graph view            ]  title (LLDs only)   │
│                      │ Write · Preview     Diagram ▾   ┌─┐ │ ─ ▶ ▼ … │
│                      │ ┌───────────────────────────────────────────┐ │
│                      │ │ ## Flow                        monospace  │ │
│                      │ │ ```                            editor     │ │
│                      │ │ ┌──────┐     ┌──────┐                     │ │
│                      │ │ │ Page │────▶│ API  │                     │ │
│                      │ │ └──────┘     └──────┘                     │ │
│                      │ │ ```                                       │ │
│                      │ └───────────────────────────────────────────┘ │
│                      │ Unsaved changes · ⌘S        [Save] [Save & view] │
└──────────────────────┴───────────────────────────────────────────────┘
```

## 3.7 Diagram support (ASCII first)

| Feature | What it does |
|---|---|
| **Monospace everywhere** | JetBrains Mono (full box-drawing set) in the editor *and* in rendered code blocks, so a diagram lines up exactly as typed. |
| **No wrapping** | Code blocks keep `white-space: pre` and scroll sideways on narrow screens. Lines never re-flow and break a diagram. |
| **Character palette** | One-click insert of `┌ ┐ └ ┘ ─ │ ├ ┤ ┬ ┴ ┼ ═ ║ ▶ ◀ ▲ ▼ → ← ↑ ↓ ● ○ ◆ ·` at the caret. |
| **Diagram snippets** | "Diagram ▾" inserts a ready-made fenced block: box, flow (A → B → C), layers stack, sequence (lifelines), tree, table grid, state machine. You edit the labels. |
| **Editor keys** | Tab inserts 2 spaces (no focus jump). Typing over a diagram keeps columns because the editor is monospace. |
| **Tables** | GitHub-style markdown tables render as real tables (adds `remark-gfm`). This matters for schema docs. |
| **Mermaid (secondary)** | Optional ` ```mermaid ` blocks render as diagrams. The library (~1 MB) loads only when a document actually contains one. In the PDF they print as the rendered picture. |

## 3.8 Templates (what a new document starts with)

```
Database schema                HLD                          LLD: <title>
───────────────                ───                          ────────────
# Database schema              # HLD — <project>            # <title>
## Overview                    ## Goals / Non-goals         ## Requirements
## Entities / keys  (table)    ## Users                     ## Types
## Relationships (ASCII ER)    ## Components (ASCII boxes)  ## Classes (ASCII class box)
## What writes what            ## Data flow (ASCII flow)    ## Storage changes
## Example records             ## External services         ## Algorithms
                               ## Non-functional reqs       ## API (table)
                               ## Decisions (answered) and build notes

| Question | Decision |
|---|---|
| PDF | **Option A:** a print page (`/context/[pid]/print?doc=<id>\|all`) that opens the browser's save dialog |
| Mermaid | **Not included.** ASCII only. |
| Nav label | **Context** |
| LLD order in the menu | **By creation time** |

Build notes:
- **Templates:** they start with a one-line intro instead of a `#` heading, so the document title isn't shown twice.
- **Diagram line height:** fenced blocks use a line height of 1.25, so vertical box lines (`│`) join up across rows.
- **PDF:**
  - prints on white;
  - the file name comes from the page title (`<project> – <document>`);
  - on screen, a toolbar offers *Save as PDF* again and *Back to the document*.
- **Nav:** on phones the nav strip now wraps, because six entries no longer fit on one line at 390 px.
- **Isolation:** Context has its own UI helpers (`components/context/ui.ts`) and imports nothing from `lib/zk` or `components/zk`.
