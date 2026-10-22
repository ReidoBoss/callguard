<script setup lang="ts">
import { clock, stitchSegments } from '#shared/transcript'
import type { Segment } from '#shared/transcript'

// Uploads a recording, shows each step while it's transcribed on our own hardware, then lets
// the QA lead fix speakers and words before the normal review (#29)
const props = defineProps<{ file: File }>()
const emit = defineEmits<{ cancel: [] }>()

type Step = 'converting' | 'transcribing' | 'labeling' | 'ready'
type Speaker = 'AGENT' | 'CALLER'

const step = ref<Step>('converting')
const chunk = ref({ done: 0, total: 0 })
const error = ref<string | null>(null)
const recordingId = ref<string | null>(null)
const lines = ref<{ time: string, speaker: Speaker, text: string }[]>([])
const editing = ref<number | null>(null)
const agent = ref('')
const submitting = ref(false)

const steps: { key: Step, label: string }[] = [
  { key: 'converting', label: 'Converting' },
  { key: 'transcribing', label: 'Transcribing' },
  { key: 'labeling', label: 'Labeling speakers' },
]
const order: Step[] = ['converting', 'transcribing', 'labeling', 'ready']
const stepState = (key: Step) => {
  const at = order.indexOf(step.value)
  const of = order.indexOf(key)
  return of < at ? 'done' : of === at ? (error.value ? 'failed' : 'active') : 'waiting'
}

function failed(e: unknown) {
  error.value = (e as { statusMessage?: string }).statusMessage ?? 'Something went wrong, try again'
}

onMounted(async () => {
  try {
    const form = new FormData()
    form.append('file', props.file)
    const recording = await $fetch<{ id: string, chunks: unknown[] }>('/api/recordings', { method: 'POST', body: form })
    recordingId.value = recording.id

    step.value = 'transcribing'
    chunk.value = { done: 0, total: recording.chunks.length }
    const segments: Segment[] = []
    for (let index = 0; index < recording.chunks.length; index++) {
      const result = await $fetch<{ segments: Segment[] }>(`/api/recordings/${recording.id}/chunks/${index}` as string, { method: 'POST' })
      segments.push(...result.segments)
      chunk.value.done = index + 1
    }

    // Shortcut until #27 labels speakers: calls open with the agent's greeting and then
    // take turns, so alternate, AGENT first. The QA lead flips any that are wrong
    step.value = 'labeling'
    lines.value = stitchSegments(segments).map((line, index) => ({
      time: clock(line.ms),
      speaker: index % 2 === 0 ? 'AGENT' : 'CALLER',
      text: line.text,
    }))
    step.value = 'ready'
  }
  catch (e) {
    failed(e)
  }
})

// Puts the cursor in a line's text as soon as it opens for editing
const vFocus = { mounted: (el: HTMLElement) => el.focus() }

function toggleSpeaker(index: number) {
  const line = lines.value[index]!
  line.speaker = line.speaker === 'AGENT' ? 'CALLER' : 'AGENT'
}

async function review() {
  submitting.value = true
  error.value = null
  const header = agent.value.trim() ? `AGENT: ${agent.value.trim()}\n\n` : ''
  const transcript = header + lines.value.map(line => `[${line.time}] ${line.speaker}: ${line.text.trim()}`).join('\n')
  try {
    const { id } = await $fetch('/api/calls', { method: 'POST', body: { transcript } })
    // The audio isn't needed once the transcript is saved with the call
    if (recordingId.value) $fetch(`/api/recordings/${recordingId.value}` as string, { method: 'DELETE' }).catch(() => {})
    await navigateTo(`/calls/${id}`)
  }
  catch (e) {
    failed(e)
    submitting.value = false
  }
}

function cancel() {
  if (recordingId.value) $fetch(`/api/recordings/${recordingId.value}` as string, { method: 'DELETE' }).catch(() => {})
  emit('cancel')
}
</script>

<template>
  <section class="space-y-6" aria-labelledby="recording-heading">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 id="recording-heading" class="text-lg font-semibold">{{ file.name }}</h2>
        <p class="text-muted-foreground text-sm">Transcribed on this machine with whisper.cpp. The audio never leaves it.</p>
      </div>
      <button type="button" class="border-input hover:bg-accent rounded-md border px-3 py-1.5 text-sm" :disabled="submitting" @click="cancel">
        Cancel
      </button>
    </header>

    <ol class="grid gap-2 sm:grid-cols-3" aria-label="Progress">
      <li
        v-for="item in steps"
        :key="item.key"
        :class="{
          'border-emerald-600 text-emerald-800 dark:text-emerald-200': stepState(item.key) === 'done',
          'border-primary': stepState(item.key) === 'active',
          'border-red-600 text-red-700 dark:text-red-300': stepState(item.key) === 'failed',
          'text-muted-foreground': stepState(item.key) === 'waiting',
        }"
        class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
        :aria-current="stepState(item.key) === 'active' ? 'step' : undefined"
      >
        <span v-if="stepState(item.key) === 'done'" aria-hidden="true">✓</span>
        <span v-else-if="stepState(item.key) === 'active'" class="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
        <span v-else-if="stepState(item.key) === 'failed'" aria-hidden="true">✗</span>
        <span>
          {{ item.label }}<template v-if="item.key === 'transcribing' && chunk.total"> (chunk {{ Math.min(chunk.done + (step === 'transcribing' ? 1 : 0), chunk.total) }} of {{ chunk.total }})</template>
        </span>
      </li>
    </ol>

    <p v-if="error" class="text-destructive text-sm" role="alert">{{ error }}</p>

    <template v-if="step === 'ready'">
      <p class="text-muted-foreground text-sm">
        Speakers are a first guess, alternating from the agent's greeting. Click a speaker to switch it, and a line to fix its words.
      </p>

      <label class="block max-w-xs space-y-1">
        <span class="text-sm font-medium">Agent name</span>
        <input v-model="agent" type="text" placeholder="e.g. Kevin" class="border-input bg-background w-full rounded-md border px-3 py-1.5 text-sm">
      </label>

      <ol class="max-h-[60vh] space-y-1 overflow-y-auto rounded-lg border p-2">
        <li v-for="(line, index) in lines" :key="index" class="flex items-start gap-3 rounded px-2 py-1.5 text-sm">
          <span class="text-muted-foreground w-11 shrink-0 pt-1 font-mono text-xs">{{ line.time }}</span>
          <button
            type="button"
            role="switch"
            :aria-checked="line.speaker === 'AGENT'"
            :aria-label="`Speaker at ${line.time}: ${line.speaker}, click to switch`"
            :class="line.speaker === 'AGENT' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'"
            class="w-20 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
            @click="toggleSpeaker(index)"
          >
            {{ line.speaker }}
          </button>
          <!-- Card numbers stay masked on screen; the real words only show while that line is being edited -->
          <textarea
            v-if="editing === index"
            v-model="line.text"
            v-focus
            rows="2"
            class="border-input bg-background min-w-0 flex-1 rounded-md border px-2 py-1 text-sm"
            @blur="editing = null"
          />
          <button
            v-else
            type="button"
            class="hover:bg-accent min-w-0 flex-1 rounded px-2 py-0.5 text-left"
            :aria-label="`Edit line at ${line.time}`"
            @click="editing = index"
          >
            {{ maskCardNumbers(line.text) }}
          </button>
        </li>
      </ol>

      <button
        type="button"
        class="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
        :disabled="submitting || !lines.length"
        @click="review"
      >
        <span v-if="submitting" class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
        {{ submitting ? 'Reviewing…' : 'Review call' }}
      </button>
    </template>
  </section>
</template>
