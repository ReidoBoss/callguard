// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', 'shadcn-nuxt'],
  devtools: { enabled: true },
  css: ['~/assets/css/tailwind.css'],
  // Server-only: local whisper.cpp binary and model for transcription (#28), from web/.env
  runtimeConfig: {
    whisperCli: process.env.WHISPER_CLI ?? '',
    whisperModel: process.env.WHISPER_MODEL ?? '',
  },
  compatibilityDate: '2025-07-15',
  nitro: {
    storage: {
      calls: {
        driver: 'fs',
        base: '.data/calls',
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
