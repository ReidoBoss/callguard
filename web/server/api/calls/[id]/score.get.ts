import { getOverallScore } from '#shared/calls'

// Demo results are seeded on creation until #4 produces scores from Gemma.
export default defineEventHandler(async (event): Promise<ScoreResult> => {
  const call = await callFromEvent(event)
  const overall = getOverallScore(call.score)
  const score = call.score && typeof call.score === 'object' && !Array.isArray(call.score) ? call.score : null
  const items = Array.isArray(score?.items) ? score.items.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    if (typeof item.id !== 'string' || typeof item.label !== 'string' || typeof item.pass !== 'boolean') return []
    return [{ id: item.id, label: item.label, pass: item.pass, line: typeof item.line === 'string' ? item.line : null }]
  }) : []
  return { reviewed: overall !== null, overall, items }
})
