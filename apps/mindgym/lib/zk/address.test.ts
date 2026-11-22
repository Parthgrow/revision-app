import { describe, expect, it } from 'vitest'
import {
  childAddress,
  compareAddresses,
  indexToLetters,
  isValidAddress,
  parentAddress,
  parseAddress,
} from './address'

describe('Folgezettel addresses', () => {
  it('parses alternating segments', () => {
    expect(parseAddress('12c3')).toEqual([12, 'c', 3])
    expect(parseAddress('1aa')).toEqual([1, 'aa'])
  })

  it('rejects malformed addresses', () => {
    for (const bad of ['', 'a', '0', '01', '1A', '1-a', '1a0', ' 1']) {
      expect(isValidAddress(bad)).toBe(false)
    }
  })

  it('finds the parent', () => {
    expect(parentAddress('12c3')).toBe('12c')
    expect(parentAddress('12c')).toBe('12')
    expect(parentAddress('12')).toBeNull()
  })

  it('alternates child segment kind', () => {
    expect(childAddress(null, 4)).toBe('4')
    expect(childAddress('12', 3)).toBe('12c')
    expect(childAddress('12c', 4)).toBe('12c4')
  })

  it('rolls letters over like spreadsheet columns', () => {
    expect(indexToLetters(1)).toBe('a')
    expect(indexToLetters(26)).toBe('z')
    expect(indexToLetters(27)).toBe('aa')
    expect(indexToLetters(52)).toBe('az')
    expect(indexToLetters(53)).toBe('ba')
  })

  it('sorts in card-drawer order', () => {
    const shuffled = ['2', '1b', '1a1', '10', '1', '1a', '1z', '1aa', '1a2', '1a10']
    expect([...shuffled].sort(compareAddresses)).toEqual([
      '1', '1a', '1a1', '1a2', '1a10', '1b', '1z', '1aa', '2', '10',
    ])
  })
})
