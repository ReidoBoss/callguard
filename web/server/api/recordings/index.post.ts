import { writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

// Upload a recording as multipart field `file`. Returns its id and 30-second chunks.
// The temp folder stays until DELETE /api/recordings/:id, so transcription can read it.
export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  const upload = parts?.find(part => part.name === 'file' && part.filename)
  if (!upload?.filename) {
    throw createError({ statusCode: 400, statusMessage: 'Send the recording as multipart field "file"' })
  }

  const ext = extname(upload.filename).toLowerCase()
  if (!RECORDING_TYPES.includes(ext)) {
    throw createError({
      statusCode: 415,
      statusMessage: `Unsupported file type "${ext || 'none'}". Use ${RECORDING_TYPES.join(', ')}`,
    })
  }

  const { id, dir } = await createRecordingDir()
  try {
    const input = join(dir, `original${ext}`)
    await writeFile(input, upload.data)
    const chunks = await chunkRecording(input, dir)
    return { id, chunks }
  }
  catch (err) {
    await deleteRecording(id)
    throw err
  }
})
