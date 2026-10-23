'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PalaceView, PlacedCard } from '@/lib/palaces/types'

type Props = { initial: PalaceView[]; cards: PlacedCard[] }

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('')

const btnPrimary =
  'px-5 py-2 text-[14px] font-semibold border-none bg-[var(--ink)] text-[var(--paper)] cursor-pointer transition-opacity duration-150 hover:opacity-85 disabled:opacity-40 disabled:cursor-default'
const btnQuiet =
  'px-0 py-1 text-[14px] text-[var(--ink-2)] bg-transparent border-none cursor-pointer underline underline-offset-4 decoration-[var(--rule)] hover:text-[var(--ink)] hover:decoration-[var(--ink)] disabled:opacity-40'
const field =
  'bg-transparent border border-[var(--rule)] text-[var(--ink)] px-3 py-2 text-[16px] outline-none focus:border-[var(--ink-3)] placeholder:text-[var(--ink-4)]'

// The network letter, shown exactly as stored.
function Letter({ value, size = 'md' }: { value: string; size?: 'md' | 'sm' }) {
  return (
    <span
      className={`ctx-mono inline-flex items-center justify-center border border-[var(--ink-3)] text-[var(--ink)] shrink-0 ${
        size === 'md' ? 'w-7 h-7 text-[15px]' : 'w-5 h-5 text-[12px]'
      }`}
    >
      {value}
    </span>
  )
}

function LetterPicker({ id, value, onChange }: { id: string; value: string; onChange: (l: string) => void }) {
  return (
    <div id={id} role="radiogroup" aria-label="Network alphabet" className="flex flex-wrap gap-1">
      {ALPHABET.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={value === l}
          onClick={() => onChange(l)}
          className={`ctx-mono w-8 h-8 text-[15px] border cursor-pointer transition-colors duration-100 ${
            value === l
              ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]'
              : 'bg-transparent text-[var(--ink-2)] border-[var(--rule)] hover:border-[var(--ink-3)] hover:text-[var(--ink)]'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

function LinkSelect({
  id,
  value,
  onChange,
  palaces,
  exclude,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  palaces: PalaceView[]
  exclude?: string
}) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${field} bg-[var(--paper)] text-[15px] py-1.5`}>
      <option value="">No link</option>
      {palaces
        .filter((p) => p.id !== exclude)
        .map((p) => (
          <option key={p.id} value={p.id}>
            [{p.networkAlphabet}] {p.name}
          </option>
        ))}
    </select>
  )
}

export default function PalaceNetwork({ initial, cards: initialCards }: Props) {
  const router = useRouter()
  const [list, setList] = useState(initial)
  const [cards, setCards] = useState(initialCards)
  const [name, setName] = useState('')
  const [letter, setLetter] = useState('')
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState({ name: '', letter: '', link: '' })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const freeCards = cards.filter((c) => !c.palaceId)
  const occupied = list.filter((p) => p.card).length

  // After any change, reload the list so links and occupancy stay in sync.
  async function refresh() {
    const res = await fetch('/api/palaces')
    if (res.ok) setList(await res.json())
    router.refresh()
  }

  async function call(url: string, init: RequestInit) {
    setBusy(true)
    setError(null)
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong. Try again.')
      return null
    }
    return data
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !letter) return
    const ok = await call('/api/palaces', {
      method: 'POST',
      body: JSON.stringify({ name, networkAlphabet: letter, linkedPalaceId: link || null }),
    })
    if (ok) {
      setName('')
      setLink('')
      await refresh()
    }
  }

  async function saveEdit(id: string) {
    const ok = await call(`/api/palaces/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: draft.name, networkAlphabet: draft.letter, linkedPalaceId: draft.link || null }),
    })
    if (ok) {
      setEditing(null)
      await refresh()
    }
  }

  async function remove(id: string) {
    const ok = await call(`/api/palaces/${id}`, { method: 'DELETE' })
    if (ok) {
      setConfirmDelete(null)
      setCards((prev) => prev.map((c) => (c.palaceId === id ? { ...c, palaceId: undefined } : c)))
      await refresh()
    }
  }

  async function place(cardId: string, palaceId: string | null) {
    const ok = await call(`/api/items/${cardId}/palace`, { method: 'PUT', body: JSON.stringify({ palaceId }) })
    if (ok) {
      setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, palaceId: palaceId ?? undefined } : c)))
      await refresh()
    }
  }

  const groups = ALPHABET.map((l) => ({ letter: l, palaces: list.filter((p) => p.networkAlphabet === l) })).filter(
    (g) => g.palaces.length > 0
  )

  return (
    <>
      <header className="flex items-baseline justify-between gap-4 border-b border-[var(--rule-ink)] pb-3">
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Memory Palace Network</h1>
        <span className="text-[15px] text-[var(--ink-2)]">
          {list.length} palace{list.length === 1 ? '' : 's'} · {occupied} occupied
        </span>
      </header>

      <form onSubmit={create} className="flex flex-col gap-4 border border-[var(--rule)] p-4 sm:p-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="palace-name" className="smallcaps">
            Name
          </label>
          <input
            id="palace-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="e.g. Childhood home"
            className={field}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="smallcaps">Network alphabet (required)</span>
          <LetterPicker id="palace-letter" value={letter} onChange={setLetter} />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <label htmlFor="palace-link" className="smallcaps">
              Link to (optional)
            </label>
            <LinkSelect id="palace-link" value={link} onChange={setLink} palaces={list} />
          </div>
          <button type="submit" disabled={busy || !name.trim() || !letter} className={`${btnPrimary} shrink-0`}>
            Add palace
          </button>
        </div>
        {error && <p className="text-[14px] text-[var(--ink-2)]">{error}</p>}
      </form>

      {list.length === 0 ? (
        <p className="text-[16px] text-[var(--ink-3)] py-6">
          No palaces yet. Name a place you know well, give it a letter, and add it above.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <section key={g.letter} className="flex flex-col" aria-label={`Letter ${g.letter}`}>
              <h2 className="smallcaps border-b border-[var(--rule)] pb-1.5 px-1">
                {g.letter} · {g.palaces.length}
              </h2>
              <ul className="ledger flex flex-col">
                {g.palaces.map((p) => (
                  <li key={p.id} id={`palace-${p.id}`} className="row flex flex-col gap-2 px-3 py-3 scroll-mt-6">
                    {editing === p.id ? (
                      <div className="flex flex-col gap-3">
                        <input
                          id={`edit-name-${p.id}`}
                          value={draft.name}
                          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                          maxLength={80}
                          aria-label="Palace name"
                          className={`${field} py-1.5`}
                        />
                        <LetterPicker id={`edit-letter-${p.id}`} value={draft.letter} onChange={(l) => setDraft({ ...draft, letter: l })} />
                        <LinkSelect
                          id={`edit-link-${p.id}`}
                          value={draft.link}
                          onChange={(v) => setDraft({ ...draft, link: v })}
                          palaces={list}
                          exclude={p.id}
                        />
                        <div className="flex items-center gap-5">
                          <button onClick={() => saveEdit(p.id)} disabled={busy || !draft.name.trim()} className={`${btnPrimary} px-4 py-1.5`}>
                            Save
                          </button>
                          <button onClick={() => setEditing(null)} className={btnQuiet}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 items-baseline">
                          <Letter value={p.networkAlphabet} />
                          <span className="text-[16px] font-semibold min-w-0 break-words">{p.name}</span>
                          <span className="col-start-2 sm:col-start-3 text-[14px] text-[var(--ink-2)] min-w-0 flex items-center gap-1.5">
                            {p.linkedTo ? (
                              <>
                                →
                                <a href={`#palace-${p.linkedTo.id}`} className="flex items-center gap-1.5 no-underline text-[var(--ink-2)] hover:text-[var(--ink)]">
                                  <Letter value={p.linkedTo.networkAlphabet} size="sm" />
                                  <span className="truncate underline underline-offset-4 decoration-[var(--rule)]">{p.linkedTo.name}</span>
                                </a>
                              </>
                            ) : (
                              <span className="text-[var(--ink-4)]">No link</span>
                            )}
                          </span>
                          <span className="col-start-2 sm:col-start-4 flex items-center gap-4">
                            <button
                              onClick={() => {
                                setEditing(p.id)
                                setDraft({ name: p.name, letter: p.networkAlphabet, link: p.linkedPalaceId ?? '' })
                              }}
                              className={btnQuiet}
                            >
                              Edit
                            </button>
                            <button onClick={() => setConfirmDelete(p.id)} className={btnQuiet}>
                              Delete
                            </button>
                          </span>
                        </div>

                        {p.linkedFrom.length > 0 && (
                          <p className="text-[13px] text-[var(--ink-3)] pl-11 flex flex-wrap items-center gap-x-2 gap-y-1">
                            ← from
                            {p.linkedFrom.map((f) => (
                              <a key={f.id} href={`#palace-${f.id}`} className="flex items-center gap-1 no-underline text-[var(--ink-3)] hover:text-[var(--ink)]">
                                <Letter value={f.networkAlphabet} size="sm" /> {f.name}
                              </a>
                            ))}
                          </p>
                        )}

                        <div className="pl-11 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[14px]">
                          {p.card ? (
                            <>
                              <span className="font-semibold text-[var(--ink)]">● Occupied</span>
                              <span className="text-[var(--ink-2)] truncate max-w-[42ch]">“{p.card.content}”</span>
                              <button onClick={() => place(p.card!.id, null)} disabled={busy} className={btnQuiet}>
                                Take card out
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-[var(--ink-3)]">○ Free</span>
                              {freeCards.length > 0 ? (
                                <select
                                  id={`place-${p.id}`}
                                  value=""
                                  disabled={busy}
                                  onChange={(e) => e.target.value && place(e.target.value, p.id)}
                                  aria-label={`Place a card in ${p.name}`}
                                  className="bg-[var(--paper)] border border-[var(--rule)] px-2 py-1 text-[14px] max-w-[260px]"
                                >
                                  <option value="">Place a card…</option>
                                  {freeCards.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.content.length > 50 ? c.content.slice(0, 49) + '…' : c.content}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-[13px] text-[var(--ink-4)]">No unplaced review cards</span>
                              )}
                            </>
                          )}
                        </div>

                        {confirmDelete === p.id && (
                          <div role="alertdialog" className="border border-[var(--ink-3)] p-4 flex flex-col gap-2 mt-1">
                            <p className="text-[15px]">
                              Delete “{p.name}”?
                              {p.linkedFrom.length > 0 &&
                                ` ${p.linkedFrom.length} palace${p.linkedFrom.length === 1 ? '' : 's'} linking here will lose the link.`}
                              {p.card && ' Its card stays in Review but leaves the palace.'}
                            </p>
                            <div className="flex gap-5 items-center">
                              <button onClick={() => remove(p.id)} disabled={busy} className={`${btnPrimary} px-4 py-1.5`}>
                                Delete palace
                              </button>
                              <button onClick={() => setConfirmDelete(null)} className={btnQuiet}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
