import { agentFromTranscript, isJsonValue } from '#shared/calls'
import type { CallReviewRecord } from '#shared/calls'

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown> | null>(event)
  const transcript = typeof body?.transcript === 'string' ? body.transcript.trim() : ''

  if (!transcript) {
    throw createError({ statusCode: 400, statusMessage: 'Paste a transcript first' })
  }

  const id = crypto.randomUUID()
  const review: CallReviewRecord = {
    id,
    transcript,
    score: isJsonValue(body?.score) ? body.score : null,
    flags: Array.isArray(body?.flags) && body.flags.every(isJsonValue) ? body.flags : [],
    coaching: isJsonValue(body?.coaching) ? body.coaching : [],
    agent: typeof body?.agent === 'string' && body.agent.trim()
      ? body.agent.trim()
      : agentFromTranscript(transcript),
    createdAt: new Date().toISOString(),
  }

  await useStorage<CallReviewRecord>('calls').setItem(id, review)
  return { id }
})
