import { getSession } from '@/lib/auth'
import { zk } from '@/lib/zk'
import { formatLink } from '@/lib/zk/links'
import { NOTE_TYPES, type NoteType } from '@/lib/zk/types'
import ZkShell from '@/components/zk/ZkShell'
import NoteEditor from '@/components/zk/NoteEditor'

type Search = { type?: string; from?: string; sourceId?: string }

// ?type=   preselects the note type
// ?from=   starts the body with a link to that note ("write a permanent note
//          from this literature note")
// ?sourceId= preselects the source for a literature note
export default async function NewNotePage({ searchParams }: { searchParams: Promise<Search> }) {
  const session = await getSession()
  if (!session) return null

  const q = await searchParams
  const [summaries, sources] = await Promise.all([
    zk.listSummaries(session.userId),
    zk.listSources(session.userId),
  ])
  const from = q.from ? summaries.find((s) => s.id === q.from) : undefined
  const type = NOTE_TYPES.includes(q.type as NoteType) ? (q.type as NoteType) : undefined

  return (
    <ZkShell>
      <NoteEditor
        initial={{
          type,
          sourceId: q.sourceId,
          body: from ? `From ${formatLink(from.id, from.title)}\n\n` : '',
        }}
        summaries={summaries}
        sources={sources}
      />
    </ZkShell>
  )
}
