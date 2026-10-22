---
name: gemma
description: How CallGuard calls its Gemma 4 endpoint (Ollama on our Mac mini, through an SSH tunnel), probing what it supports, server-side calls from Nitro, and prompts that return strict JSON. Use whenever writing, changing or debugging code or prompts that talk to Gemma, or when the user types /gemma to probe the endpoint.
argument-hint: "[probe]"
---

# Gemma on our Mac mini

CLAUDE.md's first rule holds here: call data goes to this endpoint and nowhere else.

Gemma 4 runs in Ollama on the Mac mini, so it never leaves our hardware. The laptop
reaches it through the SSH tunnel in CLAUDE.md's **Environment**; start that first, or
every call below fails with "connection refused". Ollama exposes an OpenAI-compatible API
(`/v1/models`, `/v1/chat/completions`). **If the probe below says otherwise, update this
file first**, so every teammate's agent stops assuming it. Never use a `:cloud` tag: it
runs on Ollama's servers.

## Probe (run once, at the start of the day)

With `web/.env` loaded (`set -a; . web/.env; set +a`):

```sh
curl -s "$GEMMA_BASE_URL/models"
# speed and JSON obedience:
time curl -s "$GEMMA_BASE_URL/chat/completions" -H 'Content-Type: application/json' -d '{
  "model": "'"$GEMMA_MODEL"'",
  "messages": [{"role": "user", "content": "Reply with only this JSON: {\"ok\": true}"}],
  "temperature": 0
}'
```

### Measured 2026-10-22 (#2): `gemma4:e4b`, Ollama 0.40.8, mlx runner, model warm

- **Short prompt**: ~0.4 s, bare `{"ok": true}`.
- **~8k-token transcript** (four copies of the demo calls): read in full (the start isn't
  cut), even though `ollama ps` shows a 4096 context. ~17 s with thinking off, 19–29 s
  with it on.
- **Thinking is on by default**: hundreds of `reasoning` tokens before the answer.
  `"reasoning_effort": "none"` turns it off; one demo call took 3.2 s instead of 7.7 s.
  Untested whether scoring quality holds without it, so the example below leaves it on.
- **`"response_format": {"type": "json_object"}` fails**: HTTP 501, "structured output is
  unavailable". Don't send it. Without it, replies come in ```` ```json ```` fences, so keep
  the fence stripping in `gemmaJson`.
- **`input_audio` works** (base64 WAV, `"format": "wav"`): a 2:07 call came back word for
  word in 23 s, but its `[mm:ss]` timestamps were invented (the last line said `[01:04]`).
  That's why CLAUDE.md's Transcription row picks whisper.cpp (#28) and keeps this as the
  fallback.
- Not probed: `image_url` (for screenshots of call scripts), and `gemma4:12b`.

## Calling it from Nuxt

Only in `web/server/`, through `useRuntimeConfig()`; the browser never sees the endpoint.
Plain `$fetch`, no SDK, so no dependency to ask about:

```ts
// web/server/utils/gemma.ts
export async function gemmaJson<T>(system: string, user: string): Promise<T> {
  const { gemmaBaseUrl, gemmaModel } = useRuntimeConfig()
  const res = await $fetch<{ choices: { message: { content: string } }[] }>(
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
  const text = res.choices[0].message.content
  // Models wrap JSON in ```json fences even when told not to.
  return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '')) as T
}
```

`nuxt.config.ts` maps the env vars: `runtimeConfig: { gemmaBaseUrl: '', gemmaModel: '' }`
reads `NUXT_GEMMA_BASE_URL` and `NUXT_GEMMA_MODEL`, so `web/.env` uses those names once
the app exists. Update CLAUDE.md's **Environment** in the same change.

## Prompts that hold up in a live demo

- **One job per call.** Scoring the checklist, finding compliance risks and writing
  coaching notes are three calls, not one mega-prompt. A small model does each better,
  and the UI can show them as they land.
- **Give the schema in the prompt**, with one filled example, and say "only JSON".
- **Cite evidence.** Every flag returns the transcript line or timestamp it came from,
  so the UI can highlight it and a judge can see it isn't invented.
- **Redact on output too.** A flagged card number is shown masked (`**** 4242`).
- **temperature 0** for scoring, so the same call scores the same twice on stage.
- The demo calls and the answer key are in `demo/` (#3). Run all three against the
  answer key before the pitch.
