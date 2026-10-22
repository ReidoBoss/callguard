import { isJsonValue } from '#shared/calls'
import type { CallReviewRecord } from '#shared/calls'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Call not found' })
  }

  const body = await readBody<Record<string, unknown> | null>(event)
  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'Send review fields to update' })
  }

  const storage = useStorage<CallReviewRecord>('calls')
  const review = await storage.getItem(id)
  if (!review) {
    throw createError({ statusCode: 404, statusMessage: 'Call not found' })
  }

  const updates: Partial<CallReviewRecord> = {}
  if ('score' in body) {
    if (!isJsonValue(body.score)) throw createError({ statusCode: 400, statusMessage: 'Score must be JSON data' })
    updates.score = body.score
  }
  if ('flags' in body) {
    if (!Array.isArray(body.flags) || !body.flags.every(isJsonValue)) {
      throw createError({ statusCode: 400, statusMessage: 'Flags must be a JSON array' })
    }
    updates.flags = body.flags
  }
  if ('coaching' in body) {
    if (!isJsonValue(body.coaching)) throw createError({ statusCode: 400, statusMessage: 'Coaching must be JSON data' })
    updates.coaching = body.coaching
  }
  if ('agent' in body) {
    if (typeof body.agent !== 'string' || !body.agent.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'Agent must be a non-empty string' })
    }
    updates.agent = body.agent.trim()
  }
  if (!Object.keys(updates).length) {
    throw createError({ statusCode: 400, statusMessage: 'Send at least one review field to update' })
  }

  const updatedReview = { ...review, ...updates }
  await storage.setItem(id, updatedReview)
  return updatedReview
})
