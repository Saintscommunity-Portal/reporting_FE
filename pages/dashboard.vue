<script setup>
definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const auth = useAuthStore()
const { request } = useWorkerApi()

const loading = ref(true)
const refreshing = ref(false)
const errorMessage = ref('')
const members = ref([])
const meetings = ref([])
const studyGroups = ref([])
const outreaches = ref([])
const followups = ref([])
const prayerRows = ref([])
const totals = reactive({
  members: 0,
  meetings: 0,
  studyGroups: 0,
  outreaches: 0,
  followups: 0,
})

function toDateInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = new Date()
const todayInput = toDateInput(today)
const monthStartInput = toDateInput(new Date(today.getFullYear(), today.getMonth(), 1))
const weekStart = new Date(today)
weekStart.setDate(today.getDate() - today.getDay())
weekStart.setHours(0, 0, 0, 0)

const quickActions = [
  { label: 'Add Member', to: '/members', icon: 'i-heroicons-user-plus-20-solid' },
  { label: 'Mark Attendance', to: '/church-meetings', icon: 'i-heroicons-clipboard-document-check-20-solid' },
  { label: 'Submit Study Group', to: '/study-group', icon: 'i-heroicons-book-open-20-solid' },
  { label: 'Record Outreach', to: '/outreaches', icon: 'i-heroicons-megaphone-20-solid' },
  { label: 'Add Follow Up', to: '/followups', icon: 'i-heroicons-chat-bubble-left-right-20-solid' },
  { label: 'Prayer Meetings', to: '/prayer-group', icon: 'i-heroicons-chart-pie-20-solid' },
]

function listFrom(response) {
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response)) return response
  return []
}

function totalFrom(response, fallback = 0) {
  return Number(response?.meta?.total || response?.summary?.total || fallback || 0)
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value).replace(/_/g, ' ')
}

function displayDate(value, options = { dateStyle: 'medium' }) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en', options).format(date)
}

function isSameDay(value, dateInput = todayInput) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return toDateInput(date) === dateInput
}

function isThisMonth(value) {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date >= new Date(monthStartInput)
}

function submissionStatus(item) {
  return item?.workerSubmission?.submissionStatus || item?.submissionStatus || 'not_submitted'
}

function statusClass(status) {
  if (['approved', 'present', 'completed'].includes(status)) {
    return 'border-green-200 bg-green-50 text-green-800 dark:border-green-800/60 dark:bg-green-950/40 dark:text-green-200'
  }

  if (['rejected', 'defaulted', 'absent'].includes(status)) {
    return 'border-red-200 bg-red-50 text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200'
  }

  if (['submitted', 'pending'].includes(status)) {
    return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200'
  }

  return 'border-gray-200 bg-white text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300'
}

function lastItem(items, dateKeys = ['createdAt', 'created_at', 'date']) {
  return [...items].sort((first, second) => {
    const firstDate = dateKeys.map((key) => first?.[key]).find(Boolean)
    const secondDate = dateKeys.map((key) => second?.[key]).find(Boolean)
    return new Date(secondDate || 0) - new Date(firstDate || 0)
  })[0]
}

const todayMeetings = computed(() => meetings.value.filter((meeting) => isSameDay(meeting.meetingDate || meeting.meeting_date)))
const completedMeetings = computed(() => meetings.value.filter((meeting) => meeting.status === 'completed'))
const pendingStudyGroups = computed(() => studyGroups.value.filter((item) => ['not_submitted', 'defaulted', 'rejected'].includes(submissionStatus(item))))
const submittedStudyGroups = computed(() => studyGroups.value.filter((item) => ['submitted', 'approved'].includes(submissionStatus(item))))
const rejectedStudyGroups = computed(() => studyGroups.value.filter((item) => submissionStatus(item) === 'rejected'))
const membersThisMonth = computed(() => members.value.filter((member) => isThisMonth(member.dateAdded || member.date_added || member.createdAt || member.created_at)).length)
const outreachesThisMonth = computed(() => outreaches.value.filter((item) => isThisMonth(item.date || item.createdAt || item.created_at)).length)
const followupsThisMonth = computed(() => followups.value.filter((item) => isThisMonth(item.timeFrom || item.time_from || item.createdAt || item.created_at)).length)
const prayerPresentThisMonth = computed(() => prayerRows.value.filter((row) => row.participationStatus === 'present' && isThisMonth(row.prayedAt || row.prayed_at)).length)
const hasPrayerThisWeek = computed(() => prayerRows.value.some((row) => {
  const prayedAt = new Date(row.prayedAt || row.prayed_at || '')
  return !Number.isNaN(prayedAt.getTime()) && prayedAt >= weekStart
}))

const snapshotCards = computed(() => [
  { label: 'My Members', value: totals.members || members.value.length, tone: 'text-gray-950 dark:text-white' },
  { label: 'Added This Month', value: membersThisMonth.value, tone: 'text-[#a83632]' },
  { label: 'Prayer Meetings Present', value: prayerPresentThisMonth.value, tone: 'text-green-800 dark:text-green-300' },
  { label: 'Study Group Pending', value: pendingStudyGroups.value.length, tone: 'text-amber-700 dark:text-amber-300' },
  { label: 'Outreaches This Month', value: outreachesThisMonth.value, tone: 'text-gray-950 dark:text-white' },
  { label: 'Follow Ups This Month', value: followupsThisMonth.value, tone: 'text-gray-950 dark:text-white' },
])

const alerts = computed(() => {
  const rows = []

  if (pendingStudyGroups.value.length) {
    rows.push({
      title: `${pendingStudyGroups.value.length} Study Group assignment${pendingStudyGroups.value.length === 1 ? '' : 's'} need attention`,
      to: '/study-group',
      badge: 'Study Group',
    })
  }

  if (completedMeetings.value.length) {
    rows.push({
      title: `${completedMeetings.value.length} completed meeting${completedMeetings.value.length === 1 ? '' : 's'} ready for attendance/reporting`,
      to: '/church-meetings',
      badge: 'Meeting',
    })
  }

  if (!hasPrayerThisWeek.value) {
    rows.push({
      title: 'No prayer meeting participation is recorded for this week yet',
      to: '/prayer-group',
      badge: 'Prayer Meetings',
    })
  }

  if (outreaches.value.length && !followups.value.length) {
    rows.push({
      title: 'Recent outreach activity is available; add follow ups when needed',
      to: '/followups',
      badge: 'Follow up',
    })
  }

  return rows
})

const recentActivity = computed(() => {
  const recentMember = lastItem(members.value, ['dateAdded', 'date_added', 'createdAt', 'created_at'])
  const recentOutreach = lastItem(outreaches.value, ['date', 'createdAt', 'created_at'])
  const recentFollowup = lastItem(followups.value, ['timeFrom', 'time_from', 'createdAt', 'created_at'])
  const recentStudy = lastItem(studyGroups.value, ['toDate', 'to_date', 'createdAt', 'created_at'])
  const recentMeeting = lastItem(meetings.value, ['meetingDate', 'meeting_date', 'createdAt', 'created_at'])

  return [
    recentMember && {
      title: `Member: ${recentMember.fullName || recentMember.full_name}`,
      subtitle: displayDate(recentMember.dateAdded || recentMember.date_added || recentMember.createdAt || recentMember.created_at),
      to: '/members',
    },
    recentOutreach && {
      title: `Outreach: ${recentOutreach.locationCovered || recentOutreach.location_covered || 'Recent outreach'}`,
      subtitle: displayDate(recentOutreach.date || recentOutreach.createdAt || recentOutreach.created_at),
      to: '/outreaches',
    },
    recentFollowup && {
      title: 'Follow up activity',
      subtitle: displayDate(recentFollowup.timeFrom || recentFollowup.time_from || recentFollowup.createdAt || recentFollowup.created_at, { dateStyle: 'medium', timeStyle: 'short' }),
      to: '/followups',
    },
    recentStudy && {
      title: `Study Group: ${recentStudy.title || 'Assignment'}`,
      subtitle: displayValue(submissionStatus(recentStudy)),
      to: '/study-group',
    },
    recentMeeting && {
      title: `Meeting: ${recentMeeting.meetingName || recentMeeting.meeting_name || 'Church meeting'}`,
      subtitle: displayDate(recentMeeting.meetingDate || recentMeeting.meeting_date, { dateStyle: 'medium', timeStyle: 'short' }),
      to: '/church-meetings',
    },
  ].filter(Boolean)
})

async function loadDashboard() {
  refreshing.value = true
  errorMessage.value = ''

  const requests = await Promise.allSettled([
    request('/members', { method: 'GET', query: { per_page: 20, sort_by: 'created_at', direction: 'desc' } }),
    request('/church-meetings', { method: 'GET', query: { per_page: 20, date_from: monthStartInput, date_to: todayInput } }),
    request('/study-groups', { method: 'GET', query: { per_page: 20 } }),
    request('/outreaches', { method: 'GET', query: { per_page: 20, from_date: monthStartInput, to_date: todayInput } }),
    request('/followups', { method: 'GET', query: { per_page: 20, from_date: monthStartInput, to_date: todayInput } }),
    request('/prayer-trail', { method: 'GET', query: { per_page: 30, date_from: monthStartInput, date_to: todayInput } }),
  ])

  const [membersResponse, meetingsResponse, studyResponse, outreachResponse, followupResponse, prayerResponse] = requests.map((item) => item.status === 'fulfilled' ? item.value : null)
  const failed = requests.find((item) => item.status === 'rejected')

  members.value = listFrom(membersResponse)
  meetings.value = listFrom(meetingsResponse)
  studyGroups.value = listFrom(studyResponse)
  outreaches.value = listFrom(outreachResponse)
  followups.value = listFrom(followupResponse)
  prayerRows.value = listFrom(prayerResponse)

  totals.members = totalFrom(membersResponse, members.value.length)
  totals.meetings = totalFrom(meetingsResponse, meetings.value.length)
  totals.studyGroups = totalFrom(studyResponse, studyGroups.value.length)
  totals.outreaches = totalFrom(outreachResponse, outreaches.value.length)
  totals.followups = totalFrom(followupResponse, followups.value.length)

  if (failed) {
    errorMessage.value = 'Some dashboard items could not be refreshed. The available items are shown below.'
  }

  refreshing.value = false
  loading.value = false
}

onMounted(loadDashboard)
</script>

<template>
  <section class="space-y-5">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a83632]">
          Dashboard
        </p>
        <h1 class="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
          Hello, {{ auth.workerName }}
        </h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
          Your worker reporting workspace for today, this month, and anything waiting on you.
        </p>
      </div>

      <UButton
        icon="i-heroicons-arrow-path-20-solid"
        color="neutral"
        variant="outline"
        :loading="refreshing"
        @click="loadDashboard"
      >
        Refresh
      </UButton>
    </div>

    <UAlert
      v-if="errorMessage"
      color="warning"
      variant="soft"
      :title="errorMessage"
    />

    <div v-if="loading" class="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_360px]">
      <USkeleton class="h-72 rounded-2xl" />
      <USkeleton class="h-72 rounded-2xl" />
      <USkeleton class="h-40 rounded-2xl lg:col-span-2" />
    </div>

    <template v-else>
      <div class="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_360px]">
        <UCard class="border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-gray-950">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="m-0 text-base font-semibold text-gray-950 dark:text-white">Today's work</h2>
                <p class="m-0 mt-1 text-sm text-gray-500 dark:text-gray-400">{{ displayDate(todayInput) }}</p>
              </div>
              <UBadge class="bg-[#a83632] text-white dark:bg-[#a83632]">Action first</UBadge>
            </div>
          </template>

          <div class="space-y-3">
            <div
              v-if="!todayMeetings.length && !pendingStudyGroups.length && !completedMeetings.length"
              class="rounded-2xl border border-dashed border-gray-200 p-5 text-sm text-gray-500 dark:border-white/10 dark:text-gray-400"
            >
              No urgent work found for today. You can still add members, outreach, follow ups, or review your reports.
            </div>

            <NuxtLink
              v-for="meeting in todayMeetings.slice(0, 3)"
              :key="`meeting-${meeting.id}`"
              to="/church-meetings"
              class="block rounded-2xl border border-gray-200 bg-gray-50 p-4 text-inherit no-underline transition hover:border-[#a83632]/40 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="m-0 text-sm font-semibold text-gray-950 dark:text-white">{{ meeting.meetingName || meeting.meeting_name }}</p>
                  <p class="m-0 mt-1 text-xs capitalize text-gray-500 dark:text-gray-400">
                    {{ displayValue(meeting.type) }} / {{ displayDate(meeting.meetingDate || meeting.meeting_date, { dateStyle: 'medium', timeStyle: 'short' }) }}
                  </p>
                </div>
                <span class="rounded-full border px-2.5 py-1 text-xs font-semibold capitalize" :class="statusClass(meeting.status)">
                  {{ displayValue(meeting.status) }}
                </span>
              </div>
            </NuxtLink>

            <NuxtLink
              v-for="study in pendingStudyGroups.slice(0, 3)"
              :key="`study-${study.id}`"
              :to="`/study-group/${study.id}`"
              class="block rounded-2xl border border-amber-200 bg-amber-50 p-4 text-inherit no-underline transition hover:bg-white dark:border-amber-800/60 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="m-0 text-sm font-semibold text-gray-950 dark:text-white">{{ study.title || 'Study Group assignment' }}</p>
                  <p class="m-0 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Due {{ displayDate(study.toDate || study.to_date) }}
                  </p>
                </div>
                <span class="rounded-full border px-2.5 py-1 text-xs font-semibold capitalize" :class="statusClass(submissionStatus(study))">
                  {{ displayValue(submissionStatus(study)) }}
                </span>
              </div>
            </NuxtLink>

            <NuxtLink
              v-if="completedMeetings.length"
              to="/church-meetings"
              class="block rounded-2xl border border-[#a83632]/20 bg-[#a83632]/5 p-4 text-inherit no-underline transition hover:bg-[#a83632]/10 dark:border-[#a83632]/40 dark:bg-[#a83632]/10"
            >
              <p class="m-0 text-sm font-semibold text-gray-950 dark:text-white">Completed meetings need your report</p>
              <p class="m-0 mt-1 text-xs text-gray-500 dark:text-gray-400">
                {{ completedMeetings.length }} meeting{{ completedMeetings.length === 1 ? '' : 's' }} can receive attendance and report updates.
              </p>
            </NuxtLink>
          </div>
        </UCard>

        <UCard class="border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-gray-950">
          <template #header>
            <h2 class="m-0 text-base font-semibold text-gray-950 dark:text-white">Quick actions</h2>
          </template>

          <div class="grid grid-cols-2 gap-3">
            <NuxtLink
              v-for="action in quickActions"
              :key="action.to"
              :to="action.to"
              class="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-gray-950 no-underline transition hover:border-[#a83632]/40 hover:bg-white hover:text-[#a83632] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              <UIcon :name="action.icon" class="h-5 w-5 text-[#a83632]" />
              <p class="m-0 mt-3 text-sm font-semibold">{{ action.label }}</p>
            </NuxtLink>
          </div>
        </UCard>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <div
          v-for="card in snapshotCards"
          :key="card.label"
          class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-gray-950"
        >
          <p class="m-0 text-xs font-medium text-gray-500 dark:text-gray-400">{{ card.label }}</p>
          <p class="m-0 mt-2 text-2xl font-semibold" :class="card.tone">{{ card.value }}</p>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <UCard class="border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-gray-950">
          <template #header>
            <div>
              <h2 class="m-0 text-base font-semibold text-gray-950 dark:text-white">Alerts</h2>
              <p class="m-0 mt-1 text-sm text-gray-500 dark:text-gray-400">Pending items and useful nudges.</p>
            </div>
          </template>

          <div v-if="!alerts.length" class="rounded-2xl border border-dashed border-gray-200 p-5 text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
            Nothing urgent right now.
          </div>
          <div v-else class="space-y-3">
            <NuxtLink
              v-for="alert in alerts"
              :key="alert.title"
              :to="alert.to"
              class="flex items-start justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-inherit no-underline transition hover:border-[#a83632]/40 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <p class="m-0 text-sm font-medium text-gray-950 dark:text-white">{{ alert.title }}</p>
              <span class="shrink-0 rounded-full bg-[#a83632]/10 px-2.5 py-1 text-xs font-semibold text-[#a83632]">
                {{ alert.badge }}
              </span>
            </NuxtLink>
          </div>
        </UCard>

        <UCard class="border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-gray-950">
          <template #header>
            <div>
              <h2 class="m-0 text-base font-semibold text-gray-950 dark:text-white">Recent activity</h2>
              <p class="m-0 mt-1 text-sm text-gray-500 dark:text-gray-400">Latest worker records available to this dashboard.</p>
            </div>
          </template>

          <div v-if="!recentActivity.length" class="rounded-2xl border border-dashed border-gray-200 p-5 text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
            No recent activity found yet.
          </div>
          <div v-else class="space-y-3">
            <NuxtLink
              v-for="item in recentActivity"
              :key="item.title"
              :to="item.to"
              class="block rounded-2xl border border-gray-200 p-4 text-inherit no-underline transition hover:border-[#a83632]/40 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
            >
              <p class="m-0 text-sm font-semibold text-gray-950 dark:text-white">{{ item.title }}</p>
              <p class="m-0 mt-1 text-xs capitalize text-gray-500 dark:text-gray-400">{{ item.subtitle }}</p>
            </NuxtLink>
          </div>
        </UCard>
      </div>

      <UCard class="border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-gray-950">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="m-0 text-base font-semibold text-gray-950 dark:text-white">This month</h2>
              <p class="m-0 mt-1 text-sm text-gray-500 dark:text-gray-400">A compact view of your current reporting rhythm.</p>
            </div>
            <span class="text-xs font-semibold uppercase tracking-wide text-gray-400">{{ displayDate(monthStartInput) }} - {{ displayDate(todayInput) }}</span>
          </div>
        </template>

        <div class="grid gap-3 md:grid-cols-3">
          <div class="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
            <p class="m-0 text-sm font-semibold text-gray-950 dark:text-white">Study Group</p>
            <p class="m-0 mt-2 text-sm text-gray-500 dark:text-gray-400">
              {{ submittedStudyGroups.length }} submitted or approved, {{ rejectedStudyGroups.length }} rejected, {{ pendingStudyGroups.length }} pending/defaulted.
            </p>
          </div>
          <div class="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
            <p class="m-0 text-sm font-semibold text-gray-950 dark:text-white">Prayer Meetings</p>
            <p class="m-0 mt-2 text-sm text-gray-500 dark:text-gray-400">
              {{ prayerPresentThisMonth }} present records loaded for this month.
            </p>
          </div>
          <div class="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
            <p class="m-0 text-sm font-semibold text-gray-950 dark:text-white">Outreach and follow up</p>
            <p class="m-0 mt-2 text-sm text-gray-500 dark:text-gray-400">
              {{ outreachesThisMonth }} outreach{{ outreachesThisMonth === 1 ? '' : 'es' }} and {{ followupsThisMonth }} follow up{{ followupsThisMonth === 1 ? '' : 's' }} loaded.
            </p>
          </div>
        </div>
      </UCard>
    </template>
  </section>
</template>
