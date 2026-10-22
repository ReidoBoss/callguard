// A transcribed stretch of speech; `ms` is from the start of the whole recording
export interface Segment {
  ms: number
  text: string
}

/**
 * Joins segments into lines. A segment that doesn't end a sentence is joined to the next
 * one, so a sentence cut at a chunk boundary stays one line. Used by the server (#28) and
 * by the progress view (#29), which stitches chunks as they arrive
 */
export function stitchSegments(segments: Segment[]): Segment[] {
  const lines: Segment[] = []
  let open = false
  for (const segment of segments) {
    const text = segment.text.trim()
    if (!text) continue
    const last = lines.at(-1)
    if (open && last) last.text += ` ${text}`
    else lines.push({ ms: segment.ms, text })
    open = !/[.?!]["')\]]*$/.test(text)
  }
  return lines
}

/** `mm:ss`, the demo calls' timestamp format */
export function clock(ms: number) {
  const sec = Math.floor(ms / 1000)
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
}

/** Who said a line (#27). UNKNOWN when Gemma can't tell, for the QA lead to fix (#29) */
export type Speaker = 'AGENT' | 'CALLER' | 'UNKNOWN'
