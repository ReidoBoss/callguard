import type { CallReviewRecord } from '#shared/calls'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Call not found' })
  }

  const review = await useStorage<CallReviewRecord>('calls').getItem(id)
  if (!review) {
    throw createError({ statusCode: 404, statusMessage: 'Call not found' })
  }

  // Masked here, like the flag quotes (#5), so a card number never reaches the browser in full
  return { ...review, transcript: maskCardNumbers(review.transcript) }
})
