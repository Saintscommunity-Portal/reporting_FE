<script setup>
definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const membersStore = useMembersStore()
const locationsStore = useLocationsStore()

const filters = reactive({
  search: '',
  country: '',
  state: '',
  area: '',
})

const page = ref(1)
const perPage = ref(10)
const sortBy = ref('created_at')
const direction = ref('desc')
const formOpen = ref(false)
const detailsOpen = ref(false)
const editingMember = ref(null)
const formError = ref('')

const form = reactive({
  full_name: '',
  gender: '',
  date_of_birth: '',
  is_child: false,
  country: '',
  state: '',
  area: '',
  phone_1: '',
  phone_2: '',
  email: '',
  home_address: '',
  work_address: '',
  school_address: '',
  date_added: '',
  notes: '',
})

const sortOptions = [
  { label: 'Newest', value: 'created_at:desc' },
  { label: 'Oldest', value: 'created_at:asc' },
  { label: 'Name A-Z', value: 'full_name:asc' },
  { label: 'Name Z-A', value: 'full_name:desc' },
  { label: 'Date of birth oldest', value: 'date_of_birth:asc' },
  { label: 'Date of birth newest', value: 'date_of_birth:desc' },
]

const genderOptions = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
]

const countryOptions = computed(() => locationsStore.countryOptions)
const stateOptions = computed(() => locationsStore.stateOptions(form.country))
const stateDisabled = computed(() => !form.country || stateOptions.value.length === 0)
const areaOptions = computed(() => locationsStore.subdivisionOptions(form.country, form.state))
const areaDisabled = computed(() => !form.country || !form.state || areaOptions.value.length === 0)
const filterStateOptions = computed(() => locationsStore.stateOptions(filters.country))
const filterStateDisabled = computed(() => !filters.country || filterStateOptions.value.length === 0)
const filterAreaOptions = computed(() => locationsStore.subdivisionOptions(filters.country, filters.state))
const filterAreaDisabled = computed(() => !filters.country || !filters.state || filterAreaOptions.value.length === 0)
const totalMembers = computed(() => membersStore.meta?.total || 0)
const lastPage = computed(() => membersStore.meta?.last_page || 1)
const hasPreviousPage = computed(() => page.value > 1)
const hasNextPage = computed(() => page.value < lastPage.value)
const isEditing = computed(() => Boolean(editingMember.value))
const selectedSort = computed({
  get() {
    return `${sortBy.value}:${direction.value}`
  },
  set(value) {
    const [field, order] = value.split(':')
    sortBy.value = field
    direction.value = order
  },
})

const hasFilters = computed(() => {
  return Object.values(filters).some((value) => value !== '')
})

function displayValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  return value
}

function buildQuery() {
  const query = {
    page: page.value,
    per_page: perPage.value,
    sort_by: sortBy.value,
    direction: direction.value,
  }

  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== null) {
      query[key] = value
    }
  }

  return query
}

async function fetchMembers() {
  await membersStore.fetchMembers(buildQuery())
}

function resetForm() {
  form.full_name = ''
  form.gender = ''
  form.date_of_birth = ''
  form.is_child = false
  form.country = ''
  form.state = ''
  form.area = ''
  form.phone_1 = ''
  form.phone_2 = ''
  form.email = ''
  form.home_address = ''
  form.work_address = ''
  form.school_address = ''
  form.date_added = ''
  form.notes = ''
  formError.value = ''
}

function openCreateForm() {
  editingMember.value = null
  resetForm()
  formOpen.value = true
}

function openEditForm(member) {
  editingMember.value = member
  form.full_name = member.fullName || ''
  form.gender = member.gender || ''
  form.date_of_birth = member.dateOfBirth || ''
  form.is_child = Boolean(member.isChild)
  form.country = member.country || ''
  form.state = member.state || ''
  form.area = member.area || ''
  form.phone_1 = member.phone1 || ''
  form.phone_2 = member.phone2 || ''
  form.email = member.email || ''
  form.home_address = member.homeAddress || ''
  form.work_address = member.workAddress || ''
  form.school_address = member.schoolAddress || ''
  form.date_added = member.dateAdded || ''
  form.notes = member.notes || ''
  formError.value = ''
  formOpen.value = true
}

async function openDetails(member) {
  membersStore.selectedMember = member
  detailsOpen.value = true

  try {
    await membersStore.fetchMember(member.id)
  } catch {
    // The card still shows the row data if the detail refresh fails.
  }
}

function formPayload() {
  const payload = {}

  for (const [key, value] of Object.entries(form)) {
    if (value !== '' && value !== null) {
      payload[key] = value
    }
  }

  return payload
}

async function saveMember() {
  formError.value = ''

  try {
    if (editingMember.value) {
      await membersStore.updateMember(editingMember.value.id, formPayload())
    } else {
      await membersStore.createMember(formPayload())
    }

    formOpen.value = false
    await fetchMembers()
  } catch (error) {
    const errors = error?.data?.errors
    formError.value = errors
      ? Object.values(errors).flat().join(' ')
      : error?.data?.message || error?.message || 'Unable to save member.'
  }
}

async function applyFilters() {
  page.value = 1
  await fetchMembers()
}

async function clearFilters() {
  for (const key of Object.keys(filters)) {
    filters[key] = ''
  }

  page.value = 1
  await fetchMembers()
}

async function goToPage(nextPage) {
  page.value = nextPage
  await fetchMembers()
}

function onCountryChange() {
  form.state = ''
  form.area = ''
}

function onStateChange() {
  form.area = ''
}

watch(selectedSort, async () => {
  page.value = 1
  await fetchMembers()
})

watch(() => filters.country, () => {
  filters.state = ''
  filters.area = ''
})

watch(() => filters.state, () => {
  filters.area = ''
})

onMounted(() => {
  locationsStore.fetchCountries()
  fetchMembers()
})
</script>

<template>
  <section class="space-y-5">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a83632]">
          Members
        </p>
        <h1 class="m-0 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
          My Members
        </h1>
        <p class="mt-2 text-sm leading-6 text-gray-500">
          Add, view, and update member records assigned to you.
        </p>
      </div>

      <UButton
        icon="i-heroicons-plus-20-solid"
        size="lg"
        class="gap-2 px-4 py-2.5 text-white bg-[#a83632] hover:bg-[#922f2c] [&_svg]:text-white"
        @click="openCreateForm"
      >
        Add member
      </UButton>
    </div>

    <UCard class="border border-gray-200 bg-white shadow-sm">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_220px_220px_220px_auto]">
        <UInput
          v-model="filters.search"
          icon="i-heroicons-magnifying-glass-20-solid"
          placeholder="Search by name, phone, or email"
          @keyup.enter="applyFilters"
        />
        <USelect
          v-model="filters.country"
          :items="countryOptions"
          placeholder="Country"
          class="w-full"
        />
        <USelect
          v-model="filters.state"
          :items="filterStateOptions"
          placeholder="State"
          class="w-full"
          :disabled="filterStateDisabled"
        />
        <USelect
          v-model="filters.area"
          :items="filterAreaOptions"
          placeholder="Area"
          class="w-full"
          :disabled="filterAreaDisabled"
        />

        <UButton
          icon="i-heroicons-magnifying-glass-20-solid"
          class="gap-2 px-4 py-2.5 text-white bg-[#a83632] hover:bg-[#922f2c] [&_svg]:text-white"
          :loading="membersStore.loading"
          @click="applyFilters"
        >
          Search
        </UButton>
      </div>

      <div class="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <USelect
          v-model="selectedSort"
          :items="sortOptions"
          class="sm:w-52"
        />

        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="outline"
            :disabled="membersStore.loading || !hasFilters"
            @click="clearFilters"
          >
            Reset
          </UButton>
          <UButton
            icon="i-heroicons-funnel-20-solid"
            class="gap-2 px-4 py-2.5 text-white bg-[#a83632] hover:bg-[#922f2c] [&_svg]:text-white"
            :loading="membersStore.loading"
            @click="applyFilters"
          >
            Apply
          </UButton>
        </div>
      </div>
    </UCard>

    <UAlert
      v-if="membersStore.error"
      color="error"
      variant="soft"
      :title="membersStore.error"
    />

    <div class="flex items-center justify-between text-sm text-gray-500">
      <span>
        {{ totalMembers }} member{{ totalMembers === 1 ? '' : 's' }}
      </span>
      <span v-if="membersStore.meta.from">
        {{ membersStore.meta.from }}-{{ membersStore.meta.to }} of {{ totalMembers }}
      </span>
    </div>

    <div v-if="membersStore.loading" class="space-y-3">
      <USkeleton v-for="item in 4" :key="item" class="h-28 rounded-2xl" />
    </div>

    <UCard
      v-else-if="!membersStore.members.length"
      class="border border-dashed border-gray-300 bg-white shadow-sm"
    >
      <div class="py-10 text-center">
        <UIcon name="i-heroicons-user-group-20-solid" class="mx-auto h-10 w-10 text-[#a83632]" />
        <h2 class="mb-1 mt-4 text-base font-semibold text-gray-950">No members found</h2>
        <p class="mx-auto max-w-sm text-sm leading-6 text-gray-500">
          Add your first member or adjust your filters.
        </p>
      </div>
    </UCard>

    <div v-else class="space-y-3 lg:hidden">
      <UCard
        v-for="member in membersStore.members"
        :key="member.id"
        class="border border-gray-200 bg-white shadow-sm"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="m-0 truncate text-base font-semibold text-gray-950">{{ member.fullName }}</h2>
            <p class="mt-1 text-sm text-gray-500">
              {{ displayValue(member.gender) }}<span v-if="member.dateOfBirth"> · {{ member.dateOfBirth }}</span><span v-if="member.isChild"> · Child</span><span v-if="member.area"> · {{ member.area }}</span>
            </p>
          </div>
          <UBadge color="neutral" variant="soft">{{ displayValue(member.state) }}</UBadge>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p class="m-0 text-xs text-gray-500">Phone</p>
            <p class="m-0 font-medium text-gray-900">{{ displayValue(member.phone1) }}</p>
          </div>
          <div>
            <p class="m-0 text-xs text-gray-500">Email</p>
            <p class="m-0 truncate font-medium text-gray-900">{{ displayValue(member.email) }}</p>
          </div>
          <div>
            <p class="m-0 text-xs text-gray-500">Country</p>
            <p class="m-0 font-medium text-gray-900">{{ displayValue(member.country) }}</p>
          </div>
          <div>
            <p class="m-0 text-xs text-gray-500">Cell</p>
            <p class="m-0 font-medium text-gray-900">{{ displayValue(member.cellName) }}</p>
          </div>
        </div>

        <div class="mt-4 flex gap-2">
          <UButton
            color="neutral"
            variant="outline"
            block
            @click="openDetails(member)"
          >
            View
          </UButton>
          <UButton
            block
            class="px-4 py-2.5 text-white bg-[#a83632] hover:bg-[#922f2c]"
            @click="openEditForm(member)"
          >
            Edit
          </UButton>
        </div>
      </UCard>
    </div>

    <UCard v-if="membersStore.members.length && !membersStore.loading" class="hidden border border-gray-200 bg-white shadow-sm lg:block">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left text-sm">
          <thead>
            <tr class="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
              <th class="px-3 py-3 font-semibold">Name</th>
              <th class="px-3 py-3 font-semibold">Gender</th>
              <th class="px-3 py-3 font-semibold">Phone</th>
              <th class="px-3 py-3 font-semibold">Email</th>
              <th class="px-3 py-3 font-semibold">Date of birth</th>
              <th class="px-3 py-3 font-semibold">Child</th>
              <th class="px-3 py-3 font-semibold">Location</th>
              <th class="px-3 py-3 font-semibold">Cell</th>
              <th class="px-3 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="member in membersStore.members"
              :key="member.id"
              class="border-b border-gray-100 last:border-0 hover:bg-gray-50"
            >
              <td class="px-3 py-4 font-medium text-gray-950">{{ member.fullName }}</td>
              <td class="px-3 py-4 text-gray-600">{{ displayValue(member.gender) }}</td>
              <td class="px-3 py-4 text-gray-600">{{ displayValue(member.phone1) }}</td>
              <td class="px-3 py-4 text-gray-600">{{ displayValue(member.email) }}</td>
              <td class="px-3 py-4 text-gray-600">{{ displayValue(member.dateOfBirth) }}</td>
              <td class="px-3 py-4 text-gray-600">{{ member.isChild ? 'Yes' : 'No' }}</td>
              <td class="px-3 py-4 text-gray-600">{{ displayValue(member.area) }}, {{ displayValue(member.state) }}, {{ displayValue(member.country) }}</td>
              <td class="px-3 py-4 text-gray-600">{{ displayValue(member.cellName) }}</td>
              <td class="px-3 py-4">
                <div class="flex justify-end gap-2">
                  <UButton color="neutral" variant="ghost" size="sm" @click="openDetails(member)">View</UButton>
                  <UButton class="px-3 py-2 text-white bg-[#a83632] hover:bg-[#922f2c]" size="sm" @click="openEditForm(member)">Edit</UButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <div
      v-if="membersStore.members.length"
      class="flex items-center justify-between gap-3"
    >
      <UButton
        color="neutral"
        variant="outline"
        :disabled="!hasPreviousPage || membersStore.loading"
        @click="goToPage(page - 1)"
      >
        Previous
      </UButton>
      <span class="text-sm text-gray-500">Page {{ page }} of {{ lastPage }}</span>
      <UButton
        color="neutral"
        variant="outline"
        :disabled="!hasNextPage || membersStore.loading"
        @click="goToPage(page + 1)"
      >
        Next
      </UButton>
    </div>

    <div
      v-if="formOpen"
      class="fixed inset-0 z-50 flex items-end bg-gray-950/40 p-0 sm:items-center sm:justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <form
        class="member-form flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-2xl sm:rounded-2xl"
        @submit.prevent="saveMember"
      >
        <div class="shrink-0 border-b border-gray-100 px-5 py-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="m-0 text-xl font-semibold text-gray-950">
                {{ isEditing ? 'Update member' : 'Add member' }}
              </h2>
              <p class="mt-1 text-sm text-gray-500">
                {{ isEditing ? 'Edit member information you own.' : 'Create a new member assigned to your worker account.' }}
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              aria-label="Close form"
              class="shrink-0"
              @click="formOpen = false"
            />
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <UAlert
            v-if="formError"
            color="error"
            variant="soft"
            :title="formError"
            class="mb-4"
          />

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Full name" required class="sm:col-span-2">
              <UInput v-model="form.full_name" required class="w-full" />
            </UFormField>
            <UFormField label="Gender">
              <USelect v-model="form.gender" :items="genderOptions" placeholder="Select gender" class="w-full" />
            </UFormField>
            <UFormField label="Date of birth">
              <UInput v-model="form.date_of_birth" type="date" class="w-full" />
            </UFormField>
            <UFormField label="Child">
              <UCheckbox
                v-model="form.is_child"
                label="This member is a child"
                class="accent-[#a83632]"
              />
            </UFormField>
            <UFormField label="Phone 1">
              <UInput v-model="form.phone_1" type="tel" class="w-full" />
            </UFormField>
            <UFormField label="Phone 2">
              <UInput v-model="form.phone_2" type="tel" class="w-full" />
            </UFormField>
            <UFormField label="Email" class="sm:col-span-2">
              <UInput v-model="form.email" type="email" class="w-full" />
            </UFormField>
            <UFormField label="Country">
              <USelect
                v-model="form.country"
                :items="countryOptions"
                placeholder="Select country"
                class="w-full"
                @update:model-value="onCountryChange"
              />
            </UFormField>
            <UFormField label="State">
              <USelect
                v-model="form.state"
                :items="stateOptions"
                placeholder="Select state"
                class="w-full"
                :disabled="stateDisabled"
                @update:model-value="onStateChange"
              />
            </UFormField>
            <UFormField label="Area">
              <USelect
                v-model="form.area"
                :items="areaOptions"
                placeholder="Select area"
                class="w-full"
                :disabled="areaDisabled"
              />
            </UFormField>
            <UFormField label="Date added" class="sm:col-span-2">
              <UInput v-model="form.date_added" type="date" class="w-full" />
            </UFormField>
            <UFormField label="Home address" class="sm:col-span-2">
              <UTextarea v-model="form.home_address" :rows="2" class="w-full" />
            </UFormField>
            <UFormField label="Work address" class="sm:col-span-2">
              <UTextarea v-model="form.work_address" :rows="2" class="w-full" />
            </UFormField>
            <UFormField label="School address" class="sm:col-span-2">
              <UTextarea v-model="form.school_address" :rows="2" class="w-full" />
            </UFormField>
            <UFormField label="Notes" class="sm:col-span-2">
              <UTextarea v-model="form.notes" :rows="3" class="w-full" />
            </UFormField>
          </div>
        </div>

        <div class="shrink-0 border-t border-gray-200 bg-white px-5 py-4">
          <div class="flex gap-3">
            <UButton
              color="neutral"
              variant="outline"
              block
              type="button"
              @click="formOpen = false"
            >
              Cancel
            </UButton>
            <UButton
              block
              type="submit"
              :loading="membersStore.saving"
              class="px-4 py-2.5 text-white bg-[#a83632] hover:bg-[#922f2c]"
            >
              {{ isEditing ? 'Save changes' : 'Create member' }}
            </UButton>
          </div>
        </div>
      </form>
    </div>

    <div
      v-if="detailsOpen"
      class="fixed inset-0 z-50 flex items-end bg-gray-950/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div class="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:mx-auto sm:max-w-xl sm:rounded-2xl">
        <div class="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 class="m-0 text-xl font-semibold text-gray-950">
              {{ membersStore.selectedMember?.fullName }}
            </h2>
            <p class="mt-1 text-sm text-gray-500">
              Member details
            </p>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark-20-solid"
            aria-label="Close details"
            @click="detailsOpen = false"
          />
        </div>

        <dl class="grid gap-4 sm:grid-cols-2">
          <div v-for="item in [
            ['Gender', membersStore.selectedMember?.gender],
            ['Date of birth', membersStore.selectedMember?.dateOfBirth],
            ['Child', membersStore.selectedMember?.isChild ? 'Yes' : 'No'],
            ['Phone 1', membersStore.selectedMember?.phone1],
            ['Phone 2', membersStore.selectedMember?.phone2],
            ['Email', membersStore.selectedMember?.email],
            ['Country', membersStore.selectedMember?.country],
            ['State', membersStore.selectedMember?.state],
            ['Area', membersStore.selectedMember?.area],
            ['Church', membersStore.selectedMember?.churchName],
            ['Fellowship', membersStore.selectedMember?.fellowshipName],
            ['Cell', membersStore.selectedMember?.cellName],
            ['Date added', membersStore.selectedMember?.dateAdded],
            ['Home address', membersStore.selectedMember?.homeAddress],
            ['Work address', membersStore.selectedMember?.workAddress],
            ['School address', membersStore.selectedMember?.schoolAddress],
            ['Notes', membersStore.selectedMember?.notes],
          ]" :key="item[0]" class="rounded-xl border border-gray-200 p-3">
            <dt class="text-xs font-medium text-gray-500">{{ item[0] }}</dt>
            <dd class="mb-0 mt-1 text-sm font-medium text-gray-950">{{ displayValue(item[1]) }}</dd>
          </div>
        </dl>

        <div class="mt-5">
          <UButton
            block
            class="px-4 py-2.5 text-white bg-[#a83632] hover:bg-[#922f2c]"
            @click="openEditForm(membersStore.selectedMember); detailsOpen = false"
          >
            Edit member
          </UButton>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
:deep(.member-form label) {
  color: #111827 !important;
}
</style>
