// "Reset to defaults" (#17): forget the saved lists, so reviews use demo/checklist.md's again
import type { ReviewSettings } from '#shared/settings'

export default defineEventHandler(async (): Promise<ReviewSettings> => {
  await resetSettings()
  return defaultSettings
})
