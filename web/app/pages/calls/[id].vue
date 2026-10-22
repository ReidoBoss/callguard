<script setup lang="ts">
const id = useRoute().params.id as string

// Each section loads on its own, so the report fills in as each AI call returns
const { data: call, error } = await useFetch(`/api/calls/${id}`)
const { data: score, pending: scorePending } = useLazyFetch(`/api/calls/${id}/score`, { server: false })
const { data: flagged, pending: flagsPending } = useLazyFetch(`/api/calls/${id}/flags`, { server: false })
const { data: coaching, pending: coachingPending } = useLazyFetch(`/api/calls/${id}/coaching`, { server: false })

const header = computed(() => {
  const text = call.value?.transcript ?? ''
  const field = (name: string) => text.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1]?.trim()
  return { call: field('CALL'), agent: field('AGENT'), caller: field('CALLER'), duration: field('DURATION') }
})

// `[01:05] AGENT: …` lines. Anything else (the header, pasted text without timestamps) is skipped
const lines = computed(() => (call.value?.transcript ?? '').split(/\r?\n/).flatMap((raw) => {
  const match = raw.match(/^\[(\d{1,2}:\d{2})\]\s*([A-Z]+):\s*(.*)$/)
  return match ? [{ time: match[1]!, speaker: match[2]!, text: match[3]! }] : []
}))

const flagsByLine = computed(() => new Map((flagged.value?.flags ?? []).map(flag => [flag.line, flag])))

const severityRow: Record<string, string> = {
  high: 'border-red-600 bg-red-50 dark:bg-red-950/40',
  medium: 'border-amber-500 bg-amber-50 dark:bg-amber-950/40',
  low: 'border-sky-500 bg-sky-50 dark:bg-sky-950/40',
}
const severityPill: Record<string, string> = {
  high: 'bg-red-600 text-white',
  medium: 'bg-amber-500 text-black',
  low: 'bg-sky-500 text-white',
}

const lineId = (time: string) => `line-${time.replace(':', '-')}`

function scrollToLine(time: string | null) {
  if (time) document.getElementById(lineId(time))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
</script>

<template>
  <main class="mx-auto max-w-7xl space-y-6 px-6 py-8">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <NuxtLink to="/" class="text-muted-foreground text-sm hover:underline">← Review another call</NuxtLink>
        <h1 class="mt-1 text-2xl font-semibold">
          Call report<span v-if="header.call" class="text-muted-foreground font-mono font-normal"> · {{ header.call }}</span>
        </h1>
        <p v-if="header.agent" class="text-muted-foreground text-sm">
          Agent {{ header.agent }}<template v-if="header.caller"> · Caller {{ header.caller }}</template><template v-if="header.duration"> · {{ header.duration }}</template>
        </p>
      </div>
      <p class="inline-flex items-center gap-2 rounded-full border border-emerald-600 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
        <span class="size-2 rounded-full bg-emerald-600" aria-hidden="true" />
        Processed on our own Gemma server, no call data left our hardware
      </p>
    </div>

    <p v-if="error" class="text-destructive" role="alert">
      This call isn't here. Calls are kept in memory, so a server restart clears them.
      <NuxtLink to="/" class="underline">Review it again</NuxtLink>
    </p>

    <div v-else class="grid gap-6 lg:grid-cols-[20rem_1fr_20rem]">
      <section class="space-y-3 rounded-lg border p-4" aria-labelledby="score-heading">
        <h2 id="score-heading" class="font-medium">Score</h2>
        <p v-if="scorePending" class="text-muted-foreground animate-pulse text-sm">Scoring against the script…</p>
        <p v-else-if="!score?.reviewed" class="text-muted-foreground text-sm">Not scored yet.</p>
        <template v-else>
          <p class="text-5xl font-semibold tabular-nums">{{ score.overall }}<span class="text-muted-foreground text-2xl">%</span></p>
          <ul class="space-y-1">
            <li v-for="item in score.items" :key="item.id">
              <button
                type="button"
                class="hover:bg-accent flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-sm disabled:cursor-default disabled:hover:bg-transparent"
                :disabled="!item.line"
                @click="scrollToLine(item.line)"
              >
                <span class="flex items-center gap-2">
                  <span :class="item.pass ? 'text-emerald-600' : 'text-red-600'" class="font-bold">{{ item.pass ? '✓' : '✗' }}</span>
                  {{ item.label }}
                </span>
                <span class="text-muted-foreground font-mono text-xs">{{ item.line ?? 'not found' }}</span>
              </button>
            </li>
          </ul>
        </template>
      </section>

      <section class="space-y-3 rounded-lg border p-4" aria-labelledby="transcript-heading">
        <div class="flex items-center justify-between gap-3">
          <h2 id="transcript-heading" class="font-medium">Transcript</h2>
          <p v-if="flagsPending" class="text-muted-foreground animate-pulse text-sm">Checking compliance…</p>
        </div>

        <ul v-if="flagged?.flags.length" class="flex flex-wrap gap-2">
          <li v-for="flag in flagged.flags" :key="flag.line + flag.rule">
            <button
              type="button"
              :class="severityPill[flag.severity]"
              class="rounded-full px-3 py-1 text-xs font-medium"
              @click="scrollToLine(flag.line)"
            >
              {{ flag.severity }} · {{ flag.rule.replaceAll('_', ' ') }} · {{ flag.line }}
            </button>
          </li>
        </ul>
        <p v-else-if="!flagsPending && flagged?.reviewed" class="text-sm text-emerald-700 dark:text-emerald-300">No compliance flags.</p>

        <ol class="max-h-[70vh] space-y-1 overflow-y-auto pr-2">
          <li
            v-for="line in lines"
            :id="lineId(line.time)"
            :key="line.time + line.text"
            :class="flagsByLine.get(line.time) ? severityRow[flagsByLine.get(line.time)!.severity] : 'border-transparent'"
            class="scroll-mt-4 rounded-r border-l-4 px-3 py-1.5 text-sm"
          >
            <span class="text-muted-foreground mr-2 font-mono text-xs">{{ line.time }}</span>
            <span class="mr-1 font-medium">{{ line.speaker === 'AGENT' ? header.agent ?? 'Agent' : 'Caller' }}:</span>
            {{ line.text }}
            <p v-if="flagsByLine.get(line.time)" class="mt-1 text-xs font-medium">
              ⚑ {{ flagsByLine.get(line.time)!.rule.replaceAll('_', ' ') }}
            </p>
          </li>
        </ol>
        <pre v-if="!lines.length" class="text-sm whitespace-pre-wrap">{{ call?.transcript }}</pre>
      </section>

      <section class="space-y-3 rounded-lg border p-4" aria-labelledby="coaching-heading">
        <h2 id="coaching-heading" class="font-medium">Coaching</h2>
        <p v-if="coachingPending" class="text-muted-foreground animate-pulse text-sm">Drafting coaching notes…</p>
        <p v-else-if="!coaching?.reviewed" class="text-muted-foreground text-sm">No coaching notes yet.</p>
        <ol v-else class="space-y-3">
          <li v-for="(note, index) in coaching.notes" :key="index" class="text-sm">
            <p>{{ note.text }}</p>
            <button
              v-if="note.line"
              type="button"
              class="text-muted-foreground mt-1 font-mono text-xs hover:underline"
              @click="scrollToLine(note.line)"
            >
              see {{ note.line }}
            </button>
          </li>
        </ol>
      </section>
    </div>
  </main>
</template>
