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
        <div class="min-w-[46rem]">
          <div class="text-muted-foreground grid grid-cols-[1.3fr_0.6fr_1.9fr_1.1fr] gap-4 border-b px-5 py-3 text-xs font-medium uppercase tracking-wide">
            <span>Agent</span>
            <span>Score</span>
            <span>Flags</span>
            <span>Reviewed</span>
          </div>
          <ul>
            <li v-for="call in calls" :key="call.id" class="border-b last:border-b-0">
              <NuxtLink
                :to="`/calls/${call.id}`"
                class="hover:bg-accent/60 focus-visible:ring-ring grid grid-cols-[1.3fr_0.6fr_1.9fr_1.1fr] items-center gap-4 px-5 py-4 text-sm focus-visible:ring-2 focus-visible:outline-none"
              >
                <span class="flex flex-wrap items-center gap-2 font-medium">
                  {{ call.agent }}
                  <span v-if="call.flagCounts.waiting" class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                    Needs review
                  </span>
                </span>
                <span>{{ formatScore(call.score) }}</span>
                <span class="text-muted-foreground tabular-nums">
                  <span class="text-foreground">{{ call.flagCounts.confirmed }}</span> confirmed ·
                  {{ call.flagCounts.dismissed }} dismissed ·
                  <span :class="call.flagCounts.waiting > 0 && 'font-medium text-amber-700 dark:text-amber-300'">{{ call.flagCounts.waiting }} waiting</span>
                </span>
                <time class="text-muted-foreground" :datetime="call.createdAt">{{ formatDate(call.createdAt) }}</time>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </main>
</template>
