// Flags compliance risks against the saved compliance rules (#5), one Gemma call
import type { ComplianceRule } from '#shared/settings'

// Built per call, so rules saved on the Settings page (#17) are used by the next review
function systemPrompt(rules: ComplianceRule[]) {
  const example = rules.slice(0, 2).map((rule, i) => i ? `{"rule": "${rule.id}", "broken": true, "line": "00:12"}` : `{"rule": "${rule.id}", "broken": false, "line": null}`).join(', ')
  return `You are a call-center compliance reviewer. Check the agent's call transcript against each of these rules:

${rules.map(rule => `- ${rule.id}: broken when ${rule.broken}`).join('\n')}

Each transcript line starts with a [mm:ss] timestamp. A rule is broken only if the transcript clearly shows it. For a broken rule, give the timestamp of the one agent line that shows it. For a rule that isn't broken, give null.

Reply with only JSON, no prose, in exactly this shape, one entry per rule in this order:
{"checks": [${example}, ...]}`
}

export async function flagTranscript(transcript: string): Promise<FlagsResult> {
  const { rules } = await getSettings()
  const reply = await gemmaJson<{ checks?: { rule?: string, broken?: boolean, line?: string | null }[] }>('flags', systemPrompt(rules), transcript)
  // The quote is the call's own line, not the model's, so the evidence can't be invented
  const lines = new Map(transcript.split(/\r?\n/).flatMap((raw) => {
    const match = raw.match(/^\[(\d{1,2}:\d{2})\]\s*[A-Z]+:\s*(.*)$/)
    return match ? [[match[1]!, match[2]!] as const] : []
  }))
  const flags: FlagsResult['flags'] = []
  for (const flag of reply.checks ?? []) {
    const rule = flag.broken === true ? rules.find(({ id }) => id === flag.rule) : undefined
    const line = flag.line?.replace(/[[\]]/g, '') ?? ''
    const quote = lines.get(line)
    // #21 keys decisions by rule and line, so each pair appears once
    if (!rule || quote === undefined || flags.some(other => other.rule === rule.id && other.line === line)) continue
    flags.push({ rule: rule.id, severity: rule.severity, line, quote })
  }
  return { reviewed: true, flags }
}
