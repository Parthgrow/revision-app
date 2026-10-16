import { customAlphabet } from 'nanoid'
import { CtxNotFoundError, CtxStaleWriteError, CtxValidationError } from './errors'
import type { CtxStore } from './repo'
import { hldTemplate, lldTemplate, schemaTemplate } from './templates'
import type {
  ContextDoc,
  CreateLldInput,
  CreateProjectInput,
  DocKind,
  Project,
  ProjectSummary,
  ProjectToc,
  TocEntry,
  UpdateDocInput,
  UpdateProjectInput,
} from './types'

export const CTX_LIMITS = {
  projectName: 80,
  description: 300,
  title: 120,
  body: 200_000,
  llds: 100,
} as const

export const newCtxId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 10)

const KIND_ORDER: Record<DocKind, number> = { schema: 0, hld: 1, lld: 2 }

// Menu order: schema, HLD, then LLDs by creation time (id breaks ties).
export function sortToc(entries: TocEntry[]): TocEntry[] {
  return [...entries].sort(
    (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1)
  )
}

function requiredText(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || !value.trim()) throw new CtxValidationError(`${field} is required`)
  const v = value.trim()
  if (v.length > max) throw new CtxValidationError(`${field} must be ${max} characters or fewer`)
  return v
}

function optionalText(value: unknown, field: string, max: number): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') throw new CtxValidationError(`${field} must be text`)
  const v = value.trim()
  if (v.length > max) throw new CtxValidationError(`${field} must be ${max} characters or fewer`)
  return v || undefined
}

// Tabs shift ASCII diagrams between viewers, so they are stored as 2 spaces.
function cleanBody(value: unknown): string {
  if (typeof value !== 'string') throw new CtxValidationError('body must be text')
  const body = value.replace(/\r\n?/g, '\n').replace(/\t/g, '  ')
  if (body.length > CTX_LIMITS.body) throw new CtxValidationError('This document is too long (200 KB maximum)')
  return body
}

export function createContextService(store: CtxStore, now: () => number = Date.now) {
  const { projects, docs } = store
  const next = (prev: number) => Math.max(now(), prev + 1)

  async function requireProject(userId: string, projectId: string): Promise<Project> {
    const p = await projects.get(userId, projectId)
    if (!p) throw new CtxNotFoundError('Project')
    return p
  }

  // A document only counts as found under its own project.
  async function requireDoc(userId: string, projectId: string, docId: string): Promise<ContextDoc> {
    const d = await docs.get(userId, docId)
    if (!d || d.projectId !== projectId) throw new CtxNotFoundError()
    return d
  }

  async function getToc(userId: string, projectId: string): Promise<ProjectToc> {
    const [project, entries] = await Promise.all([requireProject(userId, projectId), docs.toc(userId, projectId)])
    return { project, entries: sortToc(entries) }
  }

  return {
    async listProjects(userId: string): Promise<ProjectSummary[]> {
      const ids = await projects.listIds(userId)
      const [list, counts] = await Promise.all([projects.getMany(userId, ids), projects.docCounts(userId, ids)])
      return list
        .map((p) => ({
          id: p.id,
          name: p.name,
          ...(p.description && { description: p.description }),
          updatedAt: p.updatedAt,
          hldId: p.hldId,
          lldCount: Math.max(0, (counts.get(p.id) ?? 2) - 2),
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt)
    },

    // Creates the project together with its schema and HLD documents.
    async createProject(userId: string, input: CreateProjectInput): Promise<Project> {
      const name = requiredText(input?.name, 'Project name', CTX_LIMITS.projectName)
      const description = optionalText(input?.description, 'Description', CTX_LIMITS.description)
      const t = now()
      const project: Project = {
        id: newCtxId(),
        userId,
        name,
        ...(description && { description }),
        schemaId: newCtxId(),
        hldId: newCtxId(),
        createdAt: t,
        updatedAt: t,
      }
      const base = { userId, projectId: project.id, createdAt: t, updatedAt: t }
      const schema: ContextDoc = { ...base, id: project.schemaId, kind: 'schema', title: 'Database schema', body: schemaTemplate(name) }
      const hld: ContextDoc = { ...base, id: project.hldId, kind: 'hld', title: 'HLD', body: hldTemplate(name) }

      const uow = store.begin()
      uow.putProject(project)
      uow.putDoc(schema)
      uow.putDoc(hld)
      await uow.commit()
      return project
    },

    async updateProject(userId: string, projectId: string, input: UpdateProjectInput): Promise<Project> {
      const p = await requireProject(userId, projectId)
      const updated: Project = { ...p, updatedAt: next(p.updatedAt) }
      if (input?.name !== undefined) updated.name = requiredText(input.name, 'Project name', CTX_LIMITS.projectName)
      if (input?.description !== undefined) {
        const d = optionalText(input.description, 'Description', CTX_LIMITS.description)
        if (d) updated.description = d
        else delete updated.description
      }
      const uow = store.begin()
      uow.putProject(updated)
      await uow.commit()
      return updated
    },

    async deleteProject(userId: string, projectId: string): Promise<void> {
      await requireProject(userId, projectId)
      const entries = await docs.toc(userId, projectId)
      const uow = store.begin()
      for (const e of entries) uow.deleteDoc(userId, projectId, e.id)
      uow.deleteProject(userId, projectId)
      await uow.commit()
    },

    getToc,

    async getDoc(userId: string, projectId: string, docId: string): Promise<ContextDoc> {
      return requireDoc(userId, projectId, docId)
    },

    async addLld(userId: string, projectId: string, input: CreateLldInput): Promise<ContextDoc> {
      const project = await requireProject(userId, projectId)
      const title = requiredText(input?.title, 'Title', CTX_LIMITS.title)
      const lldCount = (await docs.toc(userId, projectId)).filter((e) => e.kind === 'lld').length
      if (lldCount >= CTX_LIMITS.llds) throw new CtxValidationError(`A project can have at most ${CTX_LIMITS.llds} LLDs`)
      const t = next(project.updatedAt)
      const doc: ContextDoc = {
        id: newCtxId(),
        userId,
        projectId,
        kind: 'lld',
        title,
        body: input.body !== undefined ? cleanBody(input.body) : lldTemplate(title),
        createdAt: t,
        updatedAt: t,
      }
      const uow = store.begin()
      uow.putDoc(doc)
      uow.putProject({ ...project, updatedAt: t })
      await uow.commit()
      return doc
    },

    // Stale-save protection: an editor sends the updatedAt it loaded; a newer
    // stored version is reported (409) instead of overwritten, unless force.
    async updateDoc(userId: string, projectId: string, docId: string, input: UpdateDocInput): Promise<ContextDoc> {
      const project = await requireProject(userId, projectId)
      const doc = await requireDoc(userId, projectId, docId)
      if (!input?.force && input?.expectedUpdatedAt !== undefined && input.expectedUpdatedAt !== doc.updatedAt) {
        throw new CtxStaleWriteError(doc)
      }
      const updated: ContextDoc = { ...doc, updatedAt: next(doc.updatedAt) }
      if (input?.title !== undefined && input.title.trim() !== doc.title) {
        if (doc.kind !== 'lld') throw new CtxValidationError('The schema and HLD titles are fixed')
        updated.title = requiredText(input.title, 'Title', CTX_LIMITS.title)
      }
      if (input?.body !== undefined) updated.body = cleanBody(input.body)

      const uow = store.begin()
      uow.putDoc(updated)
      uow.putProject({ ...project, updatedAt: next(project.updatedAt) })
      await uow.commit()
      return updated
    },

    async deleteLld(userId: string, projectId: string, docId: string): Promise<void> {
      const project = await requireProject(userId, projectId)
      const doc = await requireDoc(userId, projectId, docId)
      if (doc.kind !== 'lld') throw new CtxValidationError('The schema and HLD documents can’t be deleted')
      const uow = store.begin()
      uow.deleteDoc(userId, projectId, docId)
      uow.putProject({ ...project, updatedAt: next(project.updatedAt) })
      await uow.commit()
    },

    // Documents for the print page: one, or the whole project in menu order.
    async getPrintable(userId: string, projectId: string, docId?: string) {
      const { project, entries } = await getToc(userId, projectId)
      if (docId) return { project, docs: [await requireDoc(userId, projectId, docId)] }
      const loaded = await docs.getMany(userId, entries.map((e) => e.id))
      const byId = new Map(loaded.map((d) => [d.id, d]))
      return { project, docs: entries.map((e) => byId.get(e.id)).filter((d): d is ContextDoc => !!d) }
    },
  }
}

export type ContextService = ReturnType<typeof createContextService>
