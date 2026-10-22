<script setup lang="ts">
import { Printer, ShieldCheck } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { flagKey } from '#shared/calls'
import type { FlagDecision } from '#shared/calls'

const id = useRoute().params.id as string

// Each section loads on its own, so the report fills in as each AI call returns
const { data: call, error } = await useFetch(`/api/calls/${id}`)
const { data: score, status: scoreStatus } = useLazyFetch(`/api/calls/${id}/score`, { server: false })
const { data: flagged, status: flagsStatus } = useLazyFetch(`/api/calls/${id}/flags`, { server: false })
// Coaching reads the score and flags, so it waits for them: scoring the call twice at once would make both wait on Gemma
const { data: coaching, status: coachingStatus, execute: fetchCoaching } = useLazyFetch(`/api/calls/${id}/coaching`, { server: false, immediate: false })

// `status`, not `pending`: these fetch on the client only, so the server sees `idle` while hydration
// sees `pending`. Counting `idle` as loading renders the same loading text on both (#48)
const loading = (status: { value: string }) => computed(() => status.value === 'idle' || status.value === 'pending')
const scorePending = loading(scoreStatus)
const flagsPending = loading(flagsStatus)
const coachingPending = loading(coachingStatus)
watch([scorePending, flagsPending], ([scoring, flagging]) => {
  if (!scoring && !flagging) fetchCoaching()
}, { immediate: true })

const header = computed(() => {
  const text = call.value?.transcript ?? ''
  const field = (name: string) => text.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1]?.trim()
  return { call: field('CALL'), agent: call.value?.agent ?? field('AGENT'), caller: field('CALLER'), duration: field('DURATION') }
})

// `[01:05] AGENT: …` lines. Anything else (the header, pasted text without timestamps) is skipped
const lines = computed(() => (call.value?.transcript ?? '').split(/\r?\n/).flatMap((raw) => {
  const match = raw.match(/^\[(\d{1,2}:\d{2})\]\s*([A-Z]+):\s*(.*)$/)
  return match ? [{ time: match[1]!, speaker: match[2]!, text: match[3]! }] : []
}))

// Highest severity first, then by line, so the riskiest finding is the first one read (#47)
const severityRank: Record<string, number> = { high: 0, medium: 1, low: 2 }
const sortedFlags = computed(() => [...(flagged.value?.flags ?? [])].sort((a, b) =>
  (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3) || a.line.localeCompare(b.line, undefined, { numeric: true })))

// The QA lead's confirm or dismiss on each flag (#21), saved with the call
const decisions = ref<Record<string, FlagDecision>>({})
const notes = ref<Record<string, string>>({})
watch(call, (value) => {
  decisions.value = { ...value?.decisions }
  notes.value = Object.fromEntries(Object.entries(decisions.value).map(([key, decision]) => [key, decision.note]))
}, { immediate: true })

const savingFlag = ref<string | null>(null)
const decisionError = ref<string | null>(null)

const decisionOf = (flag: { rule: string, line: string }) => decisions.value[flagKey(flag.rule, flag.line)]

// One flag per transcript line: its most severe one that isn't dismissed, else its most severe,
// so a line with a high and a low flag never shows as low (#59)
const flagsByLine = computed(() => {
  const byLine = new Map<string, (typeof sortedFlags.value)[number]>()
  for (const flag of sortedFlags.value) {
    const shown = byLine.get(flag.line)
    if (!shown || (decisionOf(shown)?.status === 'dismissed' && decisionOf(flag)?.status !== 'dismissed')) byLine.set(flag.line, flag)
  }
  return byLine
})

async function decide(flag: { rule: string, line: string }, status: FlagDecision['status'] | null) {
  const key = flagKey(flag.rule, flag.line)
  savingFlag.value = key
  decisionError.value = null
  try {
    // Typed by hand: inferring it from the dynamic URL overflows TypeScript's stack
    decisions.value = await $fetch<Record<string, FlagDecision>>(`/api/calls/${id}/decisions` as string, {
      method: 'PUT',
      body: { rule: flag.rule, line: flag.line, status, note: notes.value[key] ?? '' },
    })
  }
  catch {
    decisionError.value = 'Couldn\'t save that, try again'
  }
  finally {
    savingFlag.value = null
  }
}

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

// Disabled until every section is in, on the server too, so hydration keeps it disabled
const reportLoaded = computed(() => !scorePending.value && !flagsPending.value && !coachingPending.value)

function printReport() {
  window.print()
}
</script>

<template>
  <main class="mx-auto max-w-7xl space-y-6 px-6 py-8 print:p-0">
    <!-- Print only: a one-page summary for the agent and team lead, no transcript (#19) -->
    <article v-if="!error" class="hidden space-y-6 text-sm text-black print:block">
      <header class="flex items-start justify-between gap-4 border-b-2 border-black pb-4">
        <div>
          <p class="flex items-center gap-1.5 font-semibold">
            <ShieldCheck class="size-4" aria-hidden="true" />
            Call Buddy · Call report
          </p>
          <h1 class="text-2xl font-bold">
            Call {{ header.call ?? id }}<template v-if="header.agent"> · {{ header.agent }}</template>
          </h1>
          <p v-if="header.caller || header.duration" class="text-neutral-600">
            <template v-if="header.caller">Caller {{ header.caller }}</template><template v-if="header.caller && header.duration"> · </template>{{ header.duration }}
          </p>
        </div>
        <ClientOnly>
          <p v-if="call?.createdAt" class="text-neutral-600">
            Reviewed {{ new Date(call.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) }}
          </p>
        </ClientOnly>
      </header>

      <div class="grid grid-cols-2 gap-4">
        <div class="rounded border border-neutral-400 p-3">
          <p class="text-xs font-semibold text-neutral-600 uppercase">Script score</p>
          <p class="text-2xl font-bold">
            <template v-if="score?.reviewed">{{ score.items.filter(item => item.pass).length }} / {{ score.items.length }} · {{ score.overall }}%</template>
            <template v-else>Not scored</template>
          </p>
        </div>
        <div class="rounded border border-neutral-400 p-3">
          <p class="text-xs font-semibold text-neutral-600 uppercase">Flags</p>
          <p class="text-2xl font-bold">{{ flagged?.reviewed ? flagged.flags.length : 'Not checked' }}</p>
        </div>
      </div>

      <section class="break-inside-avoid">
        <h2 class="mb-2 font-bold">Compliance flags</h2>
        <table v-if="flagged?.flags.length" class="w-full border-t border-neutral-300">
          <tbody>
            <tr v-for="flag in sortedFlags" :key="flag.line + flag.rule" class="border-b border-neutral-300 align-top">
              <td class="py-2 pr-3 font-bold uppercase">{{ flag.severity }}</td>
              <td class="py-2 pr-3 font-mono">{{ flag.line }}</td>
              <td class="py-2">
                {{ flag.rule.replaceAll('_', ' ') }}
                <span class="block text-neutral-600">“{{ maskCardNumbers(flag.quote) }}”</span>
                <span class="block font-semibold">
                  {{ decisionOf(flag)?.status === 'confirmed' ? 'Confirmed' : decisionOf(flag)?.status === 'dismissed' ? 'Dismissed' : 'Not reviewed' }} by QA lead<template v-if="decisionOf(flag)?.note">: {{ maskCardNumbers(decisionOf(flag)!.note) }}</template>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else>No compliance flags.</p>
      </section>

      <section v-if="score?.reviewed" class="break-inside-avoid">
        <h2 class="mb-2 font-bold">Script checklist</h2>
        <ul class="grid grid-cols-2 gap-x-6 gap-y-1">
          <li v-for="item in score.items" :key="item.id" :class="{ 'font-bold': !item.pass }">
            {{ item.pass ? 'PASS' : 'FAIL' }} · {{ item.label }}<span v-if="item.line" class="ml-1.5 font-mono text-neutral-600">{{ item.line }}</span>
          </li>
        </ul>
      </section>

      <section class="break-inside-avoid">
        <h2 class="mb-2 font-bold">Coaching notes</h2>
        <ol v-if="coaching?.reviewed" class="list-decimal space-y-1 pl-5">
          <li v-for="(note, index) in coaching.notes" :key="index">
            <span v-if="note.line" class="font-mono font-bold">{{ note.line }}: </span>{{ maskCardNumbers(note.text) }}
          </li>
        </ol>
        <p v-else>No coaching notes yet.</p>
      </section>

      <div class="grid break-inside-avoid grid-cols-2 gap-8 pt-12">
        <p class="border-t border-black pt-1">Agent signature</p>
        <p class="border-t border-black pt-1">Team lead signature</p>
      </div>

      <p class="text-xs text-neutral-600">Processed on our own Gemma server. No call data left our hardware.</p>
    </article>

    <NuxtLink to="/calls" class="text-muted-foreground hover:text-foreground text-sm print:hidden">← All calls</NuxtLink>
    <div class="flex flex-wrap items-start justify-between gap-4 print:hidden">
      <div>
        <h1 class="text-2xl font-semibold">
          Call report<span v-if="header.call" class="text-muted-foreground font-mono font-normal"> · {{ header.call }}</span>
        </h1>
        <p v-if="header.agent" class="text-muted-foreground text-sm">
          Agent {{ header.agent }}<template v-if="header.caller"> · Caller {{ header.caller }}</template><template v-if="header.duration"> · {{ header.duration }}</template>
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <p class="inline-flex items-center gap-2 rounded-full border border-emerald-600 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <span class="size-2 rounded-full bg-emerald-600" aria-hidden="true" />
          Processed on our own Gemma server, no call data left our hardware
        </p>
        <Button v-if="!error" variant="outline" :disabled="!reportLoaded" @click="printReport">
          <Printer aria-hidden="true" />
          Print / Save as PDF
        </Button>
      </div>
    </div>

    <p v-if="error" class="text-destructive print:hidden" role="alert">
      This saved call report couldn't be found.
      <NuxtLink to="/" class="underline">Review it again</NuxtLink>
    </p>

    <!-- Score and coaching share the left column, so the transcript keeps its width beside the sidebar at 1280px -->
    <div v-else class="grid items-start gap-6 lg:grid-cols-[18rem_1fr] print:hidden">
      <div class="space-y-6">
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

        <section class="space-y-3 rounded-lg border p-4" aria-labelledby="coaching-heading">
          <h2 id="coaching-heading" class="font-medium">Coaching</h2>
          <p v-if="coachingPending" class="text-muted-foreground animate-pulse text-sm">Drafting coaching notes…</p>
          <p v-else-if="!coaching?.reviewed" class="text-muted-foreground text-sm">No coaching notes yet.</p>
          <ol v-else class="space-y-3">
            <li v-for="(note, index) in coaching.notes" :key="index" class="text-sm">
              <p>{{ maskCardNumbers(note.text) }}</p>
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

      <section class="space-y-3 rounded-lg border p-4" aria-labelledby="transcript-heading">
        <div class="flex items-center justify-between gap-3">
          <h2 id="transcript-heading" class="font-medium">Transcript</h2>
          <p v-if="flagsPending" class="text-muted-foreground animate-pulse text-sm">Checking compliance…</p>
        </div>

        <ul v-if="flagged?.flags.length" class="space-y-2">
          <li
            v-for="flag in sortedFlags"
            :key="flagKey(flag.rule, flag.line)"
            :class="decisionOf(flag)?.status === 'dismissed' ? 'opacity-60' : ''"
            class="space-y-2 rounded-md border p-3 text-sm"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                :class="severityPill[flag.severity]"
                class="rounded-full px-3 py-1 text-xs font-medium"
                @click="scrollToLine(flag.line)"
              >
                {{ flag.severity }} · {{ flag.rule.replaceAll('_', ' ') }} · {{ flag.line }}
              </button>
              <span
                :class="{
                  'text-emerald-700 dark:text-emerald-300': decisionOf(flag)?.status === 'confirmed',
                  'text-muted-foreground line-through': decisionOf(flag)?.status === 'dismissed',
                  'text-amber-700 dark:text-amber-300': !decisionOf(flag),
                }"
                class="text-xs font-medium"
              >
                {{ decisionOf(flag)?.status === 'confirmed' ? 'Confirmed' : decisionOf(flag)?.status === 'dismissed' ? 'Dismissed' : 'Waiting for review' }}
              </span>
            </div>
            <p v-if="flag.quote" class="text-muted-foreground italic">“{{ flag.quote }}”</p>
            <div class="flex flex-wrap items-center gap-2">
              <input
                v-model="notes[flagKey(flag.rule, flag.line)]"
                type="text"
                maxlength="500"
                placeholder="Note (optional)"
                :aria-label="`Note on ${flag.rule.replaceAll('_', ' ')} at ${flag.line}`"
                class="border-input bg-background min-w-0 flex-1 rounded-md border px-2 py-1 text-sm"
              >
              <button
                type="button"
                :aria-pressed="decisionOf(flag)?.status === 'confirmed'"
                :disabled="savingFlag !== null"
                :class="decisionOf(flag)?.status === 'confirmed' ? 'bg-emerald-600 text-white border-emerald-600' : 'hover:bg-accent'"
                class="rounded-md border px-3 py-1 text-sm font-medium disabled:opacity-60"
                @click="decide(flag, 'confirmed')"
              >
                Confirm
              </button>
              <button
                type="button"
                :aria-pressed="decisionOf(flag)?.status === 'dismissed'"
                :disabled="savingFlag !== null"
                :class="decisionOf(flag)?.status === 'dismissed' ? 'bg-foreground text-background border-foreground' : 'hover:bg-accent'"
                class="rounded-md border px-3 py-1 text-sm font-medium disabled:opacity-60"
                @click="decide(flag, 'dismissed')"
              >
                Dismiss
              </button>
              <button
                v-if="decisionOf(flag)"
                type="button"
                :disabled="savingFlag !== null"
                class="text-muted-foreground px-1 text-xs hover:underline disabled:opacity-60"
                @click="decide(flag, null)"
              >
                Undo
              </button>
            </div>
          </li>
        </ul>
        <p v-else-if="!flagsPending && flagged?.reviewed" class="text-sm text-emerald-700 dark:text-emerald-300">No compliance flags.</p>
        <p v-if="decisionError" class="text-destructive text-sm" role="alert">{{ decisionError }}</p>

        <ol class="max-h-[75vh] space-y-1 overflow-y-auto pr-2">
          <li
            v-for="line in lines"
            :id="lineId(line.time)"
            :key="line.time + line.text"
            :class="!flagsByLine.get(line.time) ? 'border-transparent' : decisionOf(flagsByLine.get(line.time)!)?.status === 'dismissed' ? 'border-muted-foreground/40 border-dashed' : severityRow[flagsByLine.get(line.time)!.severity]"
            class="scroll-mt-4 rounded-r border-l-4 px-3 py-1.5 text-sm"
          >
            <span class="text-muted-foreground mr-2 font-mono text-xs">{{ line.time }}</span>
            <span class="mr-1 font-medium">{{ line.speaker === 'AGENT' ? header.agent ?? 'Agent' : 'Caller' }}:</span>
            {{ line.text }}
            <p v-if="flagsByLine.get(line.time)" class="mt-1 text-xs font-medium">
              ⚑ {{ flagsByLine.get(line.time)!.rule.replaceAll('_', ' ') }}<template v-if="decisionOf(flagsByLine.get(line.time)!)"> · {{ decisionOf(flagsByLine.get(line.time)!)!.status }}</template>
            </p>
          </li>
        </ol>
        <pre v-if="!lines.length" class="text-sm whitespace-pre-wrap">{{ call?.transcript }}</pre>
      </section>
    </div>
  </main>
</template>
