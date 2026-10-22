export default defineEventHandler(async (event) => {
  const body = await readBody<{ transcript?: unknown }>(event)
  const transcript = typeof body?.transcript === 'string' ? body.transcript.trim() : ''

  if (!transcript) {
    throw createError({ statusCode: 400, statusMessage: 'Paste a transcript first' })
  }

  const id = crypto.randomUUID()
  calls.set(id, { id, transcript, createdAt: new Date().toISOString() })
  return { id }
})
