import Nav from '@/components/Nav'

// Page frame for shared pages (Context, Connect Claude): the app's margin nav
// plus a working column — wide for documents, narrow for settings.
export default function AppFrame({ children, narrow }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <div className="min-h-screen bg-[var(--paper)] flex flex-col sm:flex-row">
      <Nav />
      <div className="flex-1 min-w-0 flex justify-center">
        <main
          className={`w-full ${narrow ? 'max-w-[760px]' : 'max-w-[1180px]'} px-4 sm:px-10 py-8 sm:py-12 flex flex-col gap-8 min-w-0`}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
