// Shortcut: the report's data, hand-copied from demo/checklist.md's answer key until
// #4 (score), #5 (flags) and #6 (coaching) return the same shapes from Gemma

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

const labels: Record<string, string> = {
  greeting: 'Greeting',
  disclosure: 'Recording disclosure',
  verify: 'Identity verification',
  purpose: 'Purpose confirmed',
  recap: 'Resolution recap',
  closing: 'Closing',
}

function score(lines: Record<string, string | null>): ScoreResult {
  const items = Object.entries(lines).map(([id, line]) => ({ id, label: labels[id] ?? id, pass: line !== null, line }))
  const overall = Math.round(100 * items.filter(item => item.pass).length / items.length)
  return { reviewed: true, overall, items }
}

const answerKey: Record<string, { score: ScoreResult, flags: FlagsResult, coaching: CoachingResult }> = {
  '01-good': {
    score: score({ greeting: '00:00', disclosure: '00:00', verify: '00:26', purpose: '00:37', recap: '01:45', closing: '02:04' }),
    flags: { reviewed: true, flags: [] },
    coaching: {
      reviewed: true,
      notes: [
        { text: 'A model call: you disclosed the recording, verified two details and recapped every next step with timelines.', line: '01:45' },
        { text: 'Offering to block the card before the caller asked was a great call. Keep doing that.', line: '01:19' },
      ],
    },
  },
  '02-sloppy': {
    score: score({ greeting: '00:00', disclosure: null, verify: null, purpose: '00:49', recap: null, closing: '01:11' }),
    flags: {
      reviewed: true,
      flags: [
        { rule: 'no_disclosure', severity: 'medium', line: '00:12', quote: 'Okay sir, let me check that for you. What\'s the name on the account?' },
        { rule: 'unverified_access', severity: 'high', line: '00:31', quote: 'Okay Mr. Simmons, I can see your account. Your current balance is…' },
      ],
    },
    coaching: {
      reviewed: true,
      notes: [
        { text: 'Nice, warm greeting with the company name and your own name.', line: '00:00' },
        { text: 'Tell the caller the call is recorded before you open the account.', line: '00:12' },
        { text: 'Verify a second detail, like date of birth or the last four of the card, before reading out the balance.', line: '00:31' },
      ],
    },
  },
  '03-risky': {
    score: score({ greeting: '00:00', disclosure: '00:00', verify: '00:32', purpose: '00:32', recap: '01:59', closing: null }),
    flags: {
      reviewed: true,
      flags: [
        { rule: 'rude_or_dismissive', severity: 'low', line: '00:52', quote: 'Ma\'am, the system says sixteenth. You probably did it late at night.' },
        { rule: 'pan_spoken', severity: 'high', line: '01:05', quote: 'Let me read the card back… **** 1111, expiring **/**.' },
        { rule: 'unauthorized_promise', severity: 'medium', line: '01:48', quote: 'I\'ll just refund the thirty-five dollars and I\'ll also waive your annual fee for next year.' },
      ],
    },
    coaching: {
      reviewed: true,
      notes: [
        { text: 'Solid verification: name, ZIP and date of birth before touching the account.', line: '00:32' },
        { text: 'Never read a full card number aloud. Confirm the last four digits only.', line: '01:05' },
        { text: 'Refunds and fee waivers need approval: say you\'ll request one, not that it\'s done.', line: '01:48' },
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
export function callFromEvent(event: Parameters<typeof getRouterParam>[0]) {
  const call = calls.get(getRouterParam(event, 'id') ?? '')
  if (!call) {
    throw createError({ statusCode: 404, statusMessage: 'No such call' })
  }
  return call
}

/** Stands in for Gemma's response time, so the report's sections fill in one by one */
export function stubDelay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
