import { customAlphabet } from 'nanoid'
import { childAddress, compareAddresses, isValidAddress, parentAddress } from './address'
import { NotFoundError, StaleWriteError, ValidationError, AddressTakenError } from './errors'
import { extractIds, formatLink, NOTE_ID_LENGTH } from './links'
import type { ZkStore } from './repo'
import type {
  CreateNoteInput,
  CreateSourceInput,
  Note,
  NoteSummary,
  NoteType,
  NoteView,
  Sequence,
  Source,
  UpdateNoteInput,
} from './types'
import { NOTE_TYPES, PROMOTIONS } from './types'
import { summarize } from './summary'

export const LIMITS = {
  title: 200,
  body: 50_000,
  tags: 20,
} as const

const TAG_RE = /^[a-z0-9-]{1,40}$/

export const newNoteId = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  NOTE_ID_LENGTH
)

export type SummaryFilter = { type?: NoteType; tag?: string; orphans?: boolean }

// --- validation helpers ---

function normalizeTags(tags: unknown): string[] {
  if (tags === undefined) return []
  if (!Array.isArray(tags)) throw new ValidationError('tags must be an array')
  const out = [...new Set(tags.map((t) => String(t).trim().toLowerCase().replace(/^#/, '')).filter(Boolean))]
  if (out.length > LIMITS.tags) throw new ValidationError(`At most ${LIMITS.tags} tags`)
  const bad = out.find((t) => !TAG_RE.test(t))
  if (bad) throw new ValidationError(`Invalid tag "${bad}": use a-z, 0-9 and -`)
  return out
}

function checkBody(body: unknown): string {
  if (typeof body !== 'string') throw new ValidationError('body must be a string')
  if (body.length > LIMITS.body) throw new ValidationError('Note body is too long')
  return body
}

function deriveTitle(title: unknown, body: string): string {
  const raw = typeof title === 'string' && title.trim() ? title : body.split('\n').find((l) => l.trim()) ?? ''
  const clean = raw.replace(/^#+\s*/, '').replace(/\[\[[A-Za-z0-9]+\|?([^\]]*)\]\]/g, '$1').trim()
  if (!clean) throw new ValidationError('A note needs a title or some text')
  if (clean.length > LIMITS.title) {
    if (typeof title === 'string' && title.trim()) throw new ValidationError('Title is too long')
    return clean.slice(0, 120).trimEnd() + '…'
  }
  return clean
}

// --- service ---

export function createNoteService(store: ZkStore, now: () => number = Date.now) {
  const { notes, links, addresses, sources } = store

  async function resolveLinks(userId: string, selfId: string, body: string): Promise<string[]> {
    const candidates = extractIds(body).filter((id) => id !== selfId)
    const found = await notes.existing(userId, candidates)
    return candidates.filter((id) => found.has(id))
  }

  async function requireNote(userId: string, id: string): Promise<Note> {
    const note = await notes.get(userId, id)
    if (!note) throw new NotFoundError()
    return note
  }

  async function requireSource(userId: string, id: unknown): Promise<string> {
    if (typeof id !== 'string' || !(await sources.get(userId, id))) throw new ValidationError('Source not found')
    return id
  }

  // INCR the parent's counter until an unclaimed address comes up. Hand-picked
  // addresses can occupy a slot the counter hasn't reached yet, hence the loop.
  async function allocateAddress(userId: string, parent: string | null, id: string): Promise<string> {
    for (let attempt = 0; attempt < 50; attempt++) {
      const addr = childAddress(parent, await addresses.nextChildIndex(userId, parent))
      if (await addresses.claim(userId, addr, id)) return addr
    }
    throw new AddressTakenError(`next child of ${parent ?? 'top level'}`)
  }

  // Writes a brand-new note. If anything fails after an address was claimed,
  // the address is released again so it doesn't point at nothing.
  async function insert(userId: string, input: CreateNoteInput, address?: { parent: string | null } | string) {
    const body = checkBody(input.body ?? '')
    const type: NoteType = input.type ?? 'fleeting'
    if (!NOTE_TYPES.includes(type)) throw new ValidationError('Unknown note type')
    const sourceId = input.sourceId ? await requireSource(userId, input.sourceId) : undefined
    if (type === 'literature' && !sourceId) throw new ValidationError('A literature note needs a source')

    const id = newNoteId()
    const t = now()
    const note: Note = {
      id,
      userId,
      type,
      title: deriveTitle(input.title, body),
      body,
      tags: normalizeTags(input.tags),
      links: await resolveLinks(userId, id, body),
      ...(sourceId && { sourceId }),
      createdAt: t,
      updatedAt: t,
    }

    if (typeof address === 'string') {
      if (!isValidAddress(address)) throw new ValidationError(`Invalid address "${address}"`)
      if (!(await addresses.claim(userId, address, id))) throw new AddressTakenError(address)
      note.address = address
    } else if (address) {
      note.address = await allocateAddress(userId, address.parent, id)
    }

    try {
      const uow = store.begin()
      uow.putNote(note)
      for (const target of note.links) uow.addBacklink(userId, target, id)
      if (sourceId) uow.linkSource(userId, sourceId, id)
      await uow.commit()
    } catch (err) {
      if (note.address) await addresses.release(userId, note.address)
      throw err
    }
    return note
  }

  async function summariesFor(userId: string, list: Note[]): Promise<NoteSummary[]> {
    return Promise.all(list.map(async (n) => summarize(n, (await links.backlinks(userId, n.id)).length)))
  }

  async function buildSequence(userId: string, address: string | undefined): Promise<Sequence> {
    const empty: Sequence = { parent: null, prev: null, next: null, children: [] }
    if (!address) return empty
    const map = await addresses.listAll(userId)
    const parent = parentAddress(address)
    const siblings = Object.keys(map)
      .filter((a) => parentAddress(a) === parent)
      .sort(compareAddresses)
    const i = siblings.indexOf(address)
    const children = Object.keys(map)
      .filter((a) => parentAddress(a) === address)
      .sort(compareAddresses)

    const wanted = [parent, siblings[i - 1], siblings[i + 1], ...children].filter(
      (a): a is string => !!a && !!map[a]
    )
    const found = await notes.getMany(userId, [...new Set(wanted.map((a) => map[a]))])
    const byId = new Map((await summariesFor(userId, found)).map((s) => [s.id, s]))
    const at = (a: string | null | undefined) => (a && map[a] ? byId.get(map[a]) ?? null : null)

    return {
      parent: at(parent),
      prev: i > 0 ? at(siblings[i - 1]) : null,
      next: at(siblings[i + 1]),
      children: children.map(at).filter((s): s is NoteSummary => !!s),
    }
  }

  return {
    async get(userId: string, id: string): Promise<Note> {
      return requireNote(userId, id)
    },

    async create(userId: string, input: CreateNoteInput): Promise<Note> {
      if (input.address) return insert(userId, input, input.address)
      return insert(userId, input, input.withAddress ? { parent: null } : undefined)
    },

    async update(userId: string, id: string, input: UpdateNoteInput): Promise<Note> {
      const old = await requireNote(userId, id)
      if (!input.force && input.expectedUpdatedAt !== undefined && input.expectedUpdatedAt !== old.updatedAt) {
        throw new StaleWriteError(old)
      }

      const body = input.body !== undefined ? checkBody(input.body) : old.body
      const next: Note = {
        ...old,
        body,
        title: input.title !== undefined || input.body !== undefined ? deriveTitle(input.title ?? old.title, body) : old.title,
        tags: input.tags !== undefined ? normalizeTags(input.tags) : old.tags,
        links: input.body !== undefined ? await resolveLinks(userId, id, body) : old.links,
        // Strictly increasing, so two saves in the same millisecond still differ.
        updatedAt: Math.max(now(), old.updatedAt + 1),
      }

      if (input.sourceId !== undefined) {
        if (input.sourceId === null) delete next.sourceId
        else next.sourceId = await requireSource(userId, input.sourceId)
      }
      if (next.type === 'literature' && !next.sourceId) throw new ValidationError('A literature note needs a source')

      const added = next.links.filter((l) => !old.links.includes(l))
      const removed = old.links.filter((l) => !next.links.includes(l))

      const uow = store.begin()
      uow.putNote(next)
      for (const t of added) uow.addBacklink(userId, t, id)
      for (const t of removed) uow.removeBacklink(userId, t, id)
      if (old.sourceId !== next.sourceId) {
        if (old.sourceId) uow.unlinkSource(userId, old.sourceId, id)
        if (next.sourceId) uow.linkSource(userId, next.sourceId, id)
      }
      await uow.commit()
      return next
    },

    // With dryRun, reports which notes would be left with a broken link and
    // changes nothing — the UI shows this before asking for confirmation.
    async delete(userId: string, id: string, opts: { dryRun?: boolean } = {}) {
      const note = await requireNote(userId, id)
      const incoming = await links.backlinks(userId, id)
      const brokenIncoming = await summariesFor(userId, await notes.getMany(userId, incoming))
      if (opts.dryRun) return { brokenIncoming }

      const uow = store.begin()
      uow.deleteNote(userId, id)
      for (const t of note.links) uow.removeBacklink(userId, t, id)
      if (note.sourceId) uow.unlinkSource(userId, note.sourceId, id)
      await uow.commit()
      // The address is freed in the hash but its counter slot is never reissued.
      if (note.address) await addresses.release(userId, note.address)
      return { brokenIncoming }
    },

    // "Continue this thought": a new note filed as the next Folgezettel child
    // of `parentId`. A parent without an address first gets a top-level one.
    async continueThought(userId: string, parentId: string, input: Partial<CreateNoteInput>): Promise<Note> {
      let parent = await requireNote(userId, parentId)
      if (!parent.address) {
        const address = await allocateAddress(userId, null, parent.id)
        // Another request may have addressed the parent meanwhile; keep theirs.
        const latest = await requireNote(userId, parentId)
        if (latest.address) {
          await addresses.release(userId, address)
          parent = latest
        } else {
          parent = { ...latest, address }
          const uow = store.begin()
          uow.putNote(parent) // updatedAt untouched: an address isn't an edit
          await uow.commit()
        }
      }
      const body = input.body?.trim() ? input.body : `Continues ${formatLink(parent.id, parent.title)}\n\n`
      return insert(
        userId,
        {
          ...input,
          type: input.type ?? (parent.type === 'fleeting' ? 'fleeting' : 'permanent'),
          body,
        },
        { parent: parent.address! }
      )
    },

    async promote(userId: string, id: string, to: NoteType, sourceId?: string): Promise<Note> {
      const note = await requireNote(userId, id)
      if (!PROMOTIONS[note.type].includes(to)) {
        throw new ValidationError(`A ${note.type} note can't become ${to}`)
      }
      const next: Note = { ...note, type: to, updatedAt: Math.max(now(), note.updatedAt + 1) }
      const uow = store.begin()
      if (to === 'literature') {
        next.sourceId = await requireSource(userId, sourceId ?? note.sourceId)
        if (next.sourceId !== note.sourceId) {
          if (note.sourceId) uow.unlinkSource(userId, note.sourceId, id)
          uow.linkSource(userId, next.sourceId, id)
        }
      }
      uow.putNote(next)
      await uow.commit()
      return next
    },

    async getView(userId: string, id: string): Promise<NoteView> {
      const note = await requireNote(userId, id)
      const [outgoing, backlinkIds, sequence, source] = await Promise.all([
        notes.getMany(userId, note.links),
        links.backlinks(userId, id),
        buildSequence(userId, note.address),
        note.sourceId ? sources.get(userId, note.sourceId) : Promise.resolve(null),
      ])
      const incoming = await notes.getMany(userId, backlinkIds)
      const live = new Set(outgoing.map((n) => n.id))
      return {
        note,
        outgoing: await summariesFor(userId, outgoing),
        backlinks: (await summariesFor(userId, incoming)).sort((a, b) => b.updatedAt - a.updatedAt),
        brokenLinks: extractIds(note.body).filter((l) => l !== id && !live.has(l)),
        sequence,
        source,
      }
    },

    async listSummaries(userId: string, filter: SummaryFilter = {}): Promise<NoteSummary[]> {
      const all = await notes.listAll(userId)
      // Backlink counts by inverting everyone's `links` — we hold every note
      // already, so this beats one SMEMBERS per note.
      const incoming = new Map<string, number>()
      for (const n of all) for (const t of n.links) incoming.set(t, (incoming.get(t) ?? 0) + 1)

      return all
        .map((n) => summarize(n, incoming.get(n.id) ?? 0))
        .filter((s) => !filter.type || s.type === filter.type)
        .filter((s) => !filter.tag || s.tags.includes(filter.tag))
        .filter((s) => !filter.orphans || (s.type === 'permanent' && s.linkCount === 0 && s.backlinkCount === 0))
        .sort((a, b) => b.updatedAt - a.updatedAt)
    },

    // Sets fields that aren't user edits (e.g. reviewItemId) without bumping
    // updatedAt, so an editor open elsewhere doesn't see a false conflict.
    async patchMeta(userId: string, id: string, patch: Pick<Partial<Note>, 'reviewItemId'>): Promise<Note> {
      const note = await requireNote(userId, id)
      const next: Note = { ...note, ...patch }
      if (patch.reviewItemId === undefined) delete next.reviewItemId
      const uow = store.begin()
      uow.putNote(next)
      await uow.commit()
      return next
    },

    // --- sources ---

    async createSource(userId: string, input: CreateSourceInput): Promise<Source> {
      const title = typeof input.title === 'string' ? input.title.trim() : ''
      if (!title) throw new ValidationError('A source needs a title')
      if (title.length > LIMITS.title) throw new ValidationError('Title is too long')
      const year = input.year ? Number(input.year) : undefined
      if (year !== undefined && !Number.isInteger(year)) throw new ValidationError('Year must be a number')
      const source: Source = {
        id: newNoteId(),
        userId,
        title,
        ...(input.author?.trim() && { author: input.author.trim() }),
        ...(input.url?.trim() && { url: input.url.trim() }),
        ...(year !== undefined && { year }),
        createdAt: now(),
      }
      const uow = store.begin()
      uow.putSource(source)
      await uow.commit()
      return source
    },

    async listSources(userId: string): Promise<Source[]> {
      return (await sources.list(userId)).sort((a, b) => a.title.localeCompare(b.title))
    },

    async getSource(userId: string, id: string): Promise<{ source: Source; notes: NoteSummary[] }> {
      const source = await sources.get(userId, id)
      if (!source) throw new NotFoundError('Source')
      const cited = await notes.getMany(userId, await sources.noteIds(userId, id))
      return { source, notes: await summariesFor(userId, cited) }
    },

    // A source still cited by literature notes can't be deleted: those notes
    // would lose the reference that makes them literature notes.
    async deleteSource(userId: string, id: string): Promise<void> {
      const source = await sources.get(userId, id)
      if (!source) throw new NotFoundError('Source')
      const cited = await sources.noteIds(userId, id)
      if (cited.length > 0) {
        throw new ValidationError(`${cited.length} note(s) cite this source — remove the citation first`)
      }
      const uow = store.begin()
      uow.deleteSource(userId, id)
      await uow.commit()
    },
  }
}

export type NoteService = ReturnType<typeof createNoteService>
