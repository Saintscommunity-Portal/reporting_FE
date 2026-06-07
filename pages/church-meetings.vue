<script setup>
definePageMeta({ layout: 'app', middleware: 'auth' })

const { request } = useWorkerApi()

const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const meetings = ref([])
const members = ref([])
const selectedMeeting = ref(null)
const attendanceOpen = ref(false)
const reportOpen = ref(false)
const attendanceRows = ref([])
const report = reactive({ first_timers_count: 0, others_count: 0, children_count: 0, offering_given: 0, notes: '' })
const meta = ref({ current_page: 1, last_page: 1, total: 0, per_page: 10 })
const filters = reactive({
  date_from: '',
  date_to: '',
})

const hasPreviousPage = computed(() => Number(meta.value.current_page || 1) > 1)
const hasNextPage = computed(() => Number(meta.value.current_page || 1) < Number(meta.value.last_page || 1))

function displayValue(value) {
  if (!value) return '-'
  return String(value).replace(/_/g, ' ')
}

function displayDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function meetingStatusText(meeting) {
  const status = displayValue(meeting.status)

  if (meeting.status === 'completed' && meeting.workerAttendanceStatus) {
    return `${status}, you were ${displayValue(meeting.workerAttendanceStatus)}`
  }

  return status
}

async function fetchMeetings(page = 1) {
  loading.value = true
  errorMessage.value = ''
  try {
    const query = {
      page,
      per_page: meta.value.per_page || 10,
    }

    if (filters.date_from) query.date_from = filters.date_from
    if (filters.date_to) query.date_to = filters.date_to

    const response = await request('/church-meetings', { method: 'GET', query })
    meetings.value = response?.data || []
    meta.value = { ...meta.value, ...(response?.meta || {}) }
  } catch (error) {
    errorMessage.value = error?.data?.message || error?.message || 'Unable to load church meetings.'
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  fetchMeetings(1)
}

function resetFilters() {
  filters.date_from = ''
  filters.date_to = ''
  fetchMeetings(1)
}

function goToPreviousPage() {
  if (hasPreviousPage.value) {
    fetchMeetings(Number(meta.value.current_page || 1) - 1)
  }
}

function goToNextPage() {
  if (hasNextPage.value) {
    fetchMeetings(Number(meta.value.current_page || 1) + 1)
  }
}

async function fetchMembers() {
  const response = await request('/members', { method: 'GET', query: { per_page: 100 } })
  members.value = response?.data || []
}

async function openAttendance(meeting) {
  if (meeting.status !== 'completed') {
    errorMessage.value = 'You can only report attendance after this meeting is completed.'
    return
  }

  selectedMeeting.value = meeting
  const response = await request(`/church-meetings/${meeting.id}/members-attendance`, {
    method: 'GET',
    query: { per_page: 500 },
  })
  const savedAttendance = new Map(
    (response?.data || [])
      .filter((row) => row.memberId)
      .map((row) => [String(row.memberId), row.attendanceStatus]),
  )

  attendanceRows.value = members.value.map((member) => ({
    member_id: member.id,
    name: member.fullName || member.full_name,
    attendance_status: savedAttendance.get(String(member.id)) || 'present',
  }))
  attendanceOpen.value = true
}

async function saveAttendance() {
  saving.value = true
  await request(`/church-meetings/${selectedMeeting.value.id}/members-attendance`, {
    method: 'PATCH',
    body: {
      attendance: attendanceRows.value.map((row) => ({
        member_id: row.member_id,
        attendance_status: row.attendance_status,
      })),
    },
  })
  attendanceOpen.value = false
  saving.value = false
}

async function openReport(meeting) {
  if (meeting.status !== 'completed') {
    errorMessage.value = 'You can only submit a report after this meeting is completed.'
    return
  }

  selectedMeeting.value = meeting
  const response = await request(`/church-meetings/${meeting.id}/worker-report`, { method: 'GET' })
  const data = response?.data || {}
  report.first_timers_count = data.firstTimersCount || 0
  report.others_count = data.othersCount || 0
  report.children_count = data.childrenCount || 0
  report.offering_given = data.offeringGiven || 0
  report.notes = data.notes || ''
  reportOpen.value = true
}

async function saveReport() {
  saving.value = true
  await request(`/church-meetings/${selectedMeeting.value.id}/worker-report`, { method: 'PATCH', body: { ...report } })
  reportOpen.value = false
  saving.value = false
}

onMounted(async () => {
  await Promise.all([fetchMeetings(), fetchMembers()])
})
</script>

<template>
  <section class="space-y-5">
    <div>
      <p class="m-0 text-xs font-bold uppercase tracking-[0.18em] text-[#a83632]">Meetings</p>
      <h1 class="m-0 mt-2 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">Church meetings</h1>
      <p class="m-0 mt-2 text-sm text-gray-500">Mark your members and submit first timers, others, and children counts.</p>
    </div>

    <UAlert v-if="errorMessage" color="error" variant="soft" :title="errorMessage" />

    <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div class="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <UFormField label="From">
          <UInput v-model="filters.date_from" type="date" class="w-full" />
        </UFormField>
        <UFormField label="To">
          <UInput v-model="filters.date_to" type="date" class="w-full" />
        </UFormField>
        <div class="flex gap-2">
          <UButton
            class="flex-1 bg-[#a83632] text-white hover:bg-[#922f2c] sm:flex-none"
            :loading="loading"
            @click="applyFilters"
          >
            Apply
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            class="flex-1 sm:flex-none"
            :disabled="loading"
            @click="resetFilters"
          >
            Reset
          </UButton>
        </div>
      </div>
    </div>

    <div v-if="loading" class="space-y-3">
      <USkeleton v-for="item in 4" :key="item" class="h-24 rounded-2xl" />
    </div>
    <div v-else class="space-y-3">
      <UCard v-if="meetings.length === 0" class="border border-gray-200 bg-white text-center shadow-sm">
        <p class="m-0 text-sm font-medium text-gray-950">No meetings found</p>
        <p class="m-0 mt-1 text-sm text-gray-500">Try another date range.</p>
      </UCard>

      <UCard v-for="meeting in meetings" :key="meeting.id" class="border border-gray-200 bg-white shadow-sm">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="m-0 text-base font-semibold text-gray-950">{{ meeting.meetingName }}</h2>
            <p class="m-0 mt-1 text-sm capitalize text-gray-500">{{ displayValue(meeting.type) }} / {{ displayDate(meeting.meetingDate) }}</p>
            <p class="m-0 mt-1 text-xs capitalize text-gray-500">{{ meetingStatusText(meeting) }}</p>
          </div>
          <div class="flex gap-2">
            <UButton class="bg-[#a83632] text-white hover:bg-[#922f2c]" :disabled="meeting.status !== 'completed'" @click="openAttendance(meeting)">Attendance</UButton>
            <UButton color="neutral" variant="outline" :disabled="meeting.status !== 'completed'" @click="openReport(meeting)">Report</UButton>
          </div>
        </div>
      </UCard>

      <div
        v-if="Number(meta.total || 0) > 0"
        class="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="m-0 text-sm text-gray-500">
          Showing page <span class="font-semibold text-gray-900">{{ meta.current_page || 1 }}</span>
          of <span class="font-semibold text-gray-900">{{ meta.last_page || 1 }}</span>
          <span class="text-gray-400">/</span>
          <span class="font-semibold text-gray-900">{{ meta.total || 0 }}</span> meetings
        </p>
        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="outline"
            class="flex-1 sm:flex-none"
            :disabled="!hasPreviousPage || loading"
            @click="goToPreviousPage"
          >
            Previous
          </UButton>
          <UButton
            class="flex-1 bg-[#a83632] text-white hover:bg-[#922f2c] disabled:bg-gray-200 disabled:text-gray-500 sm:flex-none"
            :disabled="!hasNextPage || loading"
            @click="goToNextPage"
          >
            Next
          </UButton>
        </div>
      </div>
    </div>

    <UModal v-model:open="attendanceOpen">
      <template #content>
        <div class="modal-dark space-y-4 bg-gray-950 p-5 text-white">
          <h2 class="m-0 text-lg font-semibold text-white">Members attendance</h2>
          <div class="max-h-[60vh] space-y-2 overflow-y-auto">
            <label v-for="row in attendanceRows" :key="row.member_id" class="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white">
              <span class="font-medium text-white">{{ row.name }}</span>
              <USelect v-model="row.attendance_status" :items="[{ label: 'Present', value: 'present' }, { label: 'Absent', value: 'absent' }]" class="w-32" />
            </label>
          </div>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="outline" @click="attendanceOpen = false">Cancel</UButton>
            <UButton class="bg-[#a83632] text-white hover:bg-[#922f2c]" :loading="saving" @click="saveAttendance">Save</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="reportOpen">
      <template #content>
        <div class="modal-dark space-y-4 bg-gray-950 p-5 text-white">
          <h2 class="m-0 text-lg font-semibold text-white">Worker report</h2>
          <UFormField label="First timers"><UInput v-model="report.first_timers_count" type="number" /></UFormField>
          <UFormField label="Others"><UInput v-model="report.others_count" type="number" /></UFormField>
          <UFormField label="Children"><UInput v-model="report.children_count" type="number" /></UFormField>
          <UFormField label="Offering given"><UInput v-model="report.offering_given" type="number" min="0" step="0.01" /></UFormField>
          <UFormField label="Notes"><UTextarea v-model="report.notes" /></UFormField>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="outline" @click="reportOpen = false">Cancel</UButton>
            <UButton class="bg-[#a83632] text-white hover:bg-[#922f2c]" :loading="saving" @click="saveReport">Save</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </section>
</template>

<style scoped>
:deep(.modal-dark label),
:deep(.modal-dark [class*="text-gray-900"]),
:deep(.modal-dark [class*="text-gray-950"]) {
  color: #ffffff !important;
}
</style>
