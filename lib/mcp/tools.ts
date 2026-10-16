import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { CtxError, CtxStaleWriteError } from '@/lib/context/errors'
import type { ContextService } from '@/lib/context/service'
import type { ContextDoc, Project } from '@/lib/context/types'

// Claude connector tools for Context documents. They call the same
// ContextService as the web app, so every rule (schema/HLD fixed, limits,
// stale-save protection) applies here too, and edits show up in the app
// immediately. Deleting documents or projects stays web-only.

type Ctx = { userId: string; service: ContextService; appUrl: string }

const KIND_LABEL = { schema: 'database schema', hld: 'HLD', lld: 'LLD' } as const

const projectRef = z
  .string()
  .min(1)
  .describe('Project id, or the project name (case-insensitive), e.g. "MindGym".')
const documentRef = z
  .string()
  .min(1)
  .describe('Document id, "schema", "hld", or an LLD title (case-insensitive), e.g. "Graph view".')
const expectedUpdatedAt = z
  .number()
  .int()
  .optional()
  .describe(
    'The updatedAt value from read_document. If the document was edited since (for example in the browser), the change is refused instead of overwriting it.'
  )

function json(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] }
}

function error(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true }
}

// Service errors become readable tool errors; anything else is a real bug.
async function run<T>(fn: () => Promise<T>) {
  try {
    return json(await fn())
  } catch (err) {
    if (err instanceof CtxStaleWriteError) {
      return error(
        `This document was changed since you read it (now updatedAt ${err.current.updatedAt}). Call read_document again, then retry the edit against the current text.`
      )
    }
    if (err instanceof CtxError) return error(err.message)
    throw err
  }
}

export function registerContextTools(server: McpServer, { userId, service, appUrl }: Ctx) {
  const docUrl = (pid: string, did: string) => `${appUrl}/context/${pid}/${did}`
  const docSummary = (p: Project, d: ContextDoc) => ({
    id: d.id,
    kind: d.kind,
    title: d.title,
    updatedAt: d.updatedAt,
    url: docUrl(p.id, d.id),
  })

  server.registerTool(
    'list_projects',
    {
      description: 'List your Context projects, most recently edited first, with how many LLDs each has.',
      annotations: { readOnlyHint: true },
    },
    async () =>
      run(async () => {
        const list = await service.listProjects(userId)
        return {
          count: list.length,
          projects: list.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description ?? null,
            lldCount: p.lldCount,
            updatedAt: p.updatedAt,
            url: docUrl(p.id, p.hldId),
          })),
        }
      })
  )

  server.registerTool(
    'get_project',
    {
      description:
        'Show one project and its documents: the database schema, the HLD, and every LLD (in creation order), with ids and titles. Does not include document text; use read_document for that.',
      inputSchema: { project: projectRef },
      annotations: { readOnlyHint: true },
    },
    async ({ project }) =>
      run(async () => {
        const p = await service.findProject(userId, project)
        const { entries } = await service.getToc(userId, p.id)
        return {
          project: { id: p.id, name: p.name, description: p.description ?? null, updatedAt: p.updatedAt },
          documents: entries.map((e) => ({ id: e.id, kind: e.kind, title: e.title, url: docUrl(p.id, e.id) })),
        }
      })
  )

  server.registerTool(
    'read_document',
    {
      description:
        'Read the full markdown of one document. Diagrams are ASCII inside fenced ``` blocks. Keep the returned updatedAt to pass as expected_updated_at when editing.',
      inputSchema: { project: projectRef, document: documentRef },
      annotations: { readOnlyHint: true },
    },
    async ({ project, document }) =>
      run(async () => {
        const p = await service.findProject(userId, project)
        const d = await service.findDoc(userId, p.id, document)
        return { project: { id: p.id, name: p.name }, document: { ...docSummary(p, d), body: d.body } }
      })
  )

  server.registerTool(
    'create_project',
    {
      description:
        'Create a project. It starts with a database schema document and an HLD document, both filled from templates.',
      inputSchema: {
        name: z.string().min(1).max(80),
        description: z.string().max(300).optional().describe('One line about the project.'),
      },
    },
    async ({ name, description }) =>
      run(async () => {
        const p = await service.createProject(userId, { name, description })
        const { entries } = await service.getToc(userId, p.id)
        return {
          project: { id: p.id, name: p.name },
          documents: entries.map((e) => ({ id: e.id, kind: e.kind, title: e.title, url: docUrl(p.id, e.id) })),
        }
      })
  )

  server.registerTool(
    'create_lld',
    {
      description:
        'Add an LLD (low-level design) document to a project. Without a body it starts from the LLD template. Write diagrams as ASCII in fenced ``` blocks, using box-drawing characters (┌ ─ ┐ │ └ ┘ ▶).',
      inputSchema: {
        project: projectRef,
        title: z.string().min(1).max(120),
        body: z.string().optional().describe('Markdown. Omit to start from the template.'),
      },
    },
    async ({ project, title, body }) =>
      run(async () => {
        const p = await service.findProject(userId, project)
        const d = await service.addLld(userId, p.id, { title, body })
        return { created: docSummary(p, d) }
      })
  )

  server.registerTool(
    'edit_document',
    {
      description:
        'Change one passage of a document: replace old_text with new_text. old_text must match the current text exactly and occur once, so include enough surrounding lines to make it unique. Prefer this over update_document for anything short of a rewrite.',
      inputSchema: {
        project: projectRef,
        document: documentRef,
        old_text: z.string().min(1).describe('Exact text to replace, copied from read_document.'),
        new_text: z.string().describe('Replacement text (may be empty to delete the passage).'),
        expected_updated_at: expectedUpdatedAt,
      },
      annotations: { idempotentHint: false },
    },
    async ({ project, document, old_text, new_text, expected_updated_at }) =>
      run(async () => {
        const p = await service.findProject(userId, project)
        const d = await service.findDoc(userId, p.id, document)
        const saved = await service.replaceInDoc(userId, p.id, d.id, old_text, new_text, expected_updated_at)
        return { saved: docSummary(p, saved) }
      })
  )

  server.registerTool(
    'update_document',
    {
      description:
        'Replace the whole text of a document (the schema, the HLD, or an LLD). For smaller changes use edit_document instead.',
      inputSchema: {
        project: projectRef,
        document: documentRef,
        body: z.string().describe('The complete new markdown.'),
        expected_updated_at: expectedUpdatedAt,
      },
      annotations: { idempotentHint: true },
    },
    async ({ project, document, body, expected_updated_at }) =>
      run(async () => {
        const p = await service.findProject(userId, project)
        const d = await service.findDoc(userId, p.id, document)
        const saved = await service.updateDoc(userId, p.id, d.id, { body, expectedUpdatedAt: expected_updated_at })
        return { saved: docSummary(p, saved) }
      })
  )

  server.registerTool(
    'rename_lld',
    {
      description: `Rename an LLD. The ${KIND_LABEL.schema} and ${KIND_LABEL.hld} keep their fixed titles.`,
      inputSchema: { project: projectRef, document: documentRef, new_title: z.string().min(1).max(120) },
      annotations: { idempotentHint: true },
    },
    async ({ project, document, new_title }) =>
      run(async () => {
        const p = await service.findProject(userId, project)
        const d = await service.findDoc(userId, p.id, document)
        const saved = await service.updateDoc(userId, p.id, d.id, { title: new_title })
        return { saved: docSummary(p, saved) }
      })
  )
}
