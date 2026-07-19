<script setup>
definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const { request } = useWorkerApi()

const loading = ref(true)
const errorMessage = ref('')
const rows = ref([])
const page = ref(1)
const perPage = ref(10)
const meta = ref({
  current_page: 1,
  from: 0,
  last_page: 1,
  per_page: 10,
  to: 0,
  total: 0,
})
const summary = ref({
  total: 0,
  present: 0,
  absent: 0,
})

const filters = reactive({
  from_month: currentMonthInput(),
  to_month: currentMonthInput(),
})

const lastPage = computed(() => meta.value?.last_page || 1)
const hasPreviousPage = computed(() => page.value > 1)
const hasNextPage = computed(() => page.value < lastPage.value)
const presentPercent = computed(() => percentage(summary.value.present, summary.value.total))
const chartStyle = computed(() => ({
  background: `conic-gradient(#166534 0 ${presentPercent.value}%, #a83632 ${presentPercent.value}% 100%)`,
}))

function percentage(value, total) {
  if (!total) {
    return 0
  }

  return Math.round((Number(value || 0) / Number(total)) * 100)
}

function displayDate(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleString()
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  return String(value).replace(/_/g, ' ')
}

function displayPrayerGroup(group, fallbackId) {
  if (!group) {
    return displayValue(fallbackId)
  }

  const day = displayValue(group.day)
  const schedule = displayValue(group.schedule)

  if (day === '-' && schedule === '-') {
    return displayValue(group.id || fallbackId)
  }

  return `${day} - ${schedule}`
}

function currentMonthInput() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthParts(value) {
  const [yearValue, monthValue] = String(value).split('-')
  const year = Number(yearValue)
  const month = Number(monthValue)

  if (!year || !month) {
    return null
  }

  return {
    year,
    month,
    yearValue,
    monthValue,
  }
}

function monthRange(fromValue, toValue) {
  const from = monthParts(fromValue)
  const to = monthParts(toValue)

  if (!from && !to) {
    return {}
  }

  const first = from || to
  const second = to || from
  const firstValue = (first.year * 100) + first.month
  const secondValue = (second.year * 100) + second.month
  const start = firstValue <= secondValue ? first : second
  const end = firstValue <= secondValue ? second : first
  const lastDay = new Date(end.year, end.month, 0).getDate()

  return {
    date_from: `${start.yearValue}-${start.monthValue}-01`,
    date_to: `${end.yearValue}-${end.monthValue}-${String(lastDay).padStart(2, '0')}`,
  }
}

function participationGroupLabel(item) {
  if (isMakeUpPrayer(item)) {
    return 'Make Up'
  }

  return displayValue(item?.attendanceGroup)
}

function isMakeUpPrayer(item) {
  return Boolean(item?.isMakeUp)
    || (
      item?.recordType === 'prayer_group'
      && item?.participationStatus === 'present'
      && item?.prayerGroupId
      && item?.expectedPrayerGroupId
      && Number(item.prayerGroupId) !== Number(item.expectedPrayerGroupId)
    )
}

function showsPrayerGroupDetails(item) {
  return item?.recordType === 'prayer_group'
}

function statusClasses(status) {
  return status === 'present'
    ? 'bg-green-50 text-green-800 ring-green-700/20'
    : 'bg-red-50 text-red-800 ring-red-700/20'
}

function buildQuery() {
  const query = {
    page: page.value,
    per_page: perPage.value,
    ...monthRange(filters.from_month, filters.to_month),
  }

  return query
}

async function fetchTrail() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await request('/prayer-trail', {
      method: 'GET',
      query: buildQuery(),
    })

    rows.value = Array.isArray(response?.data) ? response.data : []
    summary.value = {
      total: response?.summary?.total || 0,
      present: response?.summary?.present || 0,
      absent: response?.summary?.absent || 0,
    }
    meta.value = {
      ...meta.value,
      ...(response?.meta || {}),
    }
    perPage.value = Number(meta.value.per_page || perPage.value)
    page.value = Number(meta.value.current_page || page.value)
  } catch (error) {
    rows.value = []
    summary.value = { total: 0, present: 0, absent: 0 }
    errorMessage.value = error?.data?.message || error?.message || 'Unable to load prayer group participation.'
  } finally {
    loading.value = false
  }
}

async function applyFilters() {
  page.value = 1
  await fetchTrail()
}

async function clearFilters() {
  filters.from_month = currentMonthInput()
  filters.to_month = currentMonthInput()
  page.value = 1
  await fetchTrail()
}

async function goToPage(nextPage) {
  page.value = nextPage
  await fetchTrail()
}

onMounted(fetchTrail)
</script>

<template>
  <section class="space-y-5">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a83632]">
          Prayer group
        </p>
        <h1 class="m-0 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
          Prayer participation
        </h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
          Review your prayer group attendance history and present/absent balance.
        </p>
      </div>
    </div>

    <UCard class="border border-gray-200 bg-white shadow-sm">
      <div class="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-center">
        <div class="mx-auto flex flex-col items-center">
          <div class="relative grid h-44 w-44 place-items-center rounded-full shadow-inner" :style="chartStyle">
            <div class="grid h-28 w-28 place-items-center rounded-full bg-white text-center shadow-sm">
              <div>
                <p class="m-0 text-3xl font-semibold text-gray-950">{{ presentPercent }}%</p>
                <p class="m-0 text-xs font-medium uppercase tracking-wide text-gray-500">Present</p>
              </div>
            </div>
          </div>
          <div class="mt-4 flex gap-3 text-xs font-medium">
            <span class="inline-flex items-center gap-1 text-green-800"><span class="h-2.5 w-2.5 rounded-full bg-green-800" />Present</span>
            <span class="inline-flex items-center gap-1 text-[#a83632]"><span class="h-2.5 w-2.5 rounded-full bg-[#a83632]" />Absent</span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 sm:gap-3">
          <div class="rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
            <p class="m-0 text-xs text-gray-500 sm:text-sm">Total</p>
            <USkeleton v-if="loading" class="mt-3 h-7 w-12 sm:h-8 sm:w-20" />
            <p v-else class="mb-0 mt-2 text-xl font-semibold text-gray-950 sm:text-2xl">{{ summary.total }}</p>
          </div>
          <div class="rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
            <p class="m-0 text-xs text-gray-500 sm:text-sm">Present</p>
            <USkeleton v-if="loading" class="mt-3 h-7 w-12 sm:h-8 sm:w-20" />
            <p v-else class="mb-0 mt-2 text-xl font-semibold text-green-800 sm:text-2xl">{{ summary.present }}</p>
          </div>
          <div class="rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
            <p class="m-0 text-xs text-gray-500 sm:text-sm">Absent</p>
            <USkeleton v-if="loading" class="mt-3 h-7 w-12 sm:h-8 sm:w-20" />
            <p v-else class="mb-0 mt-2 text-xl font-semibold text-[#a83632] sm:text-2xl">{{ summary.absent }}</p>
          </div>
        </div>
      </div>
    </UCard>

    <UCard class="border border-gray-200 bg-white shadow-sm">
      <div class="mb-4">
        <p class="m-0 text-sm font-semibold text-gray-950">Date filter</p>
        <p class="m-0 mt-1 text-xs text-gray-500">Select a month-year range for prayer group records.</p>
      </div>
      <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] md:items-end">
        <UFormField label="From month - year">
          <UInput v-model="filters.from_month" type="month" class="w-full" />
        </UFormField>
        <UFormField label="To month - year">
          <UInput v-model="filters.to_month" type="month" class="w-full" />
        </UFormField>
        <UButton
          color="neutral"
          variant="outline"
          :disabled="loading || (filters.from_month === currentMonthInput() && filters.to_month === currentMonthInput())"
          @click="clearFilters"
        >
          Reset
        </UButton>
        <UButton
          :loading="loading"
          class="px-4 py-2.5 text-white bg-[#a83632] hover:bg-[#922f2c]"
          @click="applyFilters"
        >
          Apply
        </UButton>
      </div>
    </UCard>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      :title="errorMessage"
    />

    <div v-if="loading" class="space-y-3">
      <USkeleton v-for="item in 5" :key="item" class="h-24 rounded-2xl" />
    </div>

    <UCard
      v-else-if="!rows.length"
      class="border border-dashed border-gray-300 bg-white shadow-sm"
    >
      <div class="py-10 text-center">
        <UIcon name="i-heroicons-chart-pie-20-solid" class="mx-auto h-10 w-10 text-[#a83632]" />
        <h2 class="mb-1 mt-4 text-base font-semibold text-gray-950">No participation records found</h2>
        <p class="mx-auto max-w-sm text-sm leading-6 text-gray-500">
          Your prayer group participation will appear here after attendance is recorded.
        </p>
      </div>
    </UCard>

    <div v-else class="space-y-3">
      <UCard
        v-for="item in rows"
        :key="item.id"
        class="border border-gray-200 bg-white shadow-sm"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1" :class="statusClasses(item.participationStatus)">
                {{ displayValue(item.participationStatus) }}
              </span>
              <span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold capitalize text-gray-700">
                {{ displayValue(item.recordType) }}
              </span>
              <span
                v-if="showsPrayerGroupDetails(item) && isMakeUpPrayer(item)"
                class="rounded-full bg-[#a83632] px-2.5 py-1 text-xs font-semibold text-white"
              >
                Make Up
              </span>
            </div>
            <h2 class="mb-0 mt-3 truncate text-base font-semibold text-gray-950">
              {{ displayDate(item.prayedAt) }}
            </h2>
            <p class="m-0 mt-1 text-sm text-gray-500">
              Arrival: {{ displayValue(item.arrivalStatus) }}
              <template v-if="showsPrayerGroupDetails(item)">
                / Group: {{ participationGroupLabel(item) }}
              </template>
            </p>
          </div>
          <div
            v-if="showsPrayerGroupDetails(item)"
            class="grid grid-cols-2 gap-3 text-sm sm:min-w-64"
          >
            <div>
              <p class="m-0 text-xs text-gray-500">Prayer group</p>
              <p class="m-0 font-medium capitalize text-gray-900">
                {{ displayPrayerGroup(item.prayerGroup, item.prayerGroupId) }}
              </p>
            </div>
            <div>
              <p class="m-0 text-xs text-gray-500">Expected group</p>
              <p class="m-0 font-medium capitalize text-gray-900">
                {{ displayPrayerGroup(item.expectedPrayerGroup, item.expectedPrayerGroupId) }}
              </p>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <div
      v-if="rows.length"
      class="flex items-center justify-between gap-3"
    >
      <UButton
        color="neutral"
        variant="outline"
        :disabled="!hasPreviousPage || loading"
        @click="goToPage(page - 1)"
      >
        Previous
      </UButton>
      <span class="text-sm text-gray-500">Page {{ page }} of {{ lastPage }}</span>
      <UButton
        color="neutral"
        variant="outline"
        :disabled="!hasNextPage || loading"
        @click="goToPage(page + 1)"
      >
        Next
      </UButton>
    </div>
  </section>
</template>
