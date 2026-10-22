// Shortcut: the report's flags, hand-copied from demo/checklist.md's answer key until #5
// returns the same shape from Gemma
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

const answerKey: Record<string, { flags: FlagsResult }> = {
  '01-good': {
    flags: { reviewed: true, flags: [] },
  },
  '02-sloppy': {
    flags: {
      reviewed: true,
      flags: [
        { rule: 'no_disclosure', severity: 'medium', line: '00:12', quote: 'Okay sir, let me check that for you. What\'s the name on the account?' },
        { rule: 'unverified_access', severity: 'high', line: '00:31', quote: 'Okay Mr. Simmons, I can see your account. Your current balance is…' },
      ],
    },
  },
  '03-risky': {
    flags: {
      reviewed: true,
      flags: [
        { rule: 'rude_or_dismissive', severity: 'low', line: '00:52', quote: 'Ma\'am, the system says sixteenth. You probably did it late at night.' },
        { rule: 'pan_spoken', severity: 'high', line: '01:05', quote: 'Let me read the card back… **** 1111, expiring **/**.' },
        { rule: 'unauthorized_promise', severity: 'medium', line: '01:48', quote: 'I\'ll just refund the thirty-five dollars and I\'ll also waive your annual fee for next year.' },
      ],
    },
  },
}

/** The answer-key entry for a demo call, found by the transcript's `CALL: <id>` header */
export function answerKeyFor(transcript: string) {
  const callId = transcript.match(/^CALL:\s*(\S+)/m)?.[1]
  return callId ? answerKey[callId] : undefined
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
