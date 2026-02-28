import { getSession } from '@/lib/auth'
import { getDueItems, getAllItems, getStreak } from '@/lib/kv'
import Nav from '@/components/Nav'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) return null

  const [due, all, streak] = await Promise.all([
    getDueItems(session.userId),
    getAllItems(session.userId),
    getStreak(session.userId),
  ])

  return (
    <div className="min-h-screen bg-[var(--bg)]" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(196,149,58,0.04) 0%, transparent 50%)' }}>
      <Nav />
      <main className="max-w-[600px] mx-auto px-10 py-20 flex flex-col items-center gap-12">

        <h1 className="font-serif text-[42px] font-light tracking-[0.04em] text-[var(--text-primary)] text-center">
          Welcome back
        </h1>

        <div className="grid grid-cols-3 w-full" style={{ gap: '1px', background: 'var(--border)', border: '1px solid var(--border)' }}>
          {[
            { value: due.length, label: 'Due today' },
            { value: all.length, label: 'Total items' },
            { value: streak.current, label: 'Day streak' },
          ].map((s) => (
            <div key={s.label} className="bg-[var(--bg-card)] py-7 px-5 text-center">
              <div className="font-serif text-[40px] font-light text-[var(--accent)] leading-none mb-2">{s.value}</div>
              <div className="text-[10px] tracking-[0.18em] uppercase text-[var(--text-muted)]">{s.label}</div>
            </div>
          ))}
        </div>

        {due.length > 0 ? (
          <Link
            href="/review"
            className="flex items-center gap-3 px-10 py-[18px] bg-transparent border border-[var(--accent-dim)] text-[var(--accent)] text-[12px] tracking-[0.2em] uppercase no-underline transition-colors duration-200 hover:bg-[var(--accent-glow)] hover:border-[var(--accent)]"
          >
            <span className="text-[18px] opacity-70">◈</span>
            Begin Review — {due.length} item{due.length !== 1 ? 's' : ''}
          </Link>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="font-serif text-[28px] text-[var(--text-muted)] opacity-40">✦</div>
            <p className="text-sm text-[var(--text-muted)] tracking-[0.04em]">The palace is still. Nothing due today.</p>
            <Link
              href="/add"
              className="mt-2 text-[11px] tracking-[0.16em] uppercase text-[var(--accent-dim)] no-underline transition-colors duration-200 hover:text-[var(--accent)]"
            >
              Add something to remember
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
