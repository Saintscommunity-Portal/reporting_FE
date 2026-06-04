<script setup>
definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const auth = useAuthStore()
</script>

<template>
  <section class="space-y-5">
    <div>
      <p class="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a83632]">
        Dashboard
      </p>
      <h1 class="m-0 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
        Hello, {{ auth.workerName }}
      </h1>
      <p class="mt-2 text-sm leading-6 text-gray-500">
        Your worker reporting workspace is ready.
      </p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UCard class="border border-gray-200 shadow-sm">
        <p class="m-0 text-sm text-gray-500">Members</p>
        <p class="mb-0 mt-2 text-2xl font-semibold text-gray-950">Soon</p>
      </UCard>

      <UCard class="border border-gray-200 shadow-sm">
        <p class="m-0 text-sm text-gray-500">Reports</p>
        <p class="mb-0 mt-2 text-2xl font-semibold text-gray-950">Soon</p>
      </UCard>

      <UCard class="border border-gray-200 shadow-sm">
        <p class="m-0 text-sm text-gray-500">Status</p>
        <UBadge color="success" variant="soft" class="mt-3">Signed in</UBadge>
      </UCard>
    </div>
  </section>
</template>
