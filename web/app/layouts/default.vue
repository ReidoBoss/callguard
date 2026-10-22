<script setup lang="ts">
import { Lock, ShieldCheck } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const nav = [
  { label: 'Review a call', to: '/' },
  { label: 'Calls', to: '/calls' },
  { label: 'Agents', to: '/agents' },
  { label: 'Settings', to: '/settings' },
  { label: 'Privacy', to: '/privacy' },
]

// Pages that don't exist yet stay hidden, so the demo never shows a 404
const router = useRouter()
const route = useRoute()
const links = nav.filter(item => router.resolve(item.to).matched.length > 0)

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<template>
  <div class="flex min-h-screen">
    <!-- `dark` gives the sidebar the dark theme tokens whatever the page uses -->
    <aside class="dark bg-sidebar text-sidebar-foreground sticky top-0 flex h-screen w-72 shrink-0 flex-col gap-6 p-4 print:hidden">
      <header class="space-y-3 px-2 pt-2">
        <NuxtLink to="/" class="flex items-center gap-2 text-xl font-semibold">
          <ShieldCheck class="size-6 text-blue-400" aria-hidden="true" />
          CallGuard
        </NuxtLink>
        <Badge variant="outline" class="h-auto gap-1.5 py-1 text-sm whitespace-normal">
          <Lock aria-hidden="true" />
          Runs on self-hosted Gemma
        </Badge>
      </header>

      <nav aria-label="Main">
        <ul class="space-y-1">
          <li v-for="item in links" :key="item.to">
            <Button
              as-child
              :variant="isActive(item.to) ? 'secondary' : 'ghost'"
              class="h-10 w-full justify-start px-3 text-base"
            >
              <NuxtLink :to="item.to" :aria-current="isActive(item.to) ? 'page' : undefined">
                {{ item.label }}
              </NuxtLink>
            </Button>
          </li>
        </ul>
      </nav>

      <p class="text-muted-foreground mt-auto px-2 text-sm">
        Gemma 4 on ALMA's network. No call data leaves it.
      </p>
    </aside>

    <div class="min-w-0 flex-1">
      <slot />
    </div>
  </div>
</template>
