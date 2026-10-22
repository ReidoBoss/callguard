import { flagKey, storedFlagKey } from '#shared/calls'
import type { CallReviewRecord } from '#shared/calls'

// Confirms or dismisses one flag on a saved call (#21); status null puts it back to waiting
export default defineEventHandler(async (event) => {
  const call = await callFromEvent(event)
  const body = await readBody<Record<string, unknown> | null>(event)

  const key = flagKey(typeof body?.rule === 'string' ? body.rule : '', typeof body?.line === 'string' ? body.line : '')
  if (!call.flags.some(flag => storedFlagKey(flag) === key)) {
    throw createError({ statusCode: 404, statusMessage: 'No such flag on this call' })
  }

  const status = body?.status
  if (status !== 'confirmed' && status !== 'dismissed' && status !== null) {
    throw createError({ statusCode: 400, statusMessage: 'Status must be confirmed, dismissed or null' })
  }
  if (body?.note !== undefined && typeof body.note !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Note must be text' })
  }

  const decisions = Object.fromEntries(Object.entries(call.decisions ?? {}).filter(([other]) => other !== key))
  if (status !== null) {
    decisions[key] = { status, note: (body?.note as string | undefined)?.trim().slice(0, 500) ?? '', at: new Date().toISOString() }
  }

  await useStorage<CallReviewRecord>('calls').setItem(call.id, { ...call, decisions })
  return decisions
})
