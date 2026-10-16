import type { ContextDoc, Project, TocEntry } from './types'

// Storage seams for Context. The service depends only on these; production
// uses Redis (kv-repo.ts), tests use createMemoryCtxStore().

export interface ProjectRepository {
  get(userId: string, projectId: string): Promise<Project | null>
  listIds(userId: string): Promise<string[]>
  getMany(userId: string, projectIds: string[]): Promise<Project[]>
  // Number of documents (toc entries) per project.
  docCounts(userId: string, projectIds: string[]): Promise<Map<string, number>>
}

export interface DocRepository {
  get(userId: string, docId: string): Promise<ContextDoc | null>
  getMany(userId: string, docIds: string[]): Promise<ContextDoc[]>
  toc(userId: string, projectId: string): Promise<TocEntry[]> // unordered
}

// Multi-key writes queued and applied together in commit() (one MULTI), so a
// document and its table-of-contents entry never disagree.
export interface UnitOfWork {
  putProject(project: Project): void
  deleteProject(userId: string, projectId: string): void // project, toc, set entry
  putDoc(doc: ContextDoc): void // doc + its toc entry
  deleteDoc(userId: string, projectId: string, docId: string): void // doc + toc entry
  commit(): Promise<void>
}

export type CtxStore = {
  projects: ProjectRepository
  docs: DocRepository
  begin(): UnitOfWork
}

export const tocEntryOf = (d: ContextDoc): TocEntry => ({
  id: d.id,
  kind: d.kind,
  title: d.title,
  createdAt: d.createdAt,
})

// --- In-memory implementation (tests) ---

export function createMemoryCtxStore(): CtxStore {
  const projects = new Map<string, Project>() // `${u}:${pid}`
  const projectSets = new Map<string, Set<string>>() // u → pids
  const docs = new Map<string, ContextDoc>() // `${u}:${did}`
  const tocs = new Map<string, Map<string, TocEntry>>() // `${u}:${pid}` → did → entry

  const k = (u: string, id: string) => `${u}:${id}`
  const clone = <T>(v: T): T => structuredClone(v)
  const tocOf = (u: string, pid: string) => {
    if (!tocs.has(k(u, pid))) tocs.set(k(u, pid), new Map())
    return tocs.get(k(u, pid))!
  }

  return {
    projects: {
      async get(u, pid) {
        const p = projects.get(k(u, pid))
        return p ? clone(p) : null
      },
      async listIds(u) {
        return [...(projectSets.get(u) ?? [])]
      },
      async getMany(u, pids) {
        return pids.map((pid) => projects.get(k(u, pid))).filter(Boolean).map((p) => clone(p!))
      },
      async docCounts(u, pids) {
        return new Map(pids.map((pid) => [pid, tocs.get(k(u, pid))?.size ?? 0]))
      },
    },
    docs: {
      async get(u, did) {
        const d = docs.get(k(u, did))
        return d ? clone(d) : null
      },
      async getMany(u, dids) {
        return dids.map((did) => docs.get(k(u, did))).filter(Boolean).map((d) => clone(d!))
      },
      async toc(u, pid) {
        return [...(tocs.get(k(u, pid))?.values() ?? [])].map(clone)
      },
    },
    begin() {
      const ops: (() => void)[] = []
      return {
        putProject: (p) =>
          ops.push(() => {
            projects.set(k(p.userId, p.id), clone(p))
            if (!projectSets.has(p.userId)) projectSets.set(p.userId, new Set())
            projectSets.get(p.userId)!.add(p.id)
          }),
        deleteProject: (u, pid) =>
          ops.push(() => {
            projects.delete(k(u, pid))
            tocs.delete(k(u, pid))
            projectSets.get(u)?.delete(pid)
          }),
        putDoc: (d) =>
          ops.push(() => {
            docs.set(k(d.userId, d.id), clone(d))
            tocOf(d.userId, d.projectId).set(d.id, tocEntryOf(d))
          }),
        deleteDoc: (u, pid, did) =>
          ops.push(() => {
            docs.delete(k(u, did))
            tocs.get(k(u, pid))?.delete(did)
          }),
        async commit() {
          ops.forEach((op) => op())
        },
      }
    },
  }
}
