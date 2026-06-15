<script setup>
definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const { request } = useWorkerApi()

const loading = ref(true)
const errorMessage = ref('')
const studyGroups = ref([])
const page = ref(1)
const perPage = ref(10)
const meta = ref({ current_page: 1, last_page: 1, total: 0, per_page: 10 })

const filters = reactive({
  search: '',
  date_from: '',
  date_to: '',
})

const lastPage = computed(() => meta.value?.last_page || 1)
const hasPreviousPage = computed(() => page.value > 1)
const hasNextPage = computed(() => page.value < lastPage.value)
const defaultedCount = computed(() => studyGroups.value.filter((item) => item.workerSubmission?.submissionStatus === 'defaulted').length)
const submittedCount = computed(() => studyGroups.value.filter((item) => ['submitted', 'approved', 'rejected'].includes(item.workerSubmission?.submissionStatus)).length)

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value).replace(/_/g, ' ')
}

function displayDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function statusMeta(studyGroup) {
  const status = studyGroup.workerSubmission?.submissionStatus

  if (status === 'defaulted') {
    return { label: 'Defaulted', class: 'border-red-200 bg-red-50 text-red-700' }
  }

  if (status === 'approved') {
    return { label: 'Approved', class: 'border-green-200 bg-green-50 text-green-700' }
  }

  if (status === 'rejected') {
    return { label: 'Rejected', class: 'border-amber-200 bg-amber-50 text-amber-700' }
  }

  if (status === 'submitted') {
    return { label: 'Submitted', class: 'border-blue-200 bg-blue-50 text-blue-700' }
  }

  return { label: 'Not submitted', class: 'border-gray-200 bg-white text-gray-600' }
}

function buildQuery() {
  const query = { page: page.value, per_page: perPage.value }
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '') query[key] = value
  }
  return query
}

async function fetchStudyGroups() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await request('/study-groups', { method: 'GET', query: buildQuery() })
    studyGroups.value = response?.data || []
    meta.value = { ...meta.value, ...(response?.meta || {}) }
  } catch (error) {
    errorMessage.value = error?.data?.message || error?.message || 'Unable to load study groups.'
  } finally {
    loading.value = false
  }
}

async function applyFilters() {
  page.value = 1
  await fetchStudyGroups()
}

async function goToPage(nextPage) {
  page.value = nextPage
  await fetchStudyGroups()
}

onMounted(fetchStudyGroups)
</script>

<template>
  <section class="space-y-5">
    <div>
      <p class="m-0 text-xs font-bold uppercase tracking-[0.18em] text-[#a83632]">Study group</p>
      <h1 class="m-0 mt-2 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">Church study groups</h1>
      <p class="m-0 mt-2 text-sm text-gray-500">View assignments created for your church and open one to submit your work.</p>
    </div>

    <div class="grid grid-cols-3 gap-2 sm:gap-3">
      <div class="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <p class="m-0 text-xs text-gray-500">Assignments</p>
        <p class="m-0 mt-2 text-xl font-semibold text-gray-950">{{ meta.total || studyGroups.length }}</p>
      </div>
      <div class="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <p class="m-0 text-xs text-gray-500">Submitted</p>
        <p class="m-0 mt-2 text-xl font-semibold text-green-800">{{ submittedCount }}</p>
      </div>
      <div class="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <p class="m-0 text-xs text-gray-500">Defaulted</p>
        <p class="m-0 mt-2 text-xl font-semibold text-[#a83632]">{{ defaultedCount }}</p>
      </div>
    </div>

    <UCard class="border border-gray-200 bg-white shadow-sm">
      <div class="grid gap-3 md:grid-cols-[1fr_160px_160px_auto]">
        <UInput v-model="filters.search" placeholder="Search study groups" />
        <UInput v-model="filters.date_from" type="date" />
        <UInput v-model="filters.date_to" type="date" />
        <UButton class="bg-[#a83632] text-white hover:bg-[#922f2c]" :loading="loading" @click="applyFilters">Apply</UButton>
      </div>
    </UCard>

    <UAlert v-if="errorMessage" color="error" variant="soft" :title="errorMessage" />

    <UCard class="border border-gray-200 bg-white shadow-sm">
      <template #header>
        <div>
          <h2 class="m-0 text-base font-semibold text-gray-950">Assignments</h2>
          <p class="m-0 mt-1 text-sm text-gray-500">Open an assignment to review details, comments, and submission eligibility.</p>
        </div>
      </template>

      <div v-if="loading" class="space-y-3">
        <USkeleton v-for="item in 4" :key="item" class="h-24 rounded-2xl" />
      </div>
      <div v-else-if="!studyGroups.length" class="py-8 text-center text-sm text-gray-500">
        No study groups found.
      </div>
      <div v-else class="space-y-3">
        <NuxtLink
          v-for="item in studyGroups"
          :key="item.id"
          :to="`/study-group/${item.id}`"
          class="block rounded-2xl border border-gray-200 bg-gray-50 p-4 text-inherit no-underline transition hover:border-[#a83632]/30 hover:bg-white hover:shadow-sm"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="m-0 text-base font-semibold text-gray-950">{{ item.title }}</h3>
                <span
                  class="rounded-full border px-2.5 py-1 text-xs font-semibold"
                  :class="statusMeta(item).class"
                >
                  {{ statusMeta(item).label }}
                </span>
              </div>
              <p class="m-0 mt-2 text-sm capitalize text-gray-500">
                {{ displayValue(item.materialType) }} / {{ displayDate(item.fromDate) }} to {{ displayDate(item.toDate) }}
              </p>
              <p v-if="item.workerSubmission?.resubmissionCount" class="m-0 mt-2 text-xs text-gray-500">
                Resubmissions: {{ item.workerSubmission.resubmissionCount }} of 3
              </p>
            </div>
            <span class="text-sm font-semibold text-[#a83632]">View</span>
          </div>
        </NuxtLink>
      </div>

      <template #footer>
        <div class="flex items-center justify-between">
          <UButton color="neutral" variant="outline" :disabled="!hasPreviousPage || loading" @click="goToPage(page - 1)">Previous</UButton>
          <span class="text-sm text-gray-500">Page {{ page }} of {{ lastPage }}</span>
          <UButton color="neutral" variant="outline" :disabled="!hasNextPage || loading" @click="goToPage(page + 1)">Next</UButton>
        </div>
      </template>
    </UCard>
  </section>
</template>
