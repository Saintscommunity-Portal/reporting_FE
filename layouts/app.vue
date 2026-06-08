<script setup>
const auth = useAuthStore()
const mobileMenuOpen = ref(false)
const { isDark, toggleTheme, initTheme } = useThemeMode()

const navItems = [
  {
    label: 'Home',
    to: '/dashboard',
    icon: 'i-heroicons-home-20-solid',
  },
  {
    label: 'Members',
    to: '/members',
    icon: 'i-heroicons-user-group-20-solid',
  },
  {
    label: 'Prayer group',
    to: '/prayer-group',
    icon: 'i-heroicons-chart-pie-20-solid',
  },
  {
    label: 'Study group',
    to: '/study-group',
    icon: 'i-heroicons-book-open-20-solid',
  },
  {
    label: 'Meetings',
    to: '/church-meetings',
    icon: 'i-heroicons-calendar-days-20-solid',
  },
  {
    label: 'Outreach',
    to: '/outreaches',
    icon: 'i-heroicons-megaphone-20-solid',
  },
  {
    label: 'Follow ups',
    to: '/followups',
    icon: 'i-heroicons-chat-bubble-left-right-20-solid',
  },
  {
    label: 'Settings',
    to: '/settings',
    icon: 'i-heroicons-cog-6-tooth-20-solid',
  },
]

const workerProfile = computed(() => auth.worker?.worker || {})
const profileRows = computed(() => [
  { label: 'Name', value: auth.workerName },
  { label: 'Church', value: workerProfile.value.church_name || workerProfile.value.church?.name },
  { label: 'Fellowship', value: workerProfile.value.fellowship_name || workerProfile.value.fellowship?.name },
  { label: 'Cell', value: workerProfile.value.cell_name || workerProfile.value.cell?.name },
  { label: 'Status', value: displayProfileValue(workerProfile.value.status) },
  { label: 'Worker ID', value: workerProfile.value.slug },
])

function displayProfileValue(value) {
  if (value === null || value === undefined || value === '') return '-'

  return String(value).replace(/_/g, ' ')
}

onMounted(() => {
  initTheme()
})
</script>

<template>
  <div class="min-h-dvh bg-gray-50 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
    <aside class="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-gray-200 bg-white transition-colors dark:border-gray-800 dark:bg-gray-950 lg:block">
      <div class="flex h-16 items-center gap-3 border-b border-gray-100 px-5 dark:border-gray-800">
        <div class="grid h-10 w-10 place-items-center rounded-xl bg-[#a83632] text-sm font-bold text-white">
          SCC
        </div>
        <div>
          <p class="m-0 text-sm font-semibold text-gray-950 dark:text-white">SCC Reporting</p>
          <p class="m-0 text-xs text-gray-500 dark:text-gray-400">Worker portal</p>
        </div>
      </div>

      <nav class="space-y-1 p-3">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 no-underline hover:bg-gray-50 hover:text-gray-950 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-white"
          active-class="!bg-[#a83632]/10 !text-[#a83632] dark:!bg-[#a83632]/20 dark:!text-[#f2b3af]"
        >
          <UIcon :name="item.icon" class="h-5 w-5" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>
    </aside>

    <div class="lg:pl-72">
      <header class="sticky top-0 z-20 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur transition-colors dark:border-gray-800 dark:bg-gray-950/95 sm:px-6 lg:px-8">
        <div class="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-bars-3-20-solid"
              class="lg:hidden"
              aria-label="Open navigation menu"
              @click="mobileMenuOpen = true"
            />
            <div>
              <p class="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-[#a83632]">Reporting</p>
              <p class="m-0 text-sm text-gray-500 dark:text-gray-400">Worker workspace</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            :icon="isDark ? 'i-heroicons-sun-20-solid' : 'i-heroicons-moon-20-solid'"
            class="rounded-full"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to night mode'"
            :title="isDark ? 'Switch to light mode' : 'Switch to night mode'"
            @click="toggleTheme"
          />

          <UPopover>
            <UButton
              color="neutral"
              variant="ghost"
              class="rounded-full"
              aria-label="Open profile menu"
            >
              <span class="grid h-9 w-9 place-items-center rounded-full bg-[#a83632] text-sm font-semibold text-white">
                {{ auth.workerInitials }}
              </span>
            </UButton>
            <template #content>
              <div class="w-72 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-gray-900">
                <div class="flex items-center gap-3">
                  <span class="grid h-11 w-11 place-items-center rounded-full bg-[#a83632] text-sm font-semibold text-white">
                    {{ auth.workerInitials }}
                  </span>
                  <div class="min-w-0">
                    <p class="m-0 truncate text-sm font-semibold text-gray-950 dark:text-white">{{ auth.workerName }}</p>
                    <p class="m-0 mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{{ auth.worker?.email }}</p>
                  </div>
                </div>

                <dl class="mt-4 space-y-2">
                  <div
                    v-for="row in profileRows"
                    :key="row.label"
                    class="flex items-start justify-between gap-3 text-sm"
                  >
                    <dt class="shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ row.label }}</dt>
                    <dd class="m-0 max-w-40 text-right capitalize text-gray-900 dark:text-gray-100">{{ row.value || '-' }}</dd>
                  </div>
                </dl>

                <UButton
                  color="neutral"
                  variant="outline"
                  icon="i-heroicons-arrow-right-on-rectangle-20-solid"
                  class="mt-4 w-full justify-center border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                  @click="auth.logout()"
                >
                  Sign out
                </UButton>
              </div>
            </template>
          </UPopover>
          </div>
        </div>
      </header>

      <main class="mx-auto max-w-6xl px-4 pb-24 pt-5 sm:px-6 lg:px-8">
        <slot />
      </main>
    </div>

    <div
      v-if="mobileMenuOpen"
      class="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        class="absolute inset-0 h-full w-full bg-gray-950/50"
        aria-label="Close navigation menu"
        @click="mobileMenuOpen = false"
      />

      <aside class="relative flex min-h-dvh w-80 max-w-[86vw] flex-col border-r border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950">
        <div class="flex h-16 items-center justify-between border-b border-gray-100 px-4 dark:border-gray-800">
          <div class="flex items-center gap-3">
            <div class="grid h-10 w-10 place-items-center rounded-xl bg-[#a83632] text-sm font-bold text-white">
              SCC
            </div>
            <div>
              <p class="m-0 text-sm font-semibold text-gray-950 dark:text-white">SCC Reporting</p>
              <p class="m-0 text-xs text-gray-500 dark:text-gray-400">Worker portal</p>
            </div>
          </div>

          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark-20-solid"
            aria-label="Close navigation menu"
            @click="mobileMenuOpen = false"
          />
        </div>

        <nav class="flex-1 space-y-1 p-3">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-600 no-underline hover:bg-gray-50 hover:text-gray-950 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-white"
            active-class="!bg-[#a83632]/10 !text-[#a83632] dark:!bg-[#a83632]/20 dark:!text-[#f2b3af]"
            @click="mobileMenuOpen = false"
          >
            <UIcon :name="item.icon" class="h-5 w-5" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </nav>
      </aside>
    </div>

    <nav class="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-sm dark:border-gray-800 dark:bg-gray-950 lg:hidden">
      <div class="mx-auto grid max-w-lg grid-cols-8 gap-1">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium text-gray-500 no-underline dark:text-gray-400"
          active-class="!bg-[#a83632]/10 !text-[#a83632] dark:!bg-[#a83632]/20 dark:!text-[#f2b3af]"
        >
          <UIcon :name="item.icon" class="h-5 w-5" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>
