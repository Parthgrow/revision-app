import { NextResponse } from 'next/server'
import { createItem, deleteItem, getItem } from '@/lib/kv'
import { ZkError, StaleWriteError } from './errors'
import { kvStore } from './kv-repo'
import { createNoteService } from './service'
import { createReviewBridge } from './review-bridge'

// Production wiring: services over the KV store.
export const zk = createNoteService(kvStore)
export const reviewBridge = createReviewBridge(zk, {
  get: getItem,
  create: createItem,
  delete: deleteItem,
})

// Maps service errors to HTTP responses so routes don't repeat 404/400 checks.
// A stale write also returns the current note for the conflict dialog.
export function zkErrorResponse(err: unknown) {
  if (err instanceof StaleWriteError) {
    return NextResponse.json({ error: err.message, current: err.current }, { status: err.status })
  }
  if (err instanceof ZkError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  if (err instanceof SyntaxError) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  throw err
}
