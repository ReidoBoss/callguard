// The only code that talks to Gemma (CLAUDE.md): our Ollama on the Mac mini, via web/.env

/** One chat call at temperature 0, its reply parsed as JSON. Logged for the privacy page (#20) */
export async function gemmaJson<T>(purpose: Purpose, system: string, user: string): Promise<T> {
  const { gemmaBaseUrl, gemmaModel } = useRuntimeConfig()
  const res = await outboundFetch<{ choices: { message: { content: string } }[] }>(
    purpose,
    `${gemmaBaseUrl}/chat/completions`,
    {
      method: 'POST',
      body: {
        model: gemmaModel,
        temperature: 0,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      },
    },
  )
  const text = res.choices[0]?.message.content ?? ''
  // Models wrap JSON in ```json fences even when told not to
  return JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')) as T
}
