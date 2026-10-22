// Stub until #5: the answer key for demo calls, nothing for anything else
export default defineEventHandler(async (event): Promise<FlagsResult> => {
  const call = callFromEvent(event)
  await stubDelay(1600)
  return answerKeyFor(call.transcript)?.flags ?? { reviewed: false, flags: [] }
})
