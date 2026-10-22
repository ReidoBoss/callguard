// Transcribes an uploaded recording's chunks (#25) on this machine with whisper.cpp.
// Returns the transcript as `[mm:ss] UNKNOWN: text` lines, the demo calls' shape.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const dir = recordingDir(id)
  const chunks = await readChunks(dir).catch(() => {
    throw createError({ statusCode: 404, statusMessage: 'Recording not found' })
  })

  const started = performance.now()
  const transcript = await transcribeChunks(dir, chunks)
  // No network request: whisper.cpp runs here, so no bytes leave the machine
  logActivity({ purpose: 'transcribe', host: 'this machine (whisper.cpp)', selfHosted: true, bytesSent: null, durationMs: Math.round(performance.now() - started), ok: true })
  return { id, transcript }
})
