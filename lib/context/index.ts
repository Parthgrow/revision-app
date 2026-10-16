import { NextResponse } from 'next/server'
import { CtxError, CtxStaleWriteError } from './errors'
import { kvCtxStore } from './kv-repo'
import { createContextService } from './service'

// Production wiring: the Context service over Redis.
export const ctx = createContextService(kvCtxStore)

// Maps service errors to HTTP responses; a stale save also returns the
// stored document for the conflict dialog.
export function ctxErrorResponse(err: unknown) {
  if (err instanceof CtxStaleWriteError) {
    return NextResponse.json({ error: err.message, current: err.current }, { status: err.status })
  }
  if (err instanceof CtxError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  if (err instanceof SyntaxError) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  throw err
}
