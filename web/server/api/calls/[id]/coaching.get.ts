// Stub until #6: the answer key for demo calls, nothing for anything else
export default defineEventHandler(async (event): Promise<CoachingResult> => {
  const call = callFromEvent(event)
  await stubDelay(2400)
  return answerKeyFor(call.transcript)?.coaching ?? { reviewed: false, notes: [] }
})
