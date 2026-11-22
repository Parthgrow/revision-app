import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ContextMagic — design context for Claude',
  description: 'Keep your schema, HLD and LLDs in one place, and let Claude read and edit them.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
