import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const RECORDING_TYPES = ['.wav', '.mp3', '.m4a']
export const CHUNK_SECONDS = 30

// Each recording gets its own folder in the OS temp dir, never the repo or web/.data/.
// The folder name is the recording id.
const PREFIX = 'callguard-'
const ID_PATTERN = /^callguard-[A-Za-z0-9_-]+$/

export interface Chunk {
  index: number
  file: string
  startSec: number
  endSec: number
}

export async function createRecordingDir() {
  const dir = await mkdtemp(join(tmpdir(), PREFIX))
  return { id: dir.slice(dir.lastIndexOf(PREFIX)), dir }
}

export function recordingDir(id: string) {
  if (!ID_PATTERN.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid recording id' })
  }
  return join(tmpdir(), id)
}

export async function deleteRecording(id: string) {
  await rm(recordingDir(id), { recursive: true, force: true })
}

// Converts to 16 kHz mono WAV and splits into 30-second chunks in one ffmpeg pass.
// The segment list gives each chunk's real start and end, in seconds.
export async function chunkRecording(input: string, dir: string): Promise<Chunk[]> {
  const list = join(dir, 'chunks.csv')
  await runFfmpeg([
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', input,
    '-vn', '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le',
    '-f', 'segment', '-segment_time', String(CHUNK_SECONDS),
    '-segment_list', list, '-segment_list_type', 'csv',
    '-reset_timestamps', '1',
    join(dir, 'chunk_%03d.wav'),
  ])
  return readChunks(dir)
}

export async function readChunks(dir: string): Promise<Chunk[]> {
  const rows = (await readFile(join(dir, 'chunks.csv'), 'utf8')).trim().split(/\r?\n/).filter(Boolean)
  return rows.map((row, index) => {
    const [file = '', start = '0', end = '0'] = row.split(',')
    return { index, file, startSec: Math.round(Number(start)), endSec: Number(end) }
  })
}

function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args)
    let stderr = ''
    ffmpeg.stderr.on('data', (data) => { stderr += data })
    ffmpeg.on('error', (err: NodeJS.ErrnoException) => {
      reject(err.code === 'ENOENT'
        ? createError({
            statusCode: 503,
            statusMessage: 'ffmpeg is not installed. Install it (Windows: winget install Gyan.FFmpeg, macOS: brew install ffmpeg) and restart the dev server so it is on PATH.',
          })
        : err)
    })
    ffmpeg.on('close', (code) => {
      if (code === 0) return resolve()
      reject(createError({
        statusCode: 422,
        statusMessage: 'ffmpeg could not read this recording',
        data: { detail: stderr.trim().slice(-500) },
      }))
    })
  })
}
