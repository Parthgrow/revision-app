import type { Note } from './types'

export abstract class ZkError extends Error {
  abstract readonly status: number
}

export class NotFoundError extends ZkError {
  readonly status = 404
  constructor(what = 'Note') {
    super(`${what} not found`)
  }
}

export class ValidationError extends ZkError {
  readonly status = 400
}

export class AddressTakenError extends ZkError {
  readonly status = 409
  constructor(address: string) {
    super(`Address ${address} is already taken`)
  }
}

// The note changed after the editor loaded it. Carries the current version so
// the client can offer "reload theirs" or "overwrite with mine".
export class StaleWriteError extends ZkError {
  readonly status = 409
  constructor(readonly current: Note) {
    super('This note was changed somewhere else since you opened it')
  }
}
