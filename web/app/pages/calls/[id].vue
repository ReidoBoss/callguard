<script setup lang="ts">
import { getHighSeverityFlagCount, getOverallScore } from '#shared/calls'
import type { CallReviewRecord, JsonValue } from '#shared/calls'

const route = useRoute()
const callId = computed(() => String(route.params.id ?? ''))
const { data: call, pending, error } = await useFetch<CallReviewRecord>(
  () => `/api/calls/${encodeURIComponent(callId.value)}`,
)

const overallScore = computed(() => call.value ? getOverallScore(call.value.score) : null)
const highSeverityFlagCount = computed(() => call.value ? getHighSeverityFlagCount(call.value.flags) : 0)

function asRecord(value: JsonValue): Record<string, JsonValue> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null
}

function formatValue(value: JsonValue) {
  if (value === null) return 'Not available yet'
  if (typeof value === 'string') return value || 'Not available yet'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value, null, 2)
}

function flagMessage(flag: JsonValue) {
  if (typeof flag === 'string') return flag
  const record = asRecord(flag)
  for (const key of ['message', 'description', 'risk', 'title']) {
    const value = record?.[key]
    if (typeof value === 'string') return value
  }
  return formatValue(flag)
}

function flagSeverity(flag: JsonValue) {
  const severity = asRecord(flag)?.severity
  return typeof severity === 'string' ? severity : 'Unspecified'
}

function coachingNotes(value: JsonValue | undefined) {
  if (value === undefined || value === null) return []
  if (typeof value === 'string') return value.trim() ? [value] : []
  if (Array.isArray(value)) return value.map(formatValue)

  const notes = asRecord(value)?.notes
  if (Array.isArray(notes)) return notes.map(formatValue)
  return [formatValue(value)]
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}
</script>

<template>
  <main class="mx-auto max-w-5xl space-y-6 px-6 py-10">
    <NuxtLink to="/calls" class="text-muted-foreground hover:text-foreground text-sm">← All calls</NuxtLink>

    <p v-if="pending" class="text-muted-foreground py-10 text-sm">Loading report…</p>
    <p v-else-if="error || !call" class="text-destructive py-10 text-sm" role="alert">
      This call report couldn't be found.
    </p>
    <template v-else>
      <header class="space-y-2">
        <p class="text-muted-foreground text-sm">Call report</p>
        <h1 class="text-2xl font-semibold">{{ call.agent }}</h1>
        <p class="text-muted-foreground text-sm">Reviewed {{ formatDate(call.createdAt) }}</p>
      </header>

      <section class="grid gap-4 sm:grid-cols-3" aria-label="Review summary">
        <article class="border-border bg-card rounded-lg border p-5">
          <h2 class="text-muted-foreground text-sm">Overall score</h2>
          <p class="mt-2 text-2xl font-semibold">
            {{ overallScore === null ? 'Not scored yet' : `${Math.round(overallScore)}%` }}
          </p>
        </article>
        <article class="border-border bg-card rounded-lg border p-5">
          <h2 class="text-muted-foreground text-sm">High severity flags</h2>
          <p class="mt-2 text-2xl font-semibold">{{ highSeverityFlagCount }}</p>
        </article>
        <article class="border-border bg-card rounded-lg border p-5">
          <h2 class="text-muted-foreground text-sm">Reviewed</h2>
          <p class="mt-2 text-sm font-medium">{{ formatDate(call.createdAt) }}</p>
        </article>
      </section>

      <section class="border-border bg-card space-y-3 rounded-lg border p-5">
        <h2 class="font-semibold">Compliance flags</h2>
        <p v-if="!call.flags.length" class="text-muted-foreground text-sm">No flags have been added to this review yet.</p>
        <ul v-else class="space-y-3">
          <li v-for="(flag, index) in call.flags" :key="index" class="border-border flex gap-3 rounded-md border p-3">
            <span class="bg-secondary text-secondary-foreground h-fit rounded px-2 py-1 text-xs font-medium">
              {{ flagSeverity(flag) }}
            </span>
            <p class="whitespace-pre-wrap text-sm">{{ flagMessage(flag) }}</p>
          </li>
        </ul>
      </section>

      <section class="border-border bg-card space-y-3 rounded-lg border p-5">
        <h2 class="font-semibold">Coaching</h2>
        <p v-if="!coachingNotes(call.coaching).length" class="text-muted-foreground text-sm">No coaching notes have been added to this review yet.</p>
        <ul v-else class="list-inside list-disc space-y-2 text-sm">
          <li v-for="(note, index) in coachingNotes(call.coaching)" :key="index" class="whitespace-pre-wrap">{{ note }}</li>
        </ul>
      </section>

      <section class="border-border bg-card space-y-3 rounded-lg border p-5">
        <h2 class="font-semibold">Transcript</h2>
        <pre class="bg-muted max-h-[32rem] overflow-auto rounded-md p-4 font-mono text-sm whitespace-pre-wrap">{{ call.transcript }}</pre>
      </section>
    </template>
  </main>
</template>
