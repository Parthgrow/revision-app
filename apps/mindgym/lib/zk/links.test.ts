import { describe, expect, it } from 'vitest'
import { extractIds, formatLink, linksToMarkdown, pendingLinkQuery } from './links'

const A = 'AAAAAAAAAA'
const B = 'BBBBBBBBBB'

describe('links', () => {
  it('extracts unique ids, with or without labels', () => {
    expect(extractIds(`See [[${A}]] and [[${B}|the other]] and [[${A}|again]]`)).toEqual([A, B])
  })

  it('ignores links inside code', () => {
    const body = `real [[${A}]]\n\`\`\`\n[[${B}]]\n\`\`\`\ninline \`[[${B}]]\``
    expect(extractIds(body)).toEqual([A])
  })

  it('ignores ids of the wrong shape', () => {
    expect(extractIds('[[short]] [[ABCDEFGHIJK]] [[ABC DEF GH]]')).toEqual([])
  })

  it('formats links and strips characters that would break them', () => {
    expect(formatLink(A)).toBe(`[[${A}]]`)
    expect(formatLink(A, 'a | b ]')).toBe(`[[${A}|a   b]]`)
  })

  it('rewrites links to markdown using current titles', () => {
    const md = linksToMarkdown(`[[${A}]] / [[${B}|label]] / \`[[${A}]]\``, (id) => (id === A ? 'Title [x]' : undefined))
    expect(md).toBe(`[Title \\[x\\]](/zk/${A}) / [label](/zk/${B}) / \`[[${A}]]\``)
  })

  it('detects an unfinished [[ before the caret', () => {
    expect(pendingLinkQuery('text [[spac')).toBe('spac')
    expect(pendingLinkQuery('text [[')).toBe('')
    expect(pendingLinkQuery(`text [[${A}]] more`)).toBeNull()
  })
})
