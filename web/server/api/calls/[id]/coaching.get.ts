// Demo coaching is seeded on creation until #6 generates it from Gemma.
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
  return { reviewed: notes.length > 0 || !!answerKeyFor(call.transcript), notes }
})
