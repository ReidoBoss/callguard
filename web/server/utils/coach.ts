// Drafts coaching notes from a transcript and its #4 score and #5 flags (#6), one Gemma call

const system = `You are a friendly call-center team lead coaching one of your agents after a call. You get the call transcript, what the agent did well and the problems found, most serious first.

Write 2 or 3 coaching notes, spoken to the agent as "you":
1. First, one specific thing the agent did well, praised warmly. Pick it from DONE WELL. Never praise a line listed under PROBLEMS.
2. Then one note for each of the first two PROBLEMS, in their order: one concrete action for next time. If there are no problems, one more thing to keep doing, starting with "Keep".

Each note is one action, in one or two short, plain sentences under 30 words that sound natural read aloud. No timestamps, rule ids or jargon in the text, and no blame. Never repeat a card number.

Each transcript line starts with a [mm:ss] timestamp. Tie every note to the timestamp of one line: the line where the agent did it, or, for something missed, the line where it should have happened.

Reply with only JSON, no prose, in exactly this shape:
{"notes": [{"text": "Great warm greeting: you gave the company name and your own.", "line": "00:00"}, {"text": "Tell the caller the call is recorded before you open their account.", "line": "00:12"}]}`

const severityRank = { high: 0, medium: 1, low: 3 }

// Gemma sometimes writes "at 01:45" or "[01:45]" into a note despite the prompt; the note's line already carries it
function stripTimestamps(text: string) {
  return text
    .replace(/\s*(?:\bat\s+)?[[(]?\b(?:at\s+)?\d{1,2}:\d{2}[\])]?/gi, '')
    .replace(/^[\s,;:]+/, '')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/^./, first => first.toUpperCase())
}

export async function coachTranscript(transcript: string, score: ScoreResult['items'], flags: FlagsResult['flags']): Promise<CoachingResult> {
  // Sorted here, not by the model: high and medium flags, then failed checklist items, then low flags
  const problems = [
    ...flags.map(flag => ({ rank: severityRank[flag.severity], text: `${flag.severity} risk, ${flag.rule} [${flag.line}]: "${flag.quote}"` })),
    ...score.filter(item => !item.pass).map(item => ({ rank: 2, text: `missed script step: ${item.label}` })),
  ].sort((a, b) => a.rank - b.rank)
  const doneWell = score.filter(item => item.pass).map(item => `- ${item.label} [${item.line}]`).join('\n') || 'Not scored'
  const user = `TRANSCRIPT:\n${transcript}\n\nDONE WELL:\n${doneWell}\n\nPROBLEMS:\n${problems.map((problem, i) => `${i + 1}. ${problem.text}`).join('\n') || 'None'}`

  const reply = await gemmaJson<{ notes?: { text?: string, line?: string | null }[] }>('coaching', system, user)
  // Only lines that are really in the call, so "see 01:05" always scrolls somewhere
  const times = new Set(transcript.match(/(?<=^\[)\d{1,2}:\d{2}(?=\])/gm))
  const notes = (reply.notes ?? []).flatMap((note) => {
    const text = note.text && stripTimestamps(note.text)
    const line = note.line?.replace(/[[\]]/g, '') ?? ''
    return text ? [{ text, line: times.has(line) ? line : null }] : []
  }).slice(0, 3)
  return { reviewed: notes.length > 0, notes }
}
