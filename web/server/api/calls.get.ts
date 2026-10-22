import { toCallSummary } from '#shared/calls'
import type { CallReviewRecord } from '#shared/calls'

export default defineEventHandler(async () => {
  const storage = useStorage<CallReviewRecord>('calls')
  const keys = await storage.getKeys()
  const reviews = await Promise.all(keys.map(key => storage.getItem(key)))

  return reviews
    .filter((review): review is CallReviewRecord => review !== null)
    .map(toCallSummary)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
})
