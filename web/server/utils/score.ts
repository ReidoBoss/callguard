// Scores a transcript against the saved script checklist (#4), one Gemma call
import type { ChecklistItem } from '#shared/settings'

// Built per call, so a list saved on the Settings page (#17) is used by the next review
function systemPrompt(checklist: ChecklistItem[]) {
  const example = checklist.slice(0, 2).map((item, i) => i ? `{"id": "${item.id}", "pass": false, "line": null}` : `{"id": "${item.id}", "pass": true, "line": "00:00"}`).join(', ')
  return `You are a call-center QA reviewer. Score the agent's call transcript against this script checklist.

${checklist.map(item => `- ${item.id}: passes when ${item.passes}`).join('\n')}

Each transcript line starts with a [mm:ss] timestamp. Judge each item strictly: it passes only if every part of its rule is met. A recap is a line that sums up the whole resolution; answering a question or giving one piece of advice is not a recap. For an item that passes, give the timestamp of the line that proves it. For an item that fails, give null.

Reply with only JSON, no prose, in exactly this shape, one entry per checklist id in this order:
{"items": [${example}, ...]}`
}

export async function scoreTranscript(transcript: string): Promise<ScoreResult> {
  const { checklist } = await getSettings()
  const reply = await gemmaJson<{ items?: { id?: string, pass?: boolean, line?: string | null }[] }>('score', systemPrompt(checklist), transcript)
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
