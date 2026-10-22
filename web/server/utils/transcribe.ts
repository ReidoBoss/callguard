import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

interface WhisperSegment {
  offsets: { from: number, to: number }
  text: string
}

interface Line {
  ms: number
  text: string
}

// Transcribes each chunk in order with the local whisper.cpp CLI and stitches the lines.
// Each line's time is the chunk's start plus whisper's segment time. A segment that
// doesn't end a sentence is joined to the next one, so a sentence cut at a chunk
// boundary stays one line. Speakers are UNKNOWN until #27 labels them.
export async function transcribeChunks(dir: string, chunks: Chunk[]) {
  const { whisperCli, whisperModel } = useRuntimeConfig()
  if (!whisperCli || !whisperModel) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Transcription is not set up here. Set WHISPER_CLI and WHISPER_MODEL in web/.env and restart the dev server.',
    })
  }

  const lines: Line[] = []
  let open = false
  for (const chunk of chunks) {
    const out = join(dir, chunk.file.replace(/\.wav$/, ''))
    await runWhisper(whisperCli, ['-m', whisperModel, '-f', join(dir, chunk.file), '-l', 'en', '-np', '-oj', '-of', out])
    const { transcription } = JSON.parse(await readFile(`${out}.json`, 'utf8')) as { transcription: WhisperSegment[] }

    for (const segment of transcription) {
      const text = segment.text.trim()
      if (!text) continue
      const last = lines.at(-1)
      if (open && last) last.text += ` ${text}`
      else lines.push({ ms: chunk.startSec * 1000 + segment.offsets.from, text })
      open = !/[.?!]["')\]]*$/.test(text)
    }
  }

  return lines.map(line => `[${clock(line.ms)}] UNKNOWN: ${line.text}`).join('\n')
}

function clock(ms: number) {
  const sec = Math.floor(ms / 1000)
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
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
