// The demo calls from #3, so the review page can load one without typing
export default defineEventHandler(async () => {
  const storage = useStorage('assets:calls')
  const keys = (await storage.getKeys()).filter(key => key.endsWith('.txt')).sort()

  return Promise.all(keys.map(async (key) => {
    const text = String(await storage.getItem(key) ?? '')
    return {
      id: key.replace(/\.txt$/, ''),
      agent: text.match(/^AGENT:\s*(.+)$/m)?.[1]?.trim() ?? null,
    }
  }))
})
