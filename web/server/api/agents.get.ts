import { getHighSeverityFlagCount, getOverallScore } from '#shared/calls'
import type { CallReviewRecord } from '#shared/calls'

// Agents ranked by high-severity flags, then lowest score, across saved reviews.
export default defineEventHandler(async () => {
  const byAgent = new Map<string, { id: string, createdAt: string, score: number | null, highFlags: number }[]>()
  const storage = useStorage<CallReviewRecord>('calls')
  const reviews = await Promise.all((await storage.getKeys()).map(key => storage.getItem(key)))

  for (const call of reviews) {
    if (!call) continue
    const agent = call.agent
    const row = {
      id: call.id,
      createdAt: call.createdAt,
      score: getOverallScore(call.score),
      highFlags: getHighSeverityFlagCount(call.flags),
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
