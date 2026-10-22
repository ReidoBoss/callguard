<script setup lang="ts">
const { data: log, refresh } = await useFetch('/api/activity')

const rows = computed(() => (log.value ?? []).toReversed())
const external = computed(() => rows.value.filter(row => !row.selfHosted).length)

function formatBytes(bytes: number | null) {
  if (bytes === null) return '–'
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
}
</script>

<template>
  <main class="mx-auto max-w-5xl space-y-6 px-6 py-8">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">Privacy</h1>
        <p class="text-muted-foreground mt-1 text-sm">
          Every request Call Buddy's server sent since it started. Only the destination is logged, never call content.
        </p>
      </div>
      <button type="button" class="border-input hover:bg-accent rounded-md border px-3 py-1.5 text-sm" @click="refresh()">
        Refresh
      </button>
    </header>

    <p
      v-if="rows.length"
      :class="external ? 'border-red-600 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200' : 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'"
      class="rounded-lg border px-4 py-3 font-medium"
    >
      <template v-if="external">{{ external }} of {{ rows.length }} requests went to an external host.</template>
      <template v-else>All {{ rows.length }} requests stayed on our own hardware.</template>
    </p>

    <p v-if="!rows.length" class="text-muted-foreground rounded-lg border p-6 text-sm">
      Nothing sent yet. Review or transcribe a call and each request shows up here.
    </p>

    <table v-else class="w-full overflow-hidden rounded-lg border text-sm">
      <thead class="bg-muted text-muted-foreground text-left">
        <tr>
          <th scope="col" class="px-4 py-3 font-medium">Time</th>
          <th scope="col" class="px-4 py-3 font-medium">Purpose</th>
          <th scope="col" class="px-4 py-3 font-medium">Destination</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Bytes sent</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Duration</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="index" class="border-t">
          <td class="px-4 py-3 tabular-nums">{{ new Date(row.at).toLocaleTimeString() }}</td>
          <td class="px-4 py-3">
            {{ row.purpose }}<span v-if="!row.ok" class="text-muted-foreground"> (failed)</span>
          </td>
          <td class="px-4 py-3">
            <span class="mr-2 font-mono text-xs">{{ row.host }}</span>
            <span
              :class="row.selfHosted ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'"
              class="rounded-full px-2.5 py-0.5 text-xs font-medium"
            >
              {{ row.selfHosted ? 'self-hosted' : 'external' }}
            </span>
          </td>
          <td class="px-4 py-3 text-right tabular-nums">{{ formatBytes(row.bytesSent) }}</td>
          <td class="px-4 py-3 text-right tabular-nums">{{ row.durationMs }} ms</td>
        </tr>
      </tbody>
    </table>
  </main>
</template>
