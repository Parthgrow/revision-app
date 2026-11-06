export type Rating = 0 | 1 | 2 | 3 // Again, Hard, Good, Easy

export type SM2Fields = {
  interval: number
  easeFactor: number
  repetitions: number
  dueDate: number
}

export function applyReview(fields: SM2Fields, rating: Rating): SM2Fields {
  const q = [1, 2, 4, 5][rating]
  let { easeFactor, interval, repetitions } = fields

  if (q < 3) {
    repetitions = 0
    interval = 1
  } else {
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else interval = Math.round(interval * easeFactor)
    repetitions += 1
  }

  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const dueDate = Date.now() + interval * 24 * 60 * 60 * 1000

  return { easeFactor, interval, repetitions, dueDate }
}

export function initialSM2(): SM2Fields {
  return {
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    dueDate: Date.now(),
  }
}
