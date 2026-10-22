import type { CallReviewRecord } from '#shared/calls'

// The saved flags, or Gemma's (#5) the first time a call is opened, saved with the call so
// the Calls list and Team view see them too. Calls saved before #5 count as reviewed if they have flags
export default defineEventHandler(async (event): Promise<FlagsResult> => {
  const call = await callFromEvent(event)
  let saved = call.flags
  if (!call.flagsReviewed && saved.length === 0) {
    const result = await flagTranscript(call.transcript)
    saved = result.flags.map(flag => ({ ...flag }))
    const storage = useStorage<CallReviewRecord>('calls')
    const latest = await storage.getItem(call.id) ?? call
    await storage.setItem(call.id, { ...latest, flags: saved, flagsReviewed: true })
  }

  const flags = saved.flatMap((flag): FlagsResult['flags'] => {
    if (!flag || typeof flag !== 'object' || Array.isArray(flag)) return []
    const severity = typeof flag.severity === 'string' ? flag.severity.toLowerCase() : ''
    if (severity !== 'high' && severity !== 'medium' && severity !== 'low') return []
    return [{
      severity,
      rule: typeof flag.rule === 'string' ? flag.rule : typeof flag.message === 'string' ? flag.message : 'Compliance flag',
      line: typeof flag.line === 'string' ? flag.line : '',
      // Masked here, so a card number never leaves the server in full
      quote: typeof flag.quote === 'string' ? maskCardNumbers(flag.quote) : '',
    }]
  })
  return { reviewed: true, flags }
})
