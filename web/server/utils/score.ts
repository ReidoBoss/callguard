// Scores a transcript against demo/checklist.md's script checklist (#4), one Gemma call

const checklist = [
  { id: 'greeting', label: 'Greeting', passes: 'The agent greets the caller, says the company name and their own first name' },
  { id: 'disclosure', label: 'Recording disclosure', passes: 'The agent says the call is recorded, before any account details are discussed' },
  { id: 'verify', label: 'Identity verification', passes: 'The agent verifies identity with at least two of: full name, date of birth, last four digits of the card, ZIP code, before discussing the account' },
  { id: 'purpose', label: 'Purpose confirmed', passes: 'The agent restates the caller\'s issue to confirm it' },
  { id: 'recap', label: 'Resolution recap', passes: 'Near the end, the agent summarises what was done and what happens next, with any timeline' },
  { id: 'closing', label: 'Closing', passes: 'The agent asks if there\'s anything else, thanks the caller, and closes' },
]

const system = `You are a call-center QA reviewer. Score the agent's call transcript against this script checklist.

${checklist.map(item => `- ${item.id}: passes when ${item.passes}`).join('\n')}

Each transcript line starts with a [mm:ss] timestamp. Judge each item strictly: it passes only if every part of its rule is met. A recap is a line that sums up the whole resolution; answering a question or giving one piece of advice is not a recap. For an item that passes, give the timestamp of the line that proves it. For an item that fails, give null.

Reply with only JSON, no prose, in exactly this shape, one entry per checklist id in this order:
{"items": [{"id": "greeting", "pass": true, "line": "00:00"}, {"id": "disclosure", "pass": false, "line": null}, ...]}`

export async function scoreTranscript(transcript: string): Promise<ScoreResult> {
  const reply = await gemmaJson<{ items?: { id?: string, pass?: boolean, line?: string | null }[] }>('score', system, transcript)
  // Keep our ids, labels and order whatever the model returns; a missing item fails
  const items = checklist.map(({ id, label }) => {
    const found = reply.items?.find(item => item.id === id)
    const pass = found?.pass === true
    const line = pass ? found?.line?.replace(/[[\]]/g, '') || null : null
    return { id, label, pass, line }
  })
  const overall = Math.round(100 * items.filter(item => item.pass).length / items.length)
  return { reviewed: true, overall, items }
}
