// Transcribes an uploaded recording's chunks (#25) on this machine with whisper.cpp.
// Returns the transcript as `[mm:ss] UNKNOWN: text` lines, the demo calls' shape.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const dir = recordingDir(id)
  const chunks = await readChunks(dir).catch(() => {
    throw createError({ statusCode: 404, statusMessage: 'Recording not found' })
  })

  const transcript = await transcribeChunks(dir, chunks)
  logActivity({ kind: 'transcription', where: 'local', engine: 'whisper.cpp', recordingId: id })
  return { id, transcript }
})
