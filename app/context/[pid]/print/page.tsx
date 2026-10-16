import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { ctx } from '@/lib/context'
import { CtxNotFoundError } from '@/lib/context/errors'
import CtxMarkdown from '@/components/context/CtxMarkdown'
import PrintControls from '@/components/context/PrintControls'

type Props = {
  params: Promise<{ pid: string }>
  searchParams: Promise<{ doc?: string }>
}

const KIND_LABEL = { schema: 'Database schema', hld: 'High-level design', lld: 'LLD' } as const

// The page title is what browsers suggest as the PDF file name.
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const session = await getSession()
  if (!session) return {}
  const [{ pid }, { doc }] = await Promise.all([params, searchParams])
  const whole = !doc || doc === 'all'
  try {
    const { project, docs } = await ctx.getPrintable(session.userId, pid, whole ? undefined : doc)
    return { title: whole ? `${project.name} – design context` : `${project.name} – ${docs[0].title}` }
  } catch {
    return {}
  }
}

// Print-ready layout for "Download PDF": ?doc=<id> for one document,
// ?doc=all for the whole project (cover + contents, one document per page).
export default async function PrintPage({ params, searchParams }: Props) {
  const session = await getSession()
  if (!session) return null

  const [{ pid }, { doc }] = await Promise.all([params, searchParams])
  const whole = !doc || doc === 'all'
  const { project, docs } = await ctx.getPrintable(session.userId, pid, whole ? undefined : doc).catch((err) => {
    if (err instanceof CtxNotFoundError) notFound()
    throw err
  })
  const date = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  const fileTitle = whole ? `${project.name} – design context` : `${project.name} – ${docs[0].title}`

  return (
    <div className="ctx-print-root min-h-screen bg-[var(--paper)]">
      <PrintControls title={fileTitle} backHref={`/context/${project.id}/${whole ? project.hldId : docs[0].id}`} />
      <main className="ctx-print mx-auto max-w-[820px] px-4 sm:px-8 py-10 flex flex-col gap-12">
        {whole && (
          <section className="print-cover flex flex-col gap-4">
            <p className="smallcaps">Design context · {date}</p>
            <h1 className="text-[34px] font-semibold tracking-[-0.01em] leading-tight">{project.name}</h1>
            {project.description && <p className="text-[17px] text-[var(--ink-2)]">{project.description}</p>}
            <h2 className="smallcaps mt-6 border-b border-[var(--rule)] pb-1">Contents</h2>
            <ol className="list-decimal pl-6 text-[16px] flex flex-col gap-1">
              {docs.map((d) => (
                <li key={d.id}>
                  {d.title}
                  {d.title !== KIND_LABEL[d.kind] && <span className="text-[var(--ink-3)]"> · {KIND_LABEL[d.kind]}</span>}
                </li>
              ))}
            </ol>
          </section>
        )}
        {docs.map((d) => (
          <article key={d.id} className="print-doc flex flex-col gap-5">
            <header className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-ink)] pb-2">
              <span className="text-[14px] text-[var(--ink-2)]">
                {project.name} — {d.title}
              </span>
              <span className="text-[13px] text-[var(--ink-3)]">{date}</span>
            </header>
            <CtxMarkdown body={d.body} />
          </article>
        ))}
      </main>
    </div>
  )
}
