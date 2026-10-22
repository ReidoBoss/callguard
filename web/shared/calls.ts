export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

// The QA lead's call on one AI flag (#21)
export interface FlagDecision {
  status: 'confirmed' | 'dismissed'
  note: string
  at: string
}

export interface CallReviewRecord {
  id: string
  transcript: string
  score: JsonValue
  flags: JsonValue[]
  coaching: JsonValue
  agent: string
  createdAt: string
  // Keyed by flagKey(); optional so reviews saved before #21 still load
  decisions?: Record<string, FlagDecision>
}

/** Identifies a flag within its call: the same rule can fire on several lines */
export function flagKey(rule: string, line: string) {
  return `${rule}@${line}`
}

/** flagKey() for a saved flag, read the way the flags route reads it */
export function storedFlagKey(flag: JsonValue) {
  if (!flag || typeof flag !== 'object' || Array.isArray(flag)) return null
  const rule = typeof flag.rule === 'string' ? flag.rule : typeof flag.message === 'string' ? flag.message : 'Compliance flag'
  return flagKey(rule, typeof flag.line === 'string' ? flag.line : '')
}

export interface CallSummary {
  id: string
  agent: string
  score: number | null
  highSeverityFlagCount: number
  createdAt: string
}

export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value)
  if (Array.isArray(value)) return value.every(isJsonValue)
  if (typeof value === 'object') return Object.values(value).every(isJsonValue)
  return false
}

export function agentFromTranscript(transcript: string): string {
  return transcript.match(/^\s*AGENT:\s*(.+)$/im)?.[1]?.trim() || 'Unknown agent'
}

export function getOverallScore(score: JsonValue): number | null {
  if (typeof score === 'number' && Number.isFinite(score)) return score
  if (score && typeof score === 'object' && !Array.isArray(score)) {
    for (const key of ['overall', 'overallScore', 'score', 'percentage', 'percent']) {
      const value = score[key]
      if (typeof value === 'number' && Number.isFinite(value)) return value
    }
  }
  return null
}

/** High-severity flags, leaving out any the QA lead dismissed (#21) */
export function getHighSeverityFlagCount(flags: JsonValue[], decisions: CallReviewRecord['decisions'] = {}): number {
  return flags.filter((flag) => {
    if (!flag || typeof flag !== 'object' || Array.isArray(flag)) return false
    if (decisions[storedFlagKey(flag) ?? '']?.status === 'dismissed') return false
    return typeof flag.severity === 'string' && flag.severity.toLowerCase() === 'high'
  }).length
}

export function toCallSummary(review: CallReviewRecord): CallSummary {
  return {
    id: review.id,
    agent: review.agent,
    score: getOverallScore(review.score),
    highSeverityFlagCount: getHighSeverityFlagCount(review.flags, review.decisions),
    createdAt: review.createdAt,
  }
}
