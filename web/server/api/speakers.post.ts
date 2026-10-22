// Labels each line of a transcribed recording AGENT, CALLER or UNKNOWN (#27)
export default defineEventHandler(async (event) => {
  const body = await readBody<{ lines?: unknown }>(event)
  const lines = Array.isArray(body?.lines) && body.lines.every(line => typeof line === 'string') ? body.lines as string[] : []

  if (!lines.length) {
    throw createError({ statusCode: 400, statusMessage: 'Send the transcript lines to label' })
  }

  return { speakers: await labelSpeakers(lines) }
})
