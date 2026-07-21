<script setup>
definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const auth = useAuthStore()
const locationsStore = useLocationsStore()
const { request } = useWorkerApi()
const saving = ref(false)
const passwordSaving = ref(false)
const deleting = ref(false)
const deleteOpen = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const profileOptionsLoading = ref(false)
const prayerGroupOptions = ref([])
const departmentOptions = ref([])

const workerProfile = computed(() => auth.worker?.worker || {})
const form = reactive({
  dob: '',
  date_of_birth: '',
  country: '',
  state: '',
  area: '',
  gender: '',
  phone_number: '',
  email: '',
  facebook_username: '',
  twitter_username: '',
  instagram_username: '',
  house_address: '',
  work_address: '',
  member_since: '',
  worker_since: '',
  prayer_group_id: '',
  department_id: '',
})
const passwordForm = reactive({
  current_password: '',
  password: '',
  password_confirmation: '',
})

const profileRows = computed(() => [
  { label: 'Name', value: auth.workerName },
  { label: 'Church', value: workerProfile.value.church_name || workerProfile.value.church?.name },
  { label: 'Fellowship', value: workerProfile.value.fellowship_name || workerProfile.value.fellowship?.name },
  { label: 'Cell', value: workerProfile.value.cell_name || workerProfile.value.cell?.name },
  { label: 'Status', value: displayValue(workerProfile.value.status) },
  { label: 'Worker ID', value: workerProfile.value.slug },
])
const countryOptions = computed(() => locationsStore.countryOptions)
const stateOptions = computed(() => locationsStore.stateOptions(form.country))
const stateDisabled = computed(() => !form.country || stateOptions.value.length === 0)
const areaOptions = computed(() => locationsStore.subdivisionOptions(form.country, form.state))
const areaDisabled = computed(() => !form.country || !form.state || areaOptions.value.length === 0)

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value).replace(/_/g, ' ')
}

function syncForm() {
  form.dob = toDateInput(workerProfile.value.dob)
  form.date_of_birth = toDateInput(workerProfile.value.date_of_birth)
  form.country = locationsStore.countryName(workerProfile.value.country)
  form.state = workerProfile.value.state || ''
  form.area = workerProfile.value.area || ''
  form.gender = workerProfile.value.gender || ''
  form.phone_number = workerProfile.value.phone_number || ''
  form.email = workerProfile.value.email || auth.worker?.email || ''
  form.facebook_username = workerProfile.value.facebook_username || ''
  form.twitter_username = workerProfile.value.twitter_username || ''
  form.instagram_username = workerProfile.value.instagram_username || ''
  form.house_address = workerProfile.value.house_address || ''
  form.work_address = workerProfile.value.work_address || ''
  form.member_since = toDateInput(workerProfile.value.member_since)
  form.worker_since = toDateInput(workerProfile.value.worker_since)
  form.prayer_group_id = workerProfile.value.prayer_group_id || ''
  form.department_id = workerProfile.value.department_id || ''
}

function toDateInput(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

async function saveProfile() {
  saving.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try {
    await auth.updateProfile({ ...form })
    syncForm()
    successMessage.value = 'Profile updated successfully.'
  } catch (error) {
    errorMessage.value = auth.error || error?.data?.message || 'Unable to update your profile.'
  } finally {
    saving.value = false
  }
}

async function fetchProfileOptions() {
  profileOptionsLoading.value = true

  try {
    const [prayerGroupsResponse, departmentsResponse] = await Promise.all([
      request('/profile/prayer-groups'),
      request('/profile/departments'),
    ])

    prayerGroupOptions.value = normalizeOptions(prayerGroupsResponse?.data)
    departmentOptions.value = normalizeOptions(departmentsResponse?.data)
  } catch (error) {
    errorMessage.value = error?.data?.message || 'Unable to load prayer meeting group and department options.'
  } finally {
    profileOptionsLoading.value = false
  }
}

function normalizeOptions(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    label: item.label || item.name || String(item.value || item.id),
    value: item.value || item.id,
  }))
}

function onCountryChange() {
  form.state = ''
  form.area = ''
}

function onStateChange() {
  form.area = ''
}

function resetPasswordForm() {
  passwordForm.current_password = ''
  passwordForm.password = ''
  passwordForm.password_confirmation = ''
}

async function savePassword() {
  passwordSaving.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try {
    const response = await auth.updatePassword({ ...passwordForm })
    resetPasswordForm()
    successMessage.value = response?.message || 'Password updated successfully.'
  } catch (error) {
    errorMessage.value = auth.error || error?.data?.message || 'Unable to update your password.'
  } finally {
    passwordSaving.value = false
  }
}

async function deleteAccount() {
  deleting.value = true
  errorMessage.value = ''

  try {
    await auth.deleteAccount()
  } catch (error) {
    errorMessage.value = error?.data?.message || 'Unable to delete your account.'
    deleting.value = false
  }
}

watch(() => auth.worker, syncForm, { immediate: true, deep: true })

onMounted(() => {
  locationsStore.fetchCountries().then(() => {
    form.country = locationsStore.countryName(form.country)
  })
  fetchProfileOptions()
})
</script>

<template>
  <section class="space-y-5">
    <div>
      <p class="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a83632]">
        Profile
      </p>
      <h1 class="m-0 text-3xl font-semibold tracking-tight text-gray-950 dark:text-white">
        My profile
      </h1>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
        View your worker profile and keep your contact email and phone number up to date.
      </p>
    </div>

    <UAlert
      v-if="successMessage"
      color="success"
      variant="soft"
      :title="successMessage"
    />
    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      :title="errorMessage"
    />

    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <UCard class="border border-gray-200 shadow-sm dark:border-gray-800">
        <template #header>
          <div>
            <h2 class="m-0 text-base font-semibold text-gray-950 dark:text-white">
              Profile information
            </h2>
            <p class="m-0 mt-1 text-sm text-gray-500 dark:text-gray-400">
              Update your editable worker profile details. Scope, names, status, and account state are managed by admins.
            </p>
          </div>
        </template>

        <form class="space-y-5" @submit.prevent="saveProfile">
          <div class="grid gap-4 md:grid-cols-2">
            <UFormField label="Phone number" name="phone_number" required>
              <UInput
                v-model="form.phone_number"
                placeholder="Phone number"
                size="xl"
                class="w-full"
                required
              />
            </UFormField>

            <UFormField label="Email address" name="email" required>
              <UInput
                v-model="form.email"
                type="email"
                autocomplete="email"
                placeholder="Email address"
                size="xl"
                class="w-full"
                required
              />
            </UFormField>

            <UFormField label="Gender" name="gender">
              <USelect
                v-model="form.gender"
                :items="[
                  { label: 'Male', value: 'male' },
                  { label: 'Female', value: 'female' },
                ]"
                placeholder="Gender"
                size="xl"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Date of birth" name="date_of_birth">
              <UInput v-model="form.date_of_birth" type="date" size="xl" class="w-full" />
            </UFormField>

            <UFormField label="DOB" name="dob">
              <UInput v-model="form.dob" type="date" size="xl" class="w-full" />
            </UFormField>

            <UFormField label="Country" name="country">
              <USelect
                v-model="form.country"
                :items="countryOptions"
                placeholder="Select country"
                size="xl"
                class="w-full"
                @update:model-value="onCountryChange"
              />
            </UFormField>

            <UFormField label="State" name="state">
              <USelect
                v-model="form.state"
                :items="stateOptions"
                placeholder="Select state"
                size="xl"
                class="w-full"
                :disabled="stateDisabled"
                @update:model-value="onStateChange"
              />
            </UFormField>

            <UFormField label="Area" name="area">
              <USelect
                v-model="form.area"
                :items="areaOptions"
                placeholder="Select area"
                size="xl"
                class="w-full"
                :disabled="areaDisabled"
              />
            </UFormField>

            <UFormField label="Member since" name="member_since">
              <UInput v-model="form.member_since" type="date" size="xl" class="w-full" />
            </UFormField>

            <UFormField label="Worker since" name="worker_since">
              <UInput v-model="form.worker_since" type="date" size="xl" class="w-full" />
            </UFormField>

            <UFormField label="Prayer meeting group" name="prayer_group_id">
              <USelect
                v-model="form.prayer_group_id"
                :items="prayerGroupOptions"
                :loading="profileOptionsLoading"
                placeholder="Select prayer meeting group"
                size="xl"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Department" name="department_id">
              <USelect
                v-model="form.department_id"
                :items="departmentOptions"
                :loading="profileOptionsLoading"
                placeholder="Select department"
                size="xl"
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="grid gap-4 md:grid-cols-3">
            <UFormField label="Facebook username" name="facebook_username">
              <UInput v-model="form.facebook_username" placeholder="Facebook" size="xl" class="w-full" />
            </UFormField>

            <UFormField label="Twitter username" name="twitter_username">
              <UInput v-model="form.twitter_username" placeholder="Twitter" size="xl" class="w-full" />
            </UFormField>

            <UFormField label="Instagram username" name="instagram_username">
              <UInput v-model="form.instagram_username" placeholder="Instagram" size="xl" class="w-full" />
            </UFormField>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <UFormField label="House address" name="house_address">
              <UTextarea v-model="form.house_address" :rows="4" placeholder="House address" class="w-full" />
            </UFormField>

            <UFormField label="Work address" name="work_address">
              <UTextarea v-model="form.work_address" :rows="4" placeholder="Work address" class="w-full" />
            </UFormField>
          </div>

          <div class="flex flex-col gap-3 border-t border-gray-100 pt-5 dark:border-gray-800 sm:flex-row sm:justify-end">
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              :disabled="saving"
              @click="syncForm"
            >
              Reset
            </UButton>
            <UButton
              type="submit"
              :loading="saving"
              class="bg-[#a83632] text-white hover:bg-[#922f2c]"
            >
              Save changes
            </UButton>
          </div>
        </form>
      </UCard>

      <div class="space-y-5">
        <UCard class="border border-gray-200 shadow-sm dark:border-gray-800">
          <div class="flex items-center gap-3">
            <span class="grid h-14 w-14 place-items-center rounded-2xl bg-[#a83632] text-base font-semibold text-white">
              {{ auth.workerInitials }}
            </span>
            <div class="min-w-0">
              <p class="m-0 truncate text-base font-semibold text-gray-950 dark:text-white">
                {{ auth.workerName }}
              </p>
              <p class="m-0 mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
                {{ auth.worker?.email }}
              </p>
            </div>
          </div>

          <dl class="mt-5 space-y-3">
            <div
              v-for="row in profileRows"
              :key="row.label"
              class="flex items-start justify-between gap-4 text-sm"
            >
              <dt class="shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {{ row.label }}
              </dt>
              <dd class="m-0 max-w-44 text-right capitalize text-gray-900 dark:text-gray-100">
                {{ row.value || '-' }}
              </dd>
            </div>
          </dl>
        </UCard>

        <UCard class="border border-gray-200 shadow-sm dark:border-gray-800">
          <template #header>
            <div>
              <h2 class="m-0 text-base font-semibold text-gray-950 dark:text-white">
                Password
              </h2>
              <p class="m-0 mt-1 text-sm text-gray-500 dark:text-gray-400">
                Change your sign-in password.
              </p>
            </div>
          </template>

          <form class="space-y-4" @submit.prevent="savePassword">
            <UFormField label="Current password" name="current_password" required>
              <UInput
                v-model="passwordForm.current_password"
                type="password"
                autocomplete="current-password"
                placeholder="Current password"
                class="w-full"
                required
              />
            </UFormField>

            <UFormField label="New password" name="password" required>
              <UInput
                v-model="passwordForm.password"
                type="password"
                autocomplete="new-password"
                placeholder="New password"
                class="w-full"
                required
              />
            </UFormField>

            <UFormField label="Confirm new password" name="password_confirmation" required>
              <UInput
                v-model="passwordForm.password_confirmation"
                type="password"
                autocomplete="new-password"
                placeholder="Confirm new password"
                class="w-full"
                required
              />
            </UFormField>

            <div class="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              <UButton
                type="button"
                color="neutral"
                variant="outline"
                :disabled="passwordSaving"
                @click="resetPasswordForm"
              >
                Reset
              </UButton>
              <UButton
                type="submit"
                :loading="passwordSaving"
                class="bg-[#a83632] text-white hover:bg-[#922f2c]"
              >
                Update password
              </UButton>
            </div>
          </form>
        </UCard>

        <UCard class="border border-red-200 bg-red-50 shadow-sm dark:border-red-900/60 dark:bg-red-950/30">
          <h2 class="m-0 text-base font-semibold text-red-900 dark:text-red-100">
            Delete account
          </h2>
          <p class="m-0 mt-2 text-sm leading-6 text-red-700 dark:text-red-200">
            Deleting your account removes your ability to sign in. Your worker record and reporting history remain in the system.
          </p>
          <UButton
            color="error"
            variant="solid"
            class="mt-4"
            @click="deleteOpen = true"
          >
            Delete my account
          </UButton>
        </UCard>
      </div>
    </div>

    <UModal v-model:open="deleteOpen">
      <template #content>
        <div class="space-y-4 p-5">
          <div>
            <h2 class="m-0 text-lg font-semibold text-gray-950 dark:text-white">
              Delete your account?
            </h2>
            <p class="m-0 mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              This action signs you out and disables this worker portal account. Your worker profile record is not deleted.
            </p>
          </div>

          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              :disabled="deleting"
              @click="deleteOpen = false"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="deleting"
              @click="deleteAccount"
            >
              Delete account
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </section>
</template>
