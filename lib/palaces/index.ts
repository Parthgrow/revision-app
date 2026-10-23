import { NextResponse } from 'next/server'
import { PalaceError } from './errors'
import { kvPalaceStore } from './kv-repo'
import { createPalaceService } from './service'

// Production wiring: the Memory Palace Network over Redis.
export const palaces = createPalaceService(kvPalaceStore)

export function palaceErrorResponse(err: unknown) {
  if (err instanceof PalaceError) return NextResponse.json({ error: err.message }, { status: err.status })
  if (err instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  throw err
}
