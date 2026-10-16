import { isValidAddress, parentAddress } from './address'
import type { EdgeKind, Graph, GraphEntry, GraphOptions, Note, NoteType } from './types'
import { NOTE_TYPES } from './types'

export function toGraphEntry(note: Note): GraphEntry {
  return {
    t: note.title,
    y: note.type,
    ...(note.address && { a: note.address }),
    g: note.tags,
    l: note.links,
  }
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

// Turns index cards into nodes and edges. Link targets that no longer exist
// (or are filtered out) are skipped; a link and a Folgezettel connection
// between the same two notes become one edge with both kinds.
export function buildGraph(entries: Record<string, GraphEntry>, opts: GraphOptions = {}): Graph {
  const sequence = opts.sequence ?? true
  const keep = Object.keys(entries).filter((id) => {
    const e = entries[id]
    if (opts.types && !opts.types.includes(e.y)) return false
    if (opts.tag && !e.g.includes(opts.tag)) return false
    return true
  })
  const kept = new Set(keep)

  const byAddress = new Map<string, string>()
  for (const id of keep) {
    const a = entries[id].a
    if (a) byAddress.set(a, id)
  }

  const pairs = new Map<string, Set<EdgeKind>>()
  const add = (a: string, b: string, kind: EdgeKind) => {
    const key = pairKey(a, b)
    if (!pairs.has(key)) pairs.set(key, new Set())
    pairs.get(key)!.add(kind)
  }

  for (const id of keep) {
    const e = entries[id]
    for (const target of e.l) {
      if (target !== id && kept.has(target)) add(id, target, 'link')
    }
    if (sequence && e.a && isValidAddress(e.a)) {
      const parent = parentAddress(e.a)
      const parentId = parent ? byAddress.get(parent) : undefined
      if (parentId && parentId !== id) add(parentId, id, 'sequence')
    }
  }

  const degree = new Map<string, number>(keep.map((id) => [id, 0]))
  const edges = [...pairs].map(([key, kinds]) => {
    const [source, target] = key.split('|')
    degree.set(source, degree.get(source)! + 1)
    degree.set(target, degree.get(target)! + 1)
    return { source, target, kinds: [...kinds].sort() as EdgeKind[] }
  })

  const nodes = keep
    .filter((id) => !opts.hideOrphans || degree.get(id)! > 0)
    .map((id) => ({
      id,
      title: entries[id].t,
      type: entries[id].y,
      ...(entries[id].a && { address: entries[id].a }),
      tags: entries[id].g,
      degree: degree.get(id)!,
    }))
    .sort((a, b) => (a.id < b.id ? -1 : 1))

  edges.sort((a, b) => (pairKey(a.source, a.target) < pairKey(b.source, b.target) ? -1 : 1))
  return { nodes, edges }
}

// A fixed starting point per note, so the same collection lays out the same
// way on every visit without storing positions. FNV-1a hash → angle + radius.
export function seedPosition(id: string, spread = 300): [number, number] {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  const angle = ((h & 0xffff) / 0xffff) * Math.PI * 2
  const radius = Math.sqrt((h >>> 16) / 0xffff) * spread
  return [Math.cos(angle) * radius, Math.sin(angle) * radius]
}

// Reads filters from URL query parameters (shared by the page and the API):
// sequence=0|1, types=permanent,structure, tag=x, orphans=1
export function graphOptionsFrom(get: (key: string) => string | null | undefined): GraphOptions {
  const types = get('types')
    ?.split(',')
    .filter((t): t is NoteType => (NOTE_TYPES as string[]).includes(t))
  return {
    sequence: get('sequence') !== '0',
    ...(types && types.length > 0 && { types }),
    ...(get('tag') && { tag: get('tag')! }),
    hideOrphans: get('orphans') === '1',
  }
}
