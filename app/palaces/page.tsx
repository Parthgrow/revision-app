import { getSession } from '@/lib/auth'
import { getAllItems } from '@/lib/kv'
import { palaces } from '@/lib/palaces'
import Nav from '@/components/Nav'
import PalaceNetwork from './PalaceNetwork'

export default async function PalacesPage() {
  const session = await getSession()
  if (!session) return null

  const [list, cards] = await Promise.all([palaces.listPalaces(session.userId), getAllItems(session.userId)])

  return (
    <div className="min-h-screen bg-[var(--paper)] flex flex-col sm:flex-row">
      <Nav />
      <div className="flex-1 min-w-0 flex justify-center">
        <main className="w-full max-w-[920px] px-4 sm:px-10 py-8 sm:py-12 flex flex-col gap-8 min-w-0">
          <PalaceNetwork
            initial={list}
            cards={cards.map((c) => ({ id: c.id, content: c.content, palaceId: c.palaceId }))}
          />
        </main>
      </div>
    </div>
  )
}
