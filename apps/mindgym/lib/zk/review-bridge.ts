import type { Item } from '@/lib/kv'
import type { NoteService } from './service'

// The slice of lib/kv.ts the bridge needs, injected so it can be tested
// without KV.
export type ItemGateway = {
  get(userId: string, id: string): Promise<Item | null>
  create(userId: string, content: string, extra: { noteId: string }): Promise<Item>
  delete(userId: string, id: string): Promise<void>
}

// Puts a note into the existing SM-2 review queue. The card shows the note's
// title as the recall prompt; the review drawer links back to the full note.
export function createReviewBridge(service: NoteService, items: ItemGateway) {
  return {
    // Idempotent: a note already in review returns its existing item. If that
    // item was deleted from the Review screen, a fresh one is created.
    async sendToReview(userId: string, noteId: string): Promise<Item> {
      const { note } = await service.getView(userId, noteId)
      if (note.reviewItemId) {
        const existing = await items.get(userId, note.reviewItemId)
        if (existing) return existing
      }
      const item = await items.create(userId, note.title, { noteId })
      await service.patchMeta(userId, noteId, { reviewItemId: item.id })
      return item
    },

    async removeFromReview(userId: string, noteId: string): Promise<void> {
      const { note } = await service.getView(userId, noteId)
      if (!note.reviewItemId) return
      await items.delete(userId, note.reviewItemId)
      await service.patchMeta(userId, noteId, { reviewItemId: undefined })
    },

    // True when the note's review item still exists (it may have been deleted
    // from the Review screen since).
    async isInReview(userId: string, reviewItemId: string | undefined): Promise<boolean> {
      return !!reviewItemId && !!(await items.get(userId, reviewItemId))
    },
  }
}
