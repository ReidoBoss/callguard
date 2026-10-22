import type { CallReviewRecord } from '#shared/calls'

// The saved notes, or Gemma's (#6) from the transcript, score (#4) and flags (#5) the first
// time they're asked for, saved with the call
export default defineEventHandler(async (event): Promise<CoachingResult> => {
  const call = await callFromEvent(event)
  const coaching = call.coaching
  const savedNotes = coaching && typeof coaching === 'object' && !Array.isArray(coaching) ? coaching.notes : coaching
  const values = Array.isArray(savedNotes) ? savedNotes : [savedNotes]
  const notes = values.flatMap((note): CoachingResult['notes'] => {
    if (typeof note === 'string') return note.trim() ? [{ text: note, line: null }] : []
    if (!note || typeof note !== 'object' || Array.isArray(note) || typeof note.text !== 'string') return []
    return [{ text: note.text, line: typeof note.line === 'string' ? note.line : null }]
  })
  if (notes.length > 0) return { reviewed: true, notes }

  // The score route scores and saves the call if it hasn't been yet, so read the call again after
  const score = await $fetch<ScoreResult>(`/api/calls/${call.id}/score`)
  const { flags } = await $fetch<FlagsResult>(`/api/calls/${call.id}/flags`)
  const result = await coachTranscript(call.transcript, score.items, flags)
  const storage = useStorage<CallReviewRecord>('calls')
  const latest = await storage.getItem(call.id) ?? call
  await storage.setItem(call.id, { ...latest, coaching: { ...result, notes: result.notes.map(note => ({ ...note })) } })
  return result
})
