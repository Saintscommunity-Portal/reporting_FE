<script setup>
definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})

const route = useRoute()
const auth = useAuthStore()
const success = ref(false)
const message = ref('')
const form = reactive({
  email: '',
  token: '',
  password: '',
  password_confirmation: '',
})

onMounted(() => {
  form.email = String(route.query.email || '')
  form.token = String(route.query.token || '')
})

async function handleSubmit() {
  success.value = false
  message.value = ''

  const response = await auth.resetPassword({
    email: form.email,
    token: form.token,
    password: form.password,
    password_confirmation: form.password_confirmation,
  })

  message.value = response?.message || 'Password reset successfully. You can now sign in.'
  success.value = true
}
</script>

<template>
  <section class="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md flex-col justify-center">
    <div class="mb-8">
      <div class="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-[#a83632] text-sm font-bold text-white">
        SCC
      </div>
      <p class="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a83632]">
        New password
      </p>
      <h1 class="m-0 text-3xl font-semibold tracking-tight text-gray-950">
        Reset your password
      </h1>
      <p class="mt-3 text-sm leading-6 text-gray-500">
        Create a new password for your worker reporting account.
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
          v-if="success"
          color="success"
          variant="soft"
          :title="message"
        />

        <UAlert
          v-if="!form.token"
          color="warning"
          variant="soft"
          title="Reset token is missing. Please request a new password reset link."
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

        <UFormField label="New password" name="password">
          <UInput
            v-model="form.password"
            type="password"
            autocomplete="new-password"
            placeholder="Enter a new password"
            size="xl"
            class="w-full"
            required
          />
        </UFormField>

        <UFormField label="Confirm password" name="password_confirmation">
          <UInput
            v-model="form.password_confirmation"
            type="password"
            autocomplete="new-password"
            placeholder="Confirm your new password"
            size="xl"
            class="w-full"
            required
          />
        </UFormField>

        <UButton
          type="submit"
          block
          size="xl"
          :disabled="!form.token"
          :loading="auth.loading"
          class="bg-[#a83632] text-white hover:bg-[#922f2c] disabled:bg-gray-200 disabled:text-gray-500"
        >
          Reset password
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
