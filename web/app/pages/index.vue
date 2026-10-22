<script setup lang="ts">
// Every request here goes to our own /api routes, never off the machine (CLAUDE.md)
const { data: samples } = await useFetch('/api/samples')

const transcript = ref('')
const audioName = ref<string | null>(null)
const loadingSample = ref<string | null>(null)
const submitting = ref(false)
const error = ref<string | null>(null)

async function loadSample(id: string) {
  loadingSample.value = id
  error.value = null
  try {
    const sample = await $fetch(`/api/samples/${id}`)
    transcript.value = sample.transcript
  }
  catch {
    error.value = `Couldn't load sample ${id}`
  }
  finally {
    loadingSample.value = null
  }
}

// Audio needs #9's transcription, so for now a picked file is only acknowledged
function pickAudio(event: Event) {
  audioName.value = (event.target as HTMLInputElement).files?.[0]?.name ?? null
}

async function submit() {
  submitting.value = true
  error.value = null
  try {
    const { id } = await $fetch('/api/calls', { method: 'POST', body: { transcript: transcript.value } })
    await navigateTo(`/calls/${id}`)
  }
  catch (e) {
    error.value = (e as { statusMessage?: string }).statusMessage ?? 'Something went wrong, try again'
    submitting.value = false
  }
}
</script>

<template>
  <main class="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1fr_18rem]">
    <section class="space-y-6">
      <header>
        <h1 class="text-2xl font-semibold">Review a call</h1>
        <p class="text-muted-foreground mt-1 text-sm">
          Paste a transcript or upload a recording. It's reviewed on our own Gemma server.
        </p>
      </header>

      <form class="space-y-6" @submit.prevent="submit">
        <label class="block space-y-2">
          <span class="text-sm font-medium">Transcript</span>
          <textarea
            v-model="transcript"
            rows="16"
            placeholder="[00:00] AGENT: Thank you for calling…"
            class="border-input bg-background focus-visible:ring-ring w-full rounded-md border p-3 font-mono text-sm focus-visible:ring-2 focus-visible:outline-none"
            :disabled="submitting"
          />
        </label>

        <div class="space-y-2">
          <span class="text-sm font-medium">Recording</span>
          <input
            type="file"
            accept="audio/*"
            class="file:bg-secondary file:text-secondary-foreground block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-2"
            :disabled="submitting"
            @change="pickAudio"
          >
          <p class="text-muted-foreground text-sm">
            <template v-if="audioName">
              {{ audioName }} can't be reviewed yet: audio upload isn't ready, so paste its transcript instead.
            </template>
            <template v-else>
              Transcripts only for now. Audio upload is coming.
            </template>
          </p>
        </div>

        <p v-if="error" class="text-destructive text-sm" role="alert">{{ error }}</p>

        <button
          type="submit"
          class="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
          :disabled="submitting || !transcript.trim()"
        >
          <span v-if="submitting" class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
          {{ submitting ? 'Reviewing…' : 'Review call' }}
        </button>
      </form>
    </section>

    <aside class="space-y-3">
      <h2 class="text-sm font-medium">Demo calls</h2>
      <ul class="space-y-2">
        <li v-for="sample in samples" :key="sample.id">
          <button
            type="button"
            class="border-input hover:bg-accent flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm disabled:opacity-60"
            :disabled="submitting || loadingSample !== null"
            @click="loadSample(sample.id)"
          >
            <span>
              <span class="block font-mono">{{ sample.id }}</span>
              <span v-if="sample.agent" class="text-muted-foreground block text-xs">Agent: {{ sample.agent }}</span>
            </span>
            <span class="text-muted-foreground text-xs">{{ loadingSample === sample.id ? 'Loading…' : 'Load sample' }}</span>
          </button>
        </li>
      </ul>
    </aside>
  </main>
</template>
