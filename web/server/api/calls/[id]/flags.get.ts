// Read the same persisted flags used by the Calls list and Team view.
export default defineEventHandler(async (event): Promise<FlagsResult> => {
  const call = await callFromEvent(event)
  const flags = call.flags.flatMap((flag): FlagsResult['flags'] => {
    if (!flag || typeof flag !== 'object' || Array.isArray(flag)) return []
    const severity = typeof flag.severity === 'string' ? flag.severity.toLowerCase() : ''
    if (severity !== 'high' && severity !== 'medium' && severity !== 'low') return []
    return [{
      severity,
      rule: typeof flag.rule === 'string' ? flag.rule : typeof flag.message === 'string' ? flag.message : 'Compliance flag',
      line: typeof flag.line === 'string' ? flag.line : '',
      quote: typeof flag.quote === 'string' ? flag.quote : '',
    }]
  })
  return { reviewed: flags.length > 0 || !!answerKeyFor(call.transcript), flags }
})
