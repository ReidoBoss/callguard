// Transcribes one chunk of an uploaded recording (#25) on this machine with whisper.cpp, so
// the progress view (#29) can show "chunk 3 of 6". Returns its segments, not yet stitched
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const dir = recordingDir(id)
  const chunks = await readChunks(dir).catch(() => {
    throw createError({ statusCode: 404, statusMessage: 'Recording not found' })
  })
  const chunk = chunks[Number(getRouterParam(event, 'index'))]
  if (!chunk) {
    throw createError({ statusCode: 404, statusMessage: 'No such chunk' })
  }

  const started = performance.now()
  const segments = await transcribeChunk(dir, chunk)
  // No network request: whisper.cpp runs here, so no bytes leave the machine
  logActivity({ purpose: 'transcribe', host: 'this machine (whisper.cpp)', selfHosted: true, bytesSent: null, durationMs: Math.round(performance.now() - started), ok: true })
  return { index: chunk.index, total: chunks.length, segments }
})
