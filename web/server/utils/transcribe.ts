import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { clock, stitchSegments } from '#shared/transcript'
import type { Segment } from '#shared/transcript'

interface WhisperSegment {
  offsets: { from: number, to: number }
  text: string
}

// Transcribes one chunk with the local whisper.cpp CLI. Each segment's time is the chunk's
// start plus whisper's segment time, so it's measured from the start of the recording
export async function transcribeChunk(dir: string, chunk: Chunk): Promise<Segment[]> {
  const { whisperCli, whisperModel } = useRuntimeConfig()
  if (!whisperCli || !whisperModel) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Transcription is not set up here. Set WHISPER_CLI and WHISPER_MODEL in web/.env and restart the dev server.',
    })
  }

  const out = join(dir, chunk.file.replace(/\.wav$/, ''))
  await runWhisper(whisperCli, ['-m', whisperModel, '-f', join(dir, chunk.file), '-l', 'en', '-np', '-oj', '-of', out])
  const { transcription } = JSON.parse(await readFile(`${out}.json`, 'utf8')) as { transcription: WhisperSegment[] }
  return transcription.map(segment => ({ ms: chunk.startSec * 1000 + segment.offsets.from, text: segment.text }))
}

// Transcribes each chunk in order and stitches the lines (see stitchSegments).
// Speakers are UNKNOWN here; the review screen labels them with /api/speakers (#27).
export async function transcribeChunks(dir: string, chunks: Chunk[]) {
  const segments: Segment[] = []
  for (const chunk of chunks) {
    segments.push(...await transcribeChunk(dir, chunk))
  }
  return stitchSegments(segments).map(line => `[${clock(line.ms)}] UNKNOWN: ${line.text}`).join('\n')
}

function runWhisper(cli: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const whisper = spawn(cli, args)
    let stderr = ''
    whisper.stderr.on('data', (data) => { stderr += data })
    whisper.on('error', (err: NodeJS.ErrnoException) => {
      reject(err.code === 'ENOENT'
        ? createError({ statusCode: 503, statusMessage: `whisper.cpp not found at WHISPER_CLI (${cli})` })
        : err)
    })
    whisper.on('close', (code) => {
      if (code === 0) return resolve()
      reject(createError({
        statusCode: 422,
        statusMessage: 'whisper.cpp could not transcribe this recording',
        data: { detail: stderr.trim().slice(-500) },
      }))
    })
  })
}
