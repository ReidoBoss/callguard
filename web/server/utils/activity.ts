export interface Activity {
  at: string
  kind: 'transcription'
  // 'local' ran on this machine; an outbound request would be 'outbound'
  where: 'local' | 'outbound'
  engine: string
  recordingId: string
}

// Shortcut: in server memory, gone on restart. The privacy page (#20) reads it
export const activity: Activity[] = []

export function logActivity(entry: Omit<Activity, 'at'>) {
  activity.push({ at: new Date().toISOString(), ...entry })
}
