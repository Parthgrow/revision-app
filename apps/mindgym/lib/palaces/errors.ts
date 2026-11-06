export abstract class PalaceError extends Error {
  abstract readonly status: number
}

export class PalaceNotFoundError extends PalaceError {
  readonly status = 404
  constructor(what = 'Palace') {
    super(`${what} not found`)
  }
}

export class PalaceValidationError extends PalaceError {
  readonly status = 400
}
