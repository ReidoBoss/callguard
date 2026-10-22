<script setup lang="ts">
const { data: agents } = await useFetch('/api/agents')

const selected = ref<string | null>(null)
const selectedAgent = computed(() => agents.value?.find(row => row.agent === selected.value))

function toggle(agent: string) {
  selected.value = selected.value === agent ? null : agent
}
</script>

<template>
  <main class="mx-auto max-w-5xl space-y-6 px-6 py-8">
    <header>
      <h1 class="text-2xl font-semibold">Agents</h1>
      <p class="text-muted-foreground mt-1 text-sm">
        Ranked by high-severity flags, then script score, across saved call reviews.
      </p>
    </header>

    <p v-if="!agents?.length" class="text-muted-foreground rounded-lg border p-6 text-sm">
      No calls reviewed yet. <NuxtLink to="/" class="underline">Review a call</NuxtLink> and its agent shows up here.
    </p>

    <template v-else>
      <table class="w-full overflow-hidden rounded-lg border text-sm">
        <thead class="bg-muted text-muted-foreground text-left">
          <tr>
            <th scope="col" class="px-4 py-3 font-medium">Agent</th>
            <th scope="col" class="px-4 py-3 text-right font-medium">Average score</th>
            <th scope="col" class="px-4 py-3 text-right font-medium">Calls</th>
            <th scope="col" class="px-4 py-3 text-right font-medium">Confirmed high flags</th>
            <th scope="col" class="px-4 py-3 text-right font-medium">High flags waiting</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in agents"
            :key="row.agent"
            :class="selected === row.agent ? 'bg-accent' : 'hover:bg-accent/50'"
            class="cursor-pointer border-t"
            @click="toggle(row.agent)"
          >
            <th scope="row" class="px-4 py-3 text-left font-medium">
              <button type="button" class="hover:underline" :aria-expanded="selected === row.agent" @click.stop="toggle(row.agent)">
                {{ row.agent }}
              </button>
            </th>
            <td class="px-4 py-3 text-right tabular-nums">{{ row.averageScore === null ? '–' : `${row.averageScore}%` }}</td>
            <td class="px-4 py-3 text-right tabular-nums">{{ row.callCount }}</td>
            <td class="px-4 py-3 text-right tabular-nums">
              <span :class="row.highConfirmed ? 'bg-red-600 text-white' : 'text-muted-foreground'" class="rounded-full px-2.5 py-0.5">
                {{ row.highConfirmed }}
              </span>
            </td>
            <td class="px-4 py-3 text-right tabular-nums">
              <span :class="row.highWaiting ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200' : 'text-muted-foreground'" class="rounded-full px-2.5 py-0.5">
                {{ row.highWaiting }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <section v-if="selectedAgent" class="space-y-3 rounded-lg border p-4" aria-labelledby="agent-calls-heading">
        <h2 id="agent-calls-heading" class="font-medium">{{ selectedAgent.agent }}'s calls</h2>
        <ul class="divide-y">
          <li v-for="call in selectedAgent.calls" :key="call.id">
            <NuxtLink :to="`/calls/${call.id}`" class="hover:bg-accent flex items-center justify-between gap-4 rounded px-2 py-2 text-sm">
              <span>{{ new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
              <span class="text-muted-foreground flex gap-4 tabular-nums">
                <span>{{ call.score === null ? 'not scored' : `${call.score}%` }}</span>
                <span>{{ call.highConfirmed }} high confirmed</span>
                <span>{{ call.highWaiting }} high waiting</span>
                <span aria-hidden="true">→</span>
              </span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </template>
  </main>
</template>
