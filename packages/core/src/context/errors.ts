import type { ContextDoc } from './types'

export abstract class CtxError extends Error {
  abstract readonly status: number
}

export class CtxNotFoundError extends CtxError {
  readonly status = 404
  constructor(what = 'Document') {
    super(`${what} not found`)
  }
}

export class CtxValidationError extends CtxError {
  readonly status = 400
}

// The document changed after the editor loaded it; carries the stored version.
export class CtxStaleWriteError extends CtxError {
  readonly status = 409
  constructor(readonly current: ContextDoc) {
    super('This document was changed somewhere else since you opened it')
  }
}
