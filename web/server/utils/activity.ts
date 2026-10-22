export type Purpose = 'score' | 'flags' | 'coaching' | 'transcribe'

// Metadata only: never the transcript, a request body, or a URL's path or query
export interface Activity {
  at: string
  purpose: Purpose
  host: string
  selfHosted: boolean
  bytesSent: number | null
  durationMs: number
  ok: boolean
}

// Shortcut: in server memory, gone on restart. The privacy page (#20) reads it
export const activity: Activity[] = []

export function logActivity(entry: Omit<Activity, 'at'>) {
  activity.push({ at: new Date().toISOString(), ...entry })
}
