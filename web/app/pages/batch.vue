<script setup lang="ts">
// Every request here goes to our own /api routes, never off the machine (CLAUDE.md)
type Status = 'waiting' | 'reviewing' | 'done' | 'failed'

interface QueueItem {
  key: number
  name: string
  status: Status
  // Read lazily, so a big batch isn't all held in memory before it starts
  load: () => Promise<string>
  callId?: string
  error?: string
}

const queue = ref<QueueItem[]>([])
const running = ref(false)
const dragging = ref(false)
let nextKey = 0

function add(name: string, load: () => Promise<string>, error?: string) {
  queue.value.push({ key: nextKey++, name, status: error ? 'failed' : 'waiting', load, error })
}

function addFiles(files: FileList | null | undefined) {
  for (const file of Array.from(files ?? [])) {
    // Audio needs #9's transcription, so it's listed but not reviewed yet
    const isText = file.type === 'text/plain' || /\.txt$/i.test(file.name)
    add(file.name, () => file.text(), isText ? undefined : 'Audio needs #9: upload its transcript instead')
  }
  void run()
}

function onPick(event: Event) {
  const input = event.target as HTMLInputElement
  addFiles(input.files)
  input.value = ''
}

function onDrop(event: DragEvent) {
  dragging.value = false
  addFiles(event.dataTransfer?.files)
}

const loadingDemo = ref(false)
const demoError = ref<string | null>(null)

async function loadDemoCalls() {
  loadingDemo.value = true
  demoError.value = null
  try {
    const samples = await $fetch('/api/samples')
    for (const sample of samples) {
      add(`${sample.id}.txt`, async () => (await $fetch(`/api/samples/${sample.id}`)).transcript)
    }
    void run()
  }
  catch {
    demoError.value = 'Couldn\'t load the demo calls'
  }
  finally {
    loadingDemo.value = false
  }
}

// One call at a time: each review waits for the previous one to finish
async function run() {
  if (running.value) return
  running.value = true
  try {
    let item: QueueItem | undefined
    while ((item = queue.value.find(i => i.status === 'waiting'))) {
      item.status = 'reviewing'
      try {
        const transcript = await item.load()
        const { id } = await $fetch('/api/calls', { method: 'POST', body: { transcript } })
        item.callId = id
        item.status = 'done'
      }
      catch (e) {
        item.error = (e as { statusMessage?: string }).statusMessage ?? 'Review failed'
        item.status = 'failed'
      }
    }
  }
  finally {
    running.value = false
  }
}

const counts = computed(() => ({
  done: queue.value.filter(i => i.status === 'done').length,
  failed: queue.value.filter(i => i.status === 'failed').length,
  total: queue.value.length,
}))

const statusClass: Record<Status, string> = {
  waiting: 'bg-muted text-muted-foreground',
  reviewing: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  done: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
}
</script>

<template>
  <main class="mx-auto max-w-4xl space-y-6 px-6 py-10">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">Batch review</h1>
        <p class="text-muted-foreground mt-1 text-sm">
          Review every call, not a sample. Calls are reviewed one at a time on our own Gemma server.
        </p>
      </div>
      <button
        type="button"
        class="border-input hover:bg-accent rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"
        :disabled="loadingDemo"
        @click="loadDemoCalls"
      >
        {{ loadingDemo ? 'Loading…' : 'Load all demo calls' }}
      </button>
    </header>

    <p v-if="demoError" class="text-destructive text-sm" role="alert">{{ demoError }}</p>

    <label
      class="border-input hover:bg-accent/40 flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-12 text-center"
      :class="{ 'border-primary bg-accent/40': dragging }"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
    >
      <span class="font-medium">Drop transcript files here, or click to pick them</span>
      <span class="text-muted-foreground text-sm">Plain-text transcripts (.txt). Audio is coming with #9.</span>
      <input type="file" multiple accept=".txt,text/plain,audio/*" class="sr-only" @change="onPick">
    </label>

    <section v-if="queue.length" class="border-border bg-card overflow-hidden rounded-lg border" aria-label="Review queue">
      <header class="text-muted-foreground flex justify-between border-b px-5 py-3 text-sm" aria-live="polite">
        <span>Queue</span>
        <span>{{ counts.done }} of {{ counts.total }} done<template v-if="counts.failed">, {{ counts.failed }} failed</template></span>
      </header>
      <ul>
        <li v-for="item in queue" :key="item.key" class="flex items-center gap-4 border-b px-5 py-3 text-sm last:border-b-0">
          <span class="min-w-0 flex-1">
            <span class="block truncate font-mono">{{ item.name }}</span>
            <span v-if="item.error" class="text-destructive block text-xs">{{ item.error }}</span>
          </span>
          <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize" :class="statusClass[item.status]">
            <span v-if="item.status === 'reviewing'" class="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
            {{ item.status }}
          </span>
          <NuxtLink v-if="item.callId" :to="`/calls/${item.callId}`" class="text-primary w-24 text-right font-medium underline-offset-4 hover:underline">
            View report
          </NuxtLink>
          <span v-else class="w-24" />
        </li>
      </ul>
    </section>
  </main>
</template>
