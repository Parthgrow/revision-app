import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Loci — Spaced Repetition',
  description: 'A memory palace for your mind',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
