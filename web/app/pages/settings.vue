<script setup lang="ts">
import { Plus, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { ChecklistItem, ComplianceRule, ReviewSettings } from '#shared/settings'

// `key` only orders the rows here; a new row's id is made by the server from its text
type Item = ChecklistItem & { key: number }
type Rule = ComplianceRule & { key: number }

const { data: saved, error: loadError } = await useFetch<ReviewSettings>('/api/settings')

const checklist = ref<Item[]>([])
const rules = ref<Rule[]>([])
let nextKey = 0

function edit(settings: ReviewSettings) {
  checklist.value = settings.checklist.map(item => ({ ...item, key: nextKey++ }))
  rules.value = settings.rules.map(rule => ({ ...rule, key: nextKey++ }))
}
watch(saved, value => value && edit(value), { immediate: true })

const busy = ref(false)
const message = ref<string | null>(null)
const failed = ref(false)

async function send(request: () => Promise<ReviewSettings>, done: string) {
  busy.value = true
  message.value = null
  failed.value = false
  try {
    edit(await request())
    message.value = done
  }
  catch (error) {
    failed.value = true
    message.value = (error as { statusMessage?: string }).statusMessage || 'Couldn\'t save that, try again'
  }
  finally {
    busy.value = false
  }
}

const strip = <T extends { key: number }>(rows: T[]) => rows.map(({ key: _key, ...row }) => row)

// Typed by hand: inferring it from the route overflows TypeScript's stack
const save = () => send(() => $fetch<ReviewSettings>('/api/settings' as string, {
  method: 'PUT',
  body: { checklist: strip(checklist.value), rules: strip(rules.value) },
}), 'Saved. The next review uses these lists.')

const reset = () => send(() => $fetch<ReviewSettings>('/api/settings' as string, { method: 'DELETE' }), 'Reset to the demo\'s lists.')

const input = 'border-input bg-background focus-visible:ring-ring min-h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none'
</script>

<template>
  <main class="mx-auto max-w-5xl space-y-6 px-6 py-8">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">Settings</h1>
        <p class="text-muted-foreground mt-1 text-sm">
          Your client's script and compliance rules. The next review uses them.
        </p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" :disabled="busy" @click="reset">Reset to defaults</Button>
        <Button :disabled="busy || !saved" @click="save">Save</Button>
      </div>
    </header>

    <p v-if="loadError" class="rounded-lg border border-red-300 p-4 text-sm text-red-700" role="alert">
      Couldn't load the settings.
    </p>
    <p
      v-if="message"
      :class="failed ? 'text-red-700' : 'text-muted-foreground'"
      class="text-sm"
      :role="failed ? 'alert' : 'status'"
    >
      {{ message }}
    </p>

    <section class="space-y-3 rounded-lg border p-4" aria-labelledby="checklist-heading">
      <div class="flex items-baseline justify-between">
        <h2 id="checklist-heading" class="font-medium">Script checklist</h2>
        <span class="text-muted-foreground text-sm">{{ checklist.length }} items</span>
      </div>
      <div class="text-muted-foreground grid grid-cols-[12rem_minmax(0,1fr)_2.5rem] gap-3 text-xs font-medium uppercase">
        <span>Item</span><span>Passes when</span>
      </div>
      <ul class="space-y-2">
        <li v-for="item in checklist" :key="item.key" class="grid grid-cols-[12rem_minmax(0,1fr)_2.5rem] items-start gap-3">
          <input v-model="item.label" aria-label="Item name" :class="input" class="font-medium">
          <textarea v-model="item.passes" aria-label="Passes when" rows="1" :class="input" class="field-sizing-content resize-none py-2" />
          <Button variant="ghost" size="icon" :aria-label="`Remove ${item.label || 'item'}`" @click="checklist.splice(checklist.indexOf(item), 1)">
            <X aria-hidden="true" />
          </Button>
        </li>
      </ul>
      <Button variant="outline" @click="checklist.push({ id: '', label: '', passes: '', key: nextKey++ })">
        <Plus aria-hidden="true" /> Add checklist item
      </Button>
    </section>

    <section class="space-y-3 rounded-lg border p-4" aria-labelledby="rules-heading">
      <div class="flex items-baseline justify-between">
        <h2 id="rules-heading" class="font-medium">Compliance rules</h2>
        <span class="text-muted-foreground text-sm">{{ rules.length }} rules</span>
      </div>
      <div class="text-muted-foreground grid grid-cols-[minmax(0,1fr)_8rem_2.5rem] gap-3 text-xs font-medium uppercase">
        <span>Flag when</span><span>Severity</span>
      </div>
      <ul class="space-y-2">
        <li v-for="rule in rules" :key="rule.key" class="grid grid-cols-[minmax(0,1fr)_8rem_2.5rem] items-start gap-3">
          <textarea v-model="rule.broken" aria-label="Flag when" rows="1" :class="input" class="field-sizing-content resize-none py-2" />
          <select v-model="rule.severity" aria-label="Severity" :class="input" class="capitalize">
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <Button variant="ghost" size="icon" :aria-label="`Remove ${rule.id ? rule.id.replaceAll('_', ' ') : 'rule'}`" @click="rules.splice(rules.indexOf(rule), 1)">
            <X aria-hidden="true" />
          </Button>
        </li>
      </ul>
      <Button variant="outline" @click="rules.push({ id: '', severity: 'medium', broken: '', key: nextKey++ })">
        <Plus aria-hidden="true" /> Add rule
      </Button>
    </section>
  </main>
</template>
