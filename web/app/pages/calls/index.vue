<script setup lang="ts">
import type { CallSummary } from '#shared/calls'

const { data: calls, pending, error } = await useFetch<CallSummary[]>('/api/calls')

function formatScore(score: number | null) {
  return score === null ? '—' : `${Math.round(score)}%`
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}
</script>

<template>
  <main class="mx-auto max-w-6xl space-y-6 px-6 py-10">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">Calls</h1>
        <p class="text-muted-foreground mt-1 text-sm">Saved call reviews, newest first.</p>
      </div>
      <NuxtLink to="/" class="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium">
        Review a call
      </NuxtLink>
    </header>

    <section class="border-border bg-card overflow-hidden rounded-lg border" aria-label="Saved call reviews">
      <p v-if="pending" class="text-muted-foreground p-6 text-sm">Loading calls…</p>
      <p v-else-if="error" class="text-destructive p-6 text-sm" role="alert">
        Couldn't load saved calls. Try refreshing the page.
      </p>
      <p v-else-if="!calls?.length" class="text-muted-foreground p-6 text-sm">
        No reviewed calls yet. Start a review to see it here.
      </p>
      <div v-else class="overflow-x-auto">
        <div class="min-w-[38rem]">
          <div class="text-muted-foreground grid grid-cols-[1.5fr_0.7fr_1fr_1.2fr] gap-4 border-b px-5 py-3 text-xs font-medium uppercase tracking-wide">
            <span>Agent</span>
            <span>Score</span>
            <span>High severity flags</span>
            <span>Reviewed</span>
          </div>
          <ul>
            <li v-for="call in calls" :key="call.id" class="border-b last:border-b-0">
              <NuxtLink
                :to="`/calls/${call.id}`"
                class="hover:bg-accent/60 focus-visible:ring-ring grid grid-cols-[1.5fr_0.7fr_1fr_1.2fr] items-center gap-4 px-5 py-4 text-sm focus-visible:ring-2 focus-visible:outline-none"
              >
                <span class="font-medium">{{ call.agent }}</span>
                <span>{{ formatScore(call.score) }}</span>
                <span>{{ call.highSeverityFlagCount }}</span>
                <time class="text-muted-foreground" :datetime="call.createdAt">{{ formatDate(call.createdAt) }}</time>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </main>
</template>
