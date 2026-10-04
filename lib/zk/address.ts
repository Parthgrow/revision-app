// Folgezettel addresses: segments alternate number and letter — 1, 1a, 1a1, 1a1b.
// A child of an address ending in a number gets a letter, and vice versa.

export type Segment = number | string

const SEGMENT_RE = /(\d+|[a-z]+)/g
const ADDRESS_RE = /^[1-9]\d*(?:[a-z]+[1-9]\d*)*(?:[a-z]+)?$/

export function isValidAddress(raw: string): boolean {
  return ADDRESS_RE.test(raw)
}

export function parseAddress(raw: string): Segment[] {
  if (!isValidAddress(raw)) throw new Error(`Invalid address: ${raw}`)
  return raw.match(SEGMENT_RE)!.map((s) => (/^\d/.test(s) ? Number(s) : s))
}

export function formatAddress(segments: Segment[]): string {
  return segments.join('')
}

// 1 → a, 26 → z, 27 → aa, 28 → ab (bijective base-26, like spreadsheet columns)
export function indexToLetters(n: number): string {
  if (n < 1) throw new Error('Index must be >= 1')
  let out = ''
  while (n > 0) {
    n -= 1
    out = String.fromCharCode(97 + (n % 26)) + out
    n = Math.floor(n / 26)
  }
  return out
}

export function parentAddress(raw: string): string | null {
  const segs = parseAddress(raw)
  return segs.length > 1 ? formatAddress(segs.slice(0, -1)) : null
}

// n-th child of `parent`; parent null means the n-th top-level address.
export function childAddress(parent: string | null, n: number): string {
  if (parent === null) return String(n)
  const segs = parseAddress(parent)
  const last = segs[segs.length - 1]
  return parent + (typeof last === 'number' ? indexToLetters(n) : String(n))
}

function compareSegment(a: Segment, b: Segment): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'string' && typeof b === 'string') {
    return a.length - b.length || (a < b ? -1 : a > b ? 1 : 0)
  }
  return typeof a === 'number' ? -1 : 1
}

// Card-drawer order: a parent sorts before its children, children before the
// parent's next sibling (1, 1a, 1a1, 1b, 2).
export function compareAddresses(a: string, b: string): number {
  const sa = parseAddress(a)
  const sb = parseAddress(b)
  for (let i = 0; i < Math.min(sa.length, sb.length); i++) {
    const c = compareSegment(sa[i], sb[i])
    if (c !== 0) return c
  }
  return sa.length - sb.length
}
