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
  const [silences] = await Promise.all([
    findSilences(join(dir, chunk.file)),
    runWhisper(whisperCli, ['-m', whisperModel, '-f', join(dir, chunk.file), '-l', 'en', '-np', '-oj', '-of', out]),
  ])
  const { transcription } = JSON.parse(await readFile(`${out}.json`, 'utf8')) as { transcription: WhisperSegment[] }
  return transcription
    // whisper invents "You" or "Thank you." in silence (#80): drop a segment that's mostly silent
    .filter(({ offsets: { from, to } }) => {
      const silent = silences.reduce((sum, [start, end]) => sum + Math.max(0, Math.min(to, end) - Math.max(from, start)), 0)
      return silent < 0.8 * (to - from)
    })
    .map(segment => ({ ms: chunk.startSec * 1000 + segment.offsets.from, text: segment.text }))
}

// Silent stretches of a chunk as [startMs, endMs], from ffmpeg's silencedetect. A noisy line
// has none, so nothing is dropped. An ffmpeg failure also returns none, never an error
function findSilences(file: string) {
  return new Promise<[number, number][]>((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'silencedetect=noise=-45dB:d=1', '-f', 'null', '-'])
    let stderr = ''
    ffmpeg.stderr.on('data', (data) => { stderr += data })
    ffmpeg.on('error', () => resolve([]))
    ffmpeg.on('close', () => {
      const silences: [number, number][] = []
      let start: number | null = null
      for (const [, kind, sec] of stderr.matchAll(/silence_(start|end): (-?[\d.]+)/g)) {
        if (kind === 'start') start = Math.max(0, Number(sec) * 1000)
        else if (start !== null) { silences.push([start, Number(sec) * 1000]); start = null }
      }
      // Silence that runs to the end of the chunk has a start but no end
      if (start !== null) silences.push([start, Infinity])
      resolve(silences)
    })
  })
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
