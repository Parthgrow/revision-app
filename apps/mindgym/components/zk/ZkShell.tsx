import Nav from '@/components/Nav'

// Page frame shared by every /zk page: the margin nav plus a centred column.
export default function ZkShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-[var(--paper)] flex flex-col sm:flex-row">
      <Nav />
      <div className="flex-1 min-w-0 flex justify-center">
        <main
          className={`w-full ${wide ? 'max-w-[880px]' : 'max-w-[720px]'} px-6 sm:px-10 py-10 sm:py-14 flex flex-col gap-8`}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
