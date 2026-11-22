import type { AuthCopy } from '@revision-app/core/ui/AuthForm'

const base = { brand: 'MindGym', strap: 'MindGym · Memory System' }

export const loginCopy: AuthCopy = {
  ...base,
  headline: 'Memory is a palace. You hold the key.',
  blurb: 'Spaced repetition for the things that matter.',
  subtitle: 'Welcome back to your palace.',
}

export const registerCopy: AuthCopy = {
  ...base,
  headline: 'Build the palace. One memory at a time.',
  blurb: 'Science-backed spaced repetition to help you remember what matters.',
  subtitle: 'Start building your memory palace.',
}
