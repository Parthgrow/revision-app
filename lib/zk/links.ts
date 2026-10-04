// Note links are written [[id]] or [[id|label]]. IDs are 10-char alphanumeric
// nanoids (see newNoteId), so a link can't be confused with ordinary brackets.

export const NOTE_ID_LENGTH = 10

const LINK_RE = /\[\[([A-Za-z0-9]{10})(?:\|([^\]\n]{1,200}))?\]\]/g

// Fenced blocks and inline code spans: link syntax inside them is literal text.
const CODE_RE = /```[\s\S]*?(?:```|$)|`[^`\n]*`/g

// Apply `fn` to the parts of `body` that are not code, leaving code untouched.
function mapOutsideCode(body: string, fn: (text: string) => string): string {
  let out = ''
  let last = 0
  for (const m of body.matchAll(CODE_RE)) {
    out += fn(body.slice(last, m.index)) + m[0]
    last = m.index! + m[0].length
  }
  return out + fn(body.slice(last))
}

export function extractIds(body: string): string[] {
  const ids = new Set<string>()
  mapOutsideCode(body, (text) => {
    for (const m of text.matchAll(LINK_RE)) ids.add(m[1])
    return text
  })
  return [...ids]
}

export function formatLink(id: string, label?: string): string {
  const clean = label?.replace(/[\]\|\n]/g, ' ').trim()
  return clean ? `[[${id}|${clean}]]` : `[[${id}]]`
}

function escapeLinkText(text: string): string {
  return text.replace(/([\\\[\]])/g, '\\$1')
}

// Rewrite [[id|label]] into ordinary markdown links to /zk/id so any markdown
// renderer can display them. Unlabelled links take the target's current title.
export function linksToMarkdown(body: string, titleOf: (id: string) => string | undefined): string {
  return mapOutsideCode(body, (text) =>
    text.replace(LINK_RE, (_m, id: string, label?: string) => {
      const shown = label?.trim() || titleOf(id) || 'missing note'
      return `[${escapeLinkText(shown)}](/zk/${id})`
    })
  )
}

// The text before the caret looks like an unfinished "[[query" — used by the
// editor to open link autocomplete. Returns the query, or null.
export function pendingLinkQuery(textBeforeCaret: string): string | null {
  const m = /\[\[([^\]\n|]{0,60})$/.exec(textBeforeCaret)
  return m ? m[1] : null
}
