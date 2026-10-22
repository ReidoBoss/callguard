// Saves the Settings page's lists (#17); the next score and flags call reads them
import type { ReviewSettings } from '#shared/settings'

export default defineEventHandler(async (event): Promise<ReviewSettings> => {
  const settings = parseSettings(await readBody(event))
  await saveSettings(settings)
  return settings
})
