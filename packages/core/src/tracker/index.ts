import { NextResponse } from 'next/server'
import { TrkError } from './errors'
import { kvTrkStore } from './kv-repo'
import { createTrackerService } from './service'

// Production wiring: the AgentTracker service over Redis.
export const tracker = createTrackerService(kvTrkStore)

export function trkErrorResponse(err: unknown) {
  if (err instanceof TrkError) return NextResponse.json({ error: err.message }, { status: err.status })
  if (err instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  throw err
}
