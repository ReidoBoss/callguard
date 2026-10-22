// What the report's routes return, and the saved call they read
import type { CallReviewRecord } from '#shared/calls'

export type Severity = 'high' | 'medium' | 'low'

export interface ScoreResult {
  reviewed: boolean
  overall: number | null
  items: { id: string, label: string, pass: boolean, line: string | null }[]
}

export interface FlagsResult {
  reviewed: boolean
  flags: { rule: string, severity: Severity, line: string, quote: string }[]
}

export interface CoachingResult {
  reviewed: boolean
  notes: { text: string, line: string | null }[]
}

/** The stored call for a route's `id`, or a 404 */
export async function callFromEvent(event: Parameters<typeof getRouterParam>[0]) {
  const id = getRouterParam(event, 'id') ?? ''
  const call = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id)
    ? await useStorage<CallReviewRecord>('calls').getItem(id)
    : null
  if (!call) {
    throw createError({ statusCode: 404, statusMessage: 'No such call' })
  }
  return call
}
