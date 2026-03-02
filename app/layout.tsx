import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MindGym — Spaced Repetition',
  description: 'Train your memory with MindGym',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
