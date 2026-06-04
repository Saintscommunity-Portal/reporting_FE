<script setup>
definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})

const auth = useAuthStore()
const form = reactive({
  email: '',
  password: '',
})

async function handleSubmit() {
  await auth.login({
    email: form.email,
    password: form.password,
  })

  await navigateTo('/dashboard')
}
</script>

<template>
  <section class="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md flex-col justify-center">
    <div class="mb-8">
      <div class="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-[#a83632] text-sm font-bold text-white">
        SCC
      </div>
      <p class="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a83632]">
        Worker login
      </p>
      <h1 class="m-0 text-3xl font-semibold tracking-tight text-gray-950">
        Welcome back
      </h1>
      <p class="mt-3 text-sm leading-6 text-gray-500">
        Sign in to manage your reporting workspace and member records.
      </p>
    </div>

    <UCard class="border border-gray-200 shadow-sm">
      <form class="space-y-5" @submit.prevent="handleSubmit">
        <UAlert
          v-if="auth.error"
          color="error"
          variant="soft"
          :title="auth.error"
        />

        <UFormField label="Email address" name="email">
          <UInput
            v-model="form.email"
            type="email"
            autocomplete="email"
            inputmode="email"
            placeholder="worker@example.com"
            size="xl"
            class="w-full"
            required
          />
        </UFormField>

        <UFormField label="Password" name="password">
          <UInput
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            placeholder="Enter your password"
            size="xl"
            class="w-full"
            required
          />
        </UFormField>

        <UButton
          type="submit"
          block
          size="xl"
          :loading="auth.loading"
          class="bg-[#a83632] hover:bg-[#922f2c]"
        >
          Sign in
        </UButton>
      </form>
    </UCard>
  </section>
</template>
