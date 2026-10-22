// Flags compliance risks against demo/checklist.md's compliance rules (#5), one Gemma call

const rules: { id: string, severity: Severity, broken: string }[] = [
  { id: 'pan_spoken', severity: 'high', broken: 'The agent reads a full card number aloud, or asks the caller for it in full. The last four digits alone are fine' },
  { id: 'no_disclosure', severity: 'medium', broken: 'No agent line says the call is recorded before the agent asks about or looks up the account. If the greeting says the call is recorded, this is not broken. Cite the agent\'s first line about the account' },
  { id: 'unverified_access', severity: 'high', broken: 'The agent shares account details (balance, transactions, limits) before verifying identity with at least two of: full name, date of birth, last four digits of the card, ZIP code. A name alone is not verification' },
  { id: 'unauthorized_promise', severity: 'medium', broken: 'The agent says a refund, fee waiver or credit limit change is done or will be done, without saying it needs approval. Removing a fraud block or a hold is not a promise' },
  { id: 'rude_or_dismissive', severity: 'low', broken: 'The agent interrupts, blames the caller, or is dismissive' },
]

const system = `You are a call-center compliance reviewer. Check the agent's call transcript against each of these rules:

${rules.map(rule => `- ${rule.id}: broken when ${rule.broken}`).join('\n')}

Each transcript line starts with a [mm:ss] timestamp. A rule is broken only if the transcript clearly shows it. For a broken rule, give the timestamp of the one agent line that shows it. For a rule that isn't broken, give null.

Reply with only JSON, no prose, in exactly this shape, one entry per rule in this order:
{"checks": [{"rule": "pan_spoken", "broken": false, "line": null}, {"rule": "no_disclosure", "broken": true, "line": "00:12"}, ...]}`

export async function flagTranscript(transcript: string): Promise<FlagsResult> {
  const reply = await gemmaJson<{ checks?: { rule?: string, broken?: boolean, line?: string | null }[] }>('flags', system, transcript)
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
