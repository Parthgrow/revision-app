# Memory Palace Network

A library of memory palaces at `/palaces` (nav: **Palace Network**). It is separate from the existing Palace entries at `/mp`, which are unchanged.

## Rules

| | |
|---|---|
| **Name** | required, 1–80 characters |
| **Network alphabet** | required, one letter `a`–`z`, shown exactly as stored. Uppercase is accepted and stored lowercase. Several palaces may share a letter. |
| **Link** | optional, one-way, at most one per palace (A → B). Several palaces may link to the same palace. A palace can't link to itself, and the target must exist and be yours. Loops (a → b → a) are allowed. |
| **Review card** | a card can be placed in one palace, and a palace holds at most one card. A palace holding a card is **Occupied**, otherwise **Free**. |

## Storage

| Key | Type | Holds |
|---|---|---|
| `user:{u}:palaces` | set | palace ids |
| `palace:{u}:{id}` | JSON | `{ id, userId, name, networkAlphabet, linkedPalaceId?, createdAt, updatedAt }` |
| `item:{u}:{id}` | JSON | existing review card, plus **`palaceId?`** |

**Occupancy is derived, not stored:** a palace is Occupied when some card has `palaceId` equal to its id. Deleting a review card therefore frees its palace automatically, and no palace field can go stale.

**Deleting a palace** runs as one transaction: it removes the palace, clears `linkedPalaceId` on palaces that pointed to it, and clears `palaceId` on its card (the card itself stays).

## API

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/palaces` | — | palaces with `linkedTo`, `linkedFrom` and `card`, sorted by letter then name |
| POST | `/api/palaces` | `{ name, networkAlphabet, linkedPalaceId? }` | `201` palace |
| PATCH | `/api/palaces/[id]` | `{ name?, networkAlphabet?, linkedPalaceId? \| null }` | palace |
| DELETE | `/api/palaces/[id]` | — | `{ unlinked, releasedCard }` |
| PUT | `/api/items/[id]/palace` | `{ palaceId \| null }` | the card |

## Code

| Layer | Files |
|---|---|
| Domain and storage | `lib/palaces/` (`types`, `errors`, `repo` with an in-memory store, `kv-repo`, `service`, `index`, `service.test`) |
| Cards | `lib/kv.ts`: `Item.palaceId`, `itemKey` |
| UI | `app/palaces/` (network page) and the **Palace** dropdown in the review drawer (`app/HomeClient.tsx`); review rows show the palace letter |
