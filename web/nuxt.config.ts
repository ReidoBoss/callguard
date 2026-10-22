// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', 'shadcn-nuxt'],
  devtools: { enabled: true },
  css: ['~/assets/css/tailwind.css'],
  // Server-only: local whisper.cpp binary and model for transcription (#28), and the Gemma
  // endpoint (#4), from web/.env. Deploy overrides them with NUXT_GEMMA_* at runtime
  runtimeConfig: {
    whisperCli: process.env.WHISPER_CLI ?? '',
    whisperModel: process.env.WHISPER_MODEL ?? '',
    gemmaBaseUrl: process.env.GEMMA_BASE_URL ?? '',
    gemmaModel: process.env.GEMMA_MODEL ?? '',
  },
  compatibilityDate: '2025-07-15',
  nitro: {
    storage: {
      calls: {
        driver: 'fs',
        base: '.data/calls',
      },
      // The Settings page's checklist and rules (#17)
      settings: {
        driver: 'fs',
        base: '.data/settings',
      },
    },
    // The demo calls from #3, bundled so the server can read them as `assets:calls`.
    // `dir` is relative to web/server/
    serverAssets: [{ baseName: 'calls', dir: '../../demo/calls' }],
  },
  vite: {
    plugins: [tailwindcss()],
  },
  // Nothing leaves the machine, not even Nuxt's usage stats (CLAUDE.md)
  telemetry: false,
})
