<script setup lang="ts">
import type { CallSummary } from '#shared/calls'

interface TeamAgent {
  name: string
  calls: CallSummary[]
  averageScore: number | null
  highSeverityFlagCount: number
}

const { data: calls, pending, error } = await useFetch<CallSummary[]>('/api/calls')
const expandedAgent = ref<string | null>(null)

const agents = computed<TeamAgent[]>(() => {
  const grouped = new Map<string, CallSummary[]>()
  for (const call of calls.value ?? []) {
    const existing = grouped.get(call.agent) ?? []
    existing.push(call)
    grouped.set(call.agent, existing)
  }

  return Array.from(grouped, ([name, agentCalls]) => {
    const scores = agentCalls.flatMap(call => call.score === null ? [] : [call.score])
    return {
      name,
      calls: agentCalls,
      averageScore: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
      highSeverityFlagCount: agentCalls.reduce((sum, call) => sum + call.highSeverityFlagCount, 0),
    }
  }).sort((a, b) => b.highSeverityFlagCount - a.highSeverityFlagCount
    || (a.averageScore ?? Number.POSITIVE_INFINITY) - (b.averageScore ?? Number.POSITIVE_INFINITY)
    || a.name.localeCompare(b.name))
})

function toggleAgent(name: string) {
  expandedAgent.value = expandedAgent.value === name ? null : name
}

function formatScore(score: number | null) {
  return score === null ? '—' : `${Math.round(score)}%`
}
</script>

<template>
  <main class="mx-auto max-w-6xl space-y-6 px-6 py-10">
    <header>
      <h1 class="text-2xl font-semibold">Team</h1>
      <p class="text-muted-foreground mt-1 text-sm">Ranked by high severity flags, then average score. Based on saved calls.</p>
    </header>

    <section class="border-border bg-card overflow-hidden rounded-lg border" aria-label="Team call reviews">
      <p v-if="pending" class="text-muted-foreground p-6 text-sm">Loading team reviews…</p>
      <p v-else-if="error" class="text-destructive p-6 text-sm" role="alert">
        Couldn't load team reviews. Try refreshing the page.
      </p>
      <p v-else-if="!agents.length" class="text-muted-foreground p-6 text-sm">
        No reviewed calls yet. Agents will appear after the first review.
      </p>
      <ul v-else>
        <li v-for="agent in agents" :key="agent.name" class="border-b last:border-b-0">
          <button
            type="button"
            class="hover:bg-accent/50 grid w-full grid-cols-[1.5fr_0.8fr_1fr_1fr] items-center gap-4 px-5 py-4 text-left"
            :aria-expanded="expandedAgent === agent.name"
            @click="toggleAgent(agent.name)"
          >
            <span class="font-medium">{{ agent.name }}</span>
            <span class="text-sm">{{ formatScore(agent.averageScore) }} <span class="text-muted-foreground">avg.</span></span>
            <span class="text-sm">{{ agent.calls.length }} {{ agent.calls.length === 1 ? 'call' : 'calls' }}</span>
            <span class="text-sm">{{ agent.highSeverityFlagCount }} high severity flags</span>
          </button>
          <ul v-if="expandedAgent === agent.name" class="bg-muted/40 space-y-1 px-5 py-3">
            <li v-for="call in agent.calls" :key="call.id">
              <NuxtLink :to="`/calls/${call.id}`" class="hover:text-primary flex items-center justify-between gap-4 rounded px-2 py-2 text-sm">
                <span>Call reviewed {{ new Date(call.createdAt).toLocaleString() }}</span>
                <span class="text-muted-foreground">{{ formatScore(call.score) }} · {{ call.highSeverityFlagCount }} high severity</span>
              </NuxtLink>
            </li>
          </ul>
        </li>
      </ul>
    </section>
  </main>
</template>
