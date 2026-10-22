// Stub until #4: the answer key for demo calls, nothing for anything else
export default defineEventHandler(async (event): Promise<ScoreResult> => {
  const call = callFromEvent(event)
  await stubDelay(800)
  return answerKeyFor(call.transcript)?.score ?? { reviewed: false, overall: null, items: [] }
})
