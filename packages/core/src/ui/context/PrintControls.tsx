'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { btnPrimary, link } from './ui'

// Toolbar for the print page (hidden when printing). Sets the document
// title, which browsers use as the suggested PDF file name, and opens the
// save dialog once fonts have loaded so diagrams print in the right face.
export default function PrintControls({ title, backHref }: { title: string; backHref: string }) {
  useEffect(() => {
    document.title = title
    let cancelled = false
    document.fonts.ready.then(() => {
      if (!cancelled) window.print()
    })
    return () => {
      cancelled = true
    }
  }, [title])

  return (
    <div className="no-print sticky top-0 z-10 border-b border-[var(--rule)] bg-[var(--paper)] px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
      <Link href={backHref} className={`text-[14px] ${link}`}>
        ← Back to the document
      </Link>
      <div className="flex items-center gap-4">
        <span className="hidden sm:inline text-[14px] text-[var(--ink-3)]">Choose “Save as PDF” in the print dialog</span>
        <button onClick={() => window.print()} className={btnPrimary}>
          Save as PDF
        </button>
      </div>
    </div>
  )
}
