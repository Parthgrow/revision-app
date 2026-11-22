import type { AuthCopy } from '@revision-app/core/ui/AuthForm'

const base = {
  brand: 'ContextMagic',
  strap: 'ContextMagic · Design context',
  blurb: 'Schema, HLD and LLDs in one place — readable and editable by Claude.',
}

export const loginCopy: AuthCopy = {
  ...base,
  headline: 'Your design, where Claude can read it.',
  subtitle: 'Welcome back. Your MindGym account works here too.',
}

export const registerCopy: AuthCopy = {
  ...base,
  headline: 'Write the design once. Hand it to Claude every time.',
  subtitle: 'One account for ContextMagic and MindGym.',
}
