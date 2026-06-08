<script setup>
definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})

const auth = useAuthStore()
const form = reactive({
  email: '',
})
const sent = ref(false)
const message = ref('')

async function handleSubmit() {
  message.value = ''
  sent.value = false

  const response = await auth.forgotPassword({
    email: form.email,
  })

  message.value = response?.message || 'If that worker account exists, a password reset link has been sent.'
  sent.value = true
}
</script>

<template>
  <section class="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md flex-col justify-center">
    <div class="mb-8">
      <div class="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-[#a83632] text-sm font-bold text-white">
        SCC
      </div>
      <p class="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a83632]">
        Password reset
      </p>
      <h1 class="m-0 text-3xl font-semibold tracking-tight text-gray-950">
        Recover your account
      </h1>
      <p class="mt-3 text-sm leading-6 text-gray-500">
        Enter the email address for your worker account and we will send a secure reset link.
      </p>
    </div>

    <UCard class="border border-gray-200 bg-white shadow-sm">
      <form class="space-y-5" @submit.prevent="handleSubmit">
        <UAlert
          v-if="auth.error"
          color="error"
          variant="soft"
          :title="auth.error"
        />

        <UAlert
          v-if="sent"
          color="success"
          variant="soft"
          :title="message"
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

        <UButton
          type="submit"
          block
          size="xl"
          :loading="auth.loading"
          class="bg-[#a83632] text-white hover:bg-[#922f2c]"
        >
          Send reset link
        </UButton>

        <div class="text-center">
          <NuxtLink
            to="/login"
            class="text-sm font-semibold text-[#a83632] no-underline hover:text-[#922f2c]"
          >
            Back to sign in
          </NuxtLink>
        </div>
      </form>
    </UCard>
  </section>
</template>
