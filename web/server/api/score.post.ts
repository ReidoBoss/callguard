export default defineEventHandler(async (event): Promise<ScoreResult> => {
  const body = await readBody<{ transcript?: unknown }>(event)
  const transcript = typeof body?.transcript === 'string' ? body.transcript.trim() : ''

  if (!transcript) {
    throw createError({ statusCode: 400, statusMessage: 'Send a transcript to score' })
  }

  return scoreTranscript(transcript)
})
