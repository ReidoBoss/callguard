// The checklist and rules the next review uses (#17): the saved ones, or demo/checklist.md's
import type { ReviewSettings } from '#shared/settings'

export default defineEventHandler((): Promise<ReviewSettings> => getSettings())
