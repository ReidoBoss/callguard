// Agents ranked by high-severity flags, then lowest score, from the calls reviewed since the
// server started. Shortcut: score and flags come from the answer-key stub until #4 and #5
export default defineEventHandler(() => {
  const byAgent = new Map<string, { id: string, createdAt: string, score: number | null, highFlags: number }[]>()

  for (const call of calls.values()) {
    const agent = call.transcript.match(/^AGENT:\s*(.+)$/m)?.[1]?.trim() ?? 'Unknown'
    const review = answerKeyFor(call.transcript)
    const row = {
      id: call.id,
      createdAt: call.createdAt,
      score: review?.score.overall ?? null,
      highFlags: review?.flags.flags.filter(flag => flag.severity === 'high').length ?? 0,
    }
    byAgent.set(agent, [...(byAgent.get(agent) ?? []), row])
  }

  return [...byAgent].map(([agent, agentCalls]) => {
    // Calls with no score (pasted, not a demo call) count as calls but stay out of the average
    const scores = agentCalls.flatMap(call => call.score ?? [])
    return {
      agent,
      averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
      callCount: agentCalls.length,
      highFlags: agentCalls.reduce((sum, call) => sum + call.highFlags, 0),
      calls: agentCalls.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }
  }).sort((a, b) => b.highFlags - a.highFlags || (a.averageScore ?? 101) - (b.averageScore ?? 101))
})
