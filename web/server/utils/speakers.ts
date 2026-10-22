import type { Speaker } from '#shared/transcript'

// Labels each transcript line AGENT or CALLER (#27), one text-only Gemma call over the
// stitched lines, since neither whisper.cpp nor Gemma's audio input labels speakers

const system = `You label who speaks each line of a recorded call between a call-center agent and a caller (the customer).

Use the context: the agent answers with the company name and their own name, asks verification questions (full name, date of birth, last four digits of the card, ZIP code), looks up the account, reads policy, explains next steps and closes the call. The caller describes their problem, answers the verification questions and gives their own details. Calls usually alternate speakers, but not always: one person can say two lines in a row.

If a line could have been said by either speaker and the lines around it don't settle it, label it UNKNOWN. Don't guess.

The lines are numbered. Reply with only JSON, no prose, one entry per line in order, in exactly this shape:
{"speakers": [{"n": 1, "speaker": "AGENT"}, {"n": 2, "speaker": "CALLER"}, {"n": 3, "speaker": "UNKNOWN"}]}`

export async function labelSpeakers(lines: string[]): Promise<Speaker[]> {
  type Entry = { n?: number, speaker?: string }
  const reply = await gemmaJson<{ speakers?: Entry[] } | Entry[]>(
    'speakers',
    system,
    lines.map((text, index) => `${index + 1}. ${text}`).join('\n'),
  )
  // It sometimes drops the wrapper and replies with the bare array
  const entries = Array.isArray(reply) ? reply : reply.speakers
  // Matched by number, so a skipped line can't shift every label after it; anything that
  // isn't AGENT or CALLER stays UNKNOWN
  return lines.map((_, index) => {
    const speaker = entries?.find(entry => entry.n === index + 1)?.speaker
    return speaker === 'AGENT' || speaker === 'CALLER' ? speaker : 'UNKNOWN'
  })
}
