import { getOverallScore } from '#shared/calls'
import type { CallReviewRecord } from '#shared/calls'

// The saved score, or Gemma's (#4) the first time a call is opened, saved with the call so
// the Calls list and Team view see it too
export default defineEventHandler(async (event): Promise<ScoreResult> => {
  const call = await callFromEvent(event)
  if (getOverallScore(call.score) === null) {
    const result = await scoreTranscript(call.transcript)
    await useStorage<CallReviewRecord>('calls').setItem(call.id, { ...call, score: { ...result, items: result.items.map(item => ({ ...item })) } })
    return result
  }

  const overall = getOverallScore(call.score)
  const score = call.score && typeof call.score === 'object' && !Array.isArray(call.score) ? call.score : null
  const items = Array.isArray(score?.items) ? score.items.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    if (typeof item.id !== 'string' || typeof item.label !== 'string' || typeof item.pass !== 'boolean') return []
    return [{ id: item.id, label: item.label, pass: item.pass, line: typeof item.line === 'string' ? item.line : null }]
  }) : []
  return { reviewed: overall !== null, overall, items }
})
