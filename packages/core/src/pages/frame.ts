import type { ComponentType, ReactNode } from 'react'

// Each app wraps shared pages in its own chrome (nav, brand). `narrow` asks
// for a reading-width column instead of the wide working one.
export type PageFrame = ComponentType<{ children: ReactNode; narrow?: boolean }>
