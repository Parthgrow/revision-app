// Context: projects that hold design documents. A separate module — nothing
// here is shared with or imported from the Zettelkasten (lib/zk).

export type DocKind = 'schema' | 'hld' | 'lld'

export type Project = {
  id: string
  userId: string
  name: string
  description?: string
  schemaId: string // set once at creation; the project's only schema doc
  hldId: string    // set once at creation; the project's only HLD doc
  createdAt: number
  updatedAt: number
}

export type ContextDoc = {
  id: string
  userId: string
  projectId: string
  kind: DocKind
  title: string
  body: string // markdown; diagrams are ASCII inside fenced blocks
  createdAt: number
  updatedAt: number // also the stale-save check
}

// One row of the document menu, read from the table-of-contents hash (no body).
export type TocEntry = { id: string; kind: DocKind; title: string; createdAt: number }

// Menu order: schema, HLD, then LLDs by creation time.
export type ProjectToc = { project: Project; entries: TocEntry[] }

export type ProjectSummary = Pick<Project, 'id' | 'name' | 'description' | 'updatedAt' | 'hldId'> & {
  lldCount: number
}

export type CreateProjectInput = { name: string; description?: string }
export type UpdateProjectInput = { name?: string; description?: string | null }
export type CreateLldInput = { title: string; body?: string }
export type UpdateDocInput = {
  title?: string // LLDs only; schema and HLD titles are fixed
  body?: string
  expectedUpdatedAt?: number
  force?: boolean
}
