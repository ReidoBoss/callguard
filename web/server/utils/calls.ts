export interface StoredCall {
  id: string
  transcript: string
  createdAt: string
}

// Shortcut: calls live in server memory and are gone on restart. #15 saves them
export const calls = new Map<string, StoredCall>()
