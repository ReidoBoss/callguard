// The script checklist (#4) and compliance rules (#5) a review uses: the QA lead's saved
// lists from the Settings page (#17), or demo/checklist.md's
import type { ComplianceRule, ReviewSettings } from '#shared/settings'

// demo/checklist.md's lists. The rules' wording is tuned so Gemma matches its answer key
export const defaultSettings: ReviewSettings = {
  checklist: [
    { id: 'greeting', label: 'Greeting', passes: 'The agent greets the caller, says the company name and their own first name' },
    { id: 'disclosure', label: 'Recording disclosure', passes: 'The agent says the call is recorded, before any account details are discussed' },
    { id: 'verify', label: 'Identity verification', passes: 'The agent verifies identity with at least two of: full name, date of birth, last four digits of the card, ZIP code, before discussing the account' },
    { id: 'purpose', label: 'Purpose confirmed', passes: 'The agent restates the caller\'s issue to confirm it' },
    { id: 'recap', label: 'Resolution recap', passes: 'Near the end, the agent summarises what was done and what happens next, with any timeline' },
    { id: 'closing', label: 'Closing', passes: 'The agent asks if there\'s anything else, thanks the caller, and closes' },
  ],
  rules: [
    { id: 'pan_spoken', severity: 'high', broken: 'The agent reads a full card number aloud, or asks the caller for it in full. The last four digits alone are fine' },
    { id: 'no_disclosure', severity: 'medium', broken: 'No agent line says the call is recorded before the agent asks about or looks up the account. If the greeting says the call is recorded, this is not broken. Cite the agent\'s first line about the account' },
    { id: 'unverified_access', severity: 'high', broken: 'The agent shares account details (balance, transactions, limits) before verifying identity with at least two of: full name, date of birth, last four digits of the card, ZIP code. A name alone is not verification' },
    { id: 'unauthorized_promise', severity: 'medium', broken: 'The agent says a refund, fee waiver or credit limit change is done or will be done, without saying it needs approval. Removing a fraud block or a hold is not a promise' },
    { id: 'rude_or_dismissive', severity: 'low', broken: 'The agent interrupts, blames the caller, or is dismissive' },
  ],
}

const storage = () => useStorage<ReviewSettings>('settings')

export async function getSettings(): Promise<ReviewSettings> {
  return await storage().getItem('review') ?? defaultSettings
}

export async function saveSettings(settings: ReviewSettings) {
  await storage().setItem('review', settings)
}

export async function resetSettings() {
  await storage().removeItem('review')
}

// `greeting`, `no_disclosure`: the report shows a rule's id, so a new one is named from its
// first words that say something ("The agent reads the card…" is `reads_card_…`)
const filler = new Set(['a', 'an', 'the', 'agent', 'caller', 'is', 'are', 'to', 'of', 'and', 'or'])
function slug(text: string) {
  const words = text.toLowerCase().split(/[^a-z\d]+/).filter(word => word && !filler.has(word))
  return words.slice(0, 4).join('_') || 'item'
}

function uniqueId(wanted: string, taken: Set<string>) {
  let id = wanted
  for (let n = 2; taken.has(id); n++) id = `${wanted}_${n}`
  taken.add(id)
  return id
}

const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''

/** The Settings page's lists, checked, or a 400. A row without an id gets one, and keeps it */
export function parseSettings(body: unknown): ReviewSettings {
  const fail = (statusMessage: string) => createError({ statusCode: 400, statusMessage })
  const input = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  if (!Array.isArray(input.checklist) || !Array.isArray(input.rules)) throw fail('Send a checklist and rules')

  const itemIds = new Set<string>()
  const checklist = input.checklist.map((row: Record<string, unknown>) => {
    const label = text(row?.label)
    const passes = text(row?.passes)
    if (!label || !passes) throw fail('Every checklist item needs a name and when it passes')
    return { id: uniqueId(text(row.id) || slug(label), itemIds), label, passes }
  })

  const ruleIds = new Set<string>()
  const rules = input.rules.map((row: Record<string, unknown>) => {
    const broken = text(row?.broken)
    const severity = row?.severity
    if (!broken) throw fail('Every rule needs to say when it flags')
    if (severity !== 'high' && severity !== 'medium' && severity !== 'low') throw fail('A rule\'s severity is high, medium or low')
    return { id: uniqueId(text(row.id) || slug(broken), ruleIds), severity, broken } satisfies ComplianceRule
  })

  if (!checklist.length || !rules.length) throw fail('Keep at least one checklist item and one rule')
  return { checklist, rules }
}
