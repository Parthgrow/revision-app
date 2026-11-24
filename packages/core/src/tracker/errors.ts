export abstract class TrkError extends Error {
  abstract readonly status: number
}

export class TrkNotFoundError extends TrkError {
  readonly status = 404
}

export class TrkValidationError extends TrkError {
  readonly status = 400
}

// A task move the state machine doesn't allow (e.g. completing a done task).
export class TrkTransitionError extends TrkError {
  readonly status = 409
}
