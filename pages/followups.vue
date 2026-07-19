<script setup>
definePageMeta({ layout: 'app', middleware: 'auth' })

const { request } = useWorkerApi()

const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const followups = ref([])
const reports = ref([])
const selectedFollowup = ref(null)
const followupOpen = ref(false)
const reportOpen = ref(false)
const confirmOpen = ref(false)
const editingFollowupId = ref(null)
const editingReportId = ref(null)
const deleteTarget = ref(null)
const suppressTargetTypeWatch = ref(false)
const targetOptions = ref([])
const targetSearch = ref('')
const meta = ref({ current_page: 1, last_page: 1, total: 0, per_page: 10 })
const filters = reactive({ from_date: '', to_date: '' })
const followupForm = reactive({ time_from: '', time_to: '' })
const reportForm = reactive({
  target_type: 'member',
  followup_member_id: null,
  followup_outreach_report_id: null,
  material_used: '',
  teaching_note: '',
  activity_type: 'followup',
  response_or_questions: '',
  time_spent: 15,
})
const activityOptions = ['teaching', 'prayer', 'followup', 'outreach', 'holyghost_meeting'].map((value) => ({ label: displayValue(value), value }))
const targetTypeOptions = [{ label: 'Member', value: 'member' }, { label: 'Outreach report', value: 'outreach_report' }]

function toDateTimeLocal(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

function displayValue(value) {
  if (!value) return '-'
  return String(value).replace(/_/g, ' ')
}

function displayDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

async function fetchFollowups(page = 1) {
  loading.value = true
  errorMessage.value = ''
  try {
    const query = { page, per_page: meta.value.per_page || 10 }
    if (filters.from_date) query.from_date = filters.from_date
    if (filters.to_date) query.to_date = filters.to_date
    const response = await request('/followups', { method: 'GET', query })
    followups.value = response?.data || []
    meta.value = { ...meta.value, ...(response?.meta || {}) }
  } catch (error) {
    errorMessage.value = error?.data?.message || error?.message || 'Unable to load follow ups.'
  } finally {
    loading.value = false
  }
}

function openCreateFollowup() {
  editingFollowupId.value = null
  followupForm.time_from = ''
  followupForm.time_to = ''
  followupOpen.value = true
}

function openEditFollowup(followup) {
  editingFollowupId.value = followup.id
  followupForm.time_from = toDateTimeLocal(followup.timeFrom)
  followupForm.time_to = toDateTimeLocal(followup.timeTo)
  followupOpen.value = true
}

async function saveFollowup() {
  saving.value = true
  try {
    const activeEditId = editingFollowupId.value
    const path = editingFollowupId.value ? `/followups/${editingFollowupId.value}` : '/followups'
    const method = editingFollowupId.value ? 'PATCH' : 'POST'
    await request(path, { method, body: { ...followupForm } })
    followupOpen.value = false
    await fetchFollowups(meta.value.current_page || 1)
    if (selectedFollowup.value?.id === activeEditId) {
      const refreshed = followups.value.find((item) => item.id === activeEditId)
      selectedFollowup.value = refreshed || selectedFollowup.value
    }
    editingFollowupId.value = null
  } catch (error) {
    errorMessage.value = error?.data?.message || error?.message || 'Unable to save follow up.'
  } finally {
    saving.value = false
  }
}

async function selectFollowup(followup) {
  selectedFollowup.value = followup
  const response = await request(`/followups/${followup.id}/reports`, { method: 'GET', query: { per_page: 100 } })
  reports.value = response?.data || []
}

async function searchTargets() {
  const response = await request('/followup-targets/search', {
    method: 'GET',
    query: { type: reportForm.target_type, q: targetSearch.value },
  })
  targetOptions.value = (response?.data || []).map((item) => ({ label: `${item.name}${item.phone || item.phone_number ? ` / ${item.phone || item.phone_number}` : ''}`, value: item.id }))
}

async function openReport() {
  editingReportId.value = null
  reportForm.target_type = 'member'
  reportForm.followup_member_id = null
  reportForm.followup_outreach_report_id = null
  reportForm.material_used = ''
  reportForm.teaching_note = ''
  reportForm.activity_type = 'followup'
  reportForm.response_or_questions = ''
  reportForm.time_spent = 15
  targetSearch.value = ''
  reportOpen.value = true
  await searchTargets()
}

async function openEditReport(report) {
  editingReportId.value = report.id
  suppressTargetTypeWatch.value = true
  try {
    reportForm.target_type = report.targetType || (report.followupMemberId ? 'member' : 'outreach_report')
    reportForm.followup_member_id = report.followupMemberId || null
    reportForm.followup_outreach_report_id = report.followupOutreachReportId || null
    reportForm.material_used = report.materialUsed || ''
    reportForm.teaching_note = report.teachingNote || ''
    reportForm.activity_type = report.activityType || 'followup'
    reportForm.response_or_questions = report.responseOrQuestions || ''
    reportForm.time_spent = report.timeSpent || 15
    targetSearch.value = report.targetName || ''
    reportOpen.value = true
    await searchTargets()
    const selectedTargetId = reportForm.followup_member_id || reportForm.followup_outreach_report_id
    if (selectedTargetId && !targetOptions.value.some((item) => item.value === selectedTargetId)) {
      targetOptions.value.unshift({
        label: `${report.targetName || 'Selected target'}${report.targetPhone ? ` / ${report.targetPhone}` : ''}`,
        value: selectedTargetId,
      })
    }
  } finally {
    suppressTargetTypeWatch.value = false
  }
}

function selectTarget(value) {
  if (reportForm.target_type === 'member') {
    reportForm.followup_member_id = value
    reportForm.followup_outreach_report_id = null
  } else {
    reportForm.followup_member_id = null
    reportForm.followup_outreach_report_id = value
  }
}

async function saveReport() {
  if (!selectedFollowup.value) return
  saving.value = true
  try {
    const path = editingReportId.value
      ? `/followup-reports/${editingReportId.value}`
      : `/followups/${selectedFollowup.value.id}/reports`
    const method = editingReportId.value ? 'PATCH' : 'POST'
    await request(path, { method, body: { ...reportForm } })
    reportOpen.value = false
    editingReportId.value = null
    await selectFollowup(selectedFollowup.value)
    await fetchFollowups(meta.value.current_page || 1)
  } catch (error) {
    errorMessage.value = error?.data?.message || error?.message || 'Unable to save follow up report.'
  } finally {
    saving.value = false
  }
}

function askDeleteFollowup(followup) {
  deleteTarget.value = { type: 'followup', id: followup.id, label: displayDate(followup.timeFrom) }
  confirmOpen.value = true
}

function askDeleteReport(report) {
  deleteTarget.value = { type: 'report', id: report.id, label: report.targetName || 'this report' }
  confirmOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  saving.value = true
  try {
    if (deleteTarget.value.type === 'followup') {
      await request(`/followups/${deleteTarget.value.id}`, { method: 'DELETE' })
      if (selectedFollowup.value?.id === deleteTarget.value.id) {
        selectedFollowup.value = null
        reports.value = []
      }
      await fetchFollowups(meta.value.current_page || 1)
    } else {
      await request(`/followup-reports/${deleteTarget.value.id}`, { method: 'DELETE' })
      if (selectedFollowup.value) {
        await selectFollowup(selectedFollowup.value)
      }
      await fetchFollowups(meta.value.current_page || 1)
    }
    confirmOpen.value = false
    deleteTarget.value = null
  } catch (error) {
    errorMessage.value = error?.data?.message || error?.message || 'Unable to delete item.'
  } finally {
    saving.value = false
  }
}

watch(() => reportForm.target_type, async () => {
  if (suppressTargetTypeWatch.value) return
  reportForm.followup_member_id = null
  reportForm.followup_outreach_report_id = null
  await searchTargets()
})

onMounted(fetchFollowups)
</script>

<template>
  <section class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="m-0 text-xs font-bold uppercase tracking-[0.18em] text-[#a83632]">Follow ups</p>
        <h1 class="m-0 mt-2 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">Follow up reports</h1>
        <p class="m-0 mt-2 text-sm text-gray-500">Create follow up activities and report member or outreach follow ups.</p>
      </div>
      <UButton class="bg-[#a83632] text-white hover:bg-[#922f2c]" @click="openCreateFollowup">New follow up</UButton>
    </div>

    <UAlert v-if="errorMessage" color="error" variant="soft" :title="errorMessage" />

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)]">
      <div class="space-y-3">
        <USkeleton v-if="loading" v-for="item in 4" :key="item" class="h-24 rounded-2xl" />
        <UCard v-for="followup in followups" v-else :key="followup.id" class="border border-gray-200 bg-white shadow-sm">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="m-0 text-base font-semibold text-gray-950">{{ displayDate(followup.timeFrom) }}</h2>
              <p class="m-0 mt-1 text-sm text-gray-500">{{ displayDate(followup.timeTo) }} / {{ followup.reportCount || 0 }} report(s)</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <UButton color="neutral" variant="outline" @click="selectFollowup(followup)">View reports</UButton>
              <UButton color="neutral" variant="outline" @click="openEditFollowup(followup)">Edit</UButton>
              <UButton color="error" variant="soft" @click="askDeleteFollowup(followup)">Delete</UButton>
            </div>
          </div>
        </UCard>
      </div>

      <UCard class="border border-gray-200 bg-white shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="m-0 text-base font-semibold text-gray-950">Reports</h2>
            <p class="m-0 mt-1 text-sm text-gray-500">{{ selectedFollowup ? displayDate(selectedFollowup.timeFrom) : 'Select a follow up' }}</p>
          </div>
          <UButton :disabled="!selectedFollowup" class="bg-[#a83632] text-white hover:bg-[#922f2c]" @click="openReport">Add</UButton>
        </div>
        <div class="mt-4 space-y-2">
          <div v-if="reports.length === 0" class="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">No reports shown.</div>
          <div v-for="report in reports" :key="report.id" class="rounded-xl border border-gray-200 p-3">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="m-0 text-sm font-semibold text-gray-950">{{ report.targetName }}</p>
                <p class="m-0 mt-1 text-xs text-gray-500">{{ displayValue(report.activityType) }} / {{ report.timeSpent }} mins</p>
              </div>
              <div class="flex shrink-0 flex-wrap gap-2">
                <UButton size="sm" color="neutral" variant="outline" @click="openEditReport(report)">Edit</UButton>
                <UButton size="sm" color="error" variant="soft" @click="askDeleteReport(report)">Delete</UButton>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <UModal v-model:open="followupOpen">
      <template #content>
        <div class="modal-dark space-y-4 bg-gray-950 p-5 text-white">
          <h2 class="m-0 text-lg font-semibold text-white">{{ editingFollowupId ? 'Update follow up' : 'New follow up' }}</h2>
          <UFormField label="From"><UInput v-model="followupForm.time_from" type="datetime-local" /></UFormField>
          <UFormField label="To"><UInput v-model="followupForm.time_to" type="datetime-local" /></UFormField>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="outline" @click="followupOpen = false">Cancel</UButton>
            <UButton class="bg-[#a83632] text-white hover:bg-[#922f2c]" :loading="saving" @click="saveFollowup">{{ editingFollowupId ? 'Update' : 'Save' }}</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="reportOpen">
      <template #content>
        <div class="modal-dark max-h-[88vh] w-[min(92vw,720px)] space-y-4 overflow-y-auto bg-gray-950 p-5 text-white">
          <h2 class="m-0 text-lg font-semibold text-white">{{ editingReportId ? 'Update follow up report' : 'Follow up report' }}</h2>
          <UFormField label="Target type"><USelect v-model="reportForm.target_type" :items="targetTypeOptions" class="w-full" /></UFormField>
          <UFormField label="Search target"><UInput v-model="targetSearch" class="w-full" @input="searchTargets" /></UFormField>
          <UFormField label="Target">
            <USelect :model-value="reportForm.followup_member_id || reportForm.followup_outreach_report_id" :items="targetOptions" class="w-full" @update:model-value="selectTarget" />
          </UFormField>
          <UFormField label="Activity"><USelect v-model="reportForm.activity_type" :items="activityOptions" class="w-full" /></UFormField>
          <UFormField label="Time spent"><UInput v-model="reportForm.time_spent" type="number" class="w-full" /></UFormField>
          <UFormField label="Material used"><UTextarea v-model="reportForm.material_used" class="w-full" /></UFormField>
          <UFormField label="Teaching note"><UTextarea v-model="reportForm.teaching_note" class="w-full" /></UFormField>
          <UFormField label="Response/questions"><UTextarea v-model="reportForm.response_or_questions" class="w-full" /></UFormField>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="outline" @click="reportOpen = false">Cancel</UButton>
            <UButton class="bg-[#a83632] text-white hover:bg-[#922f2c]" :loading="saving" @click="saveReport">{{ editingReportId ? 'Update' : 'Save' }}</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="confirmOpen">
      <template #content>
        <div class="modal-dark space-y-4 bg-gray-950 p-5 text-white">
          <div>
            <h2 class="m-0 text-lg font-semibold text-white">Delete {{ deleteTarget?.type === 'followup' ? 'follow up' : 'report' }}</h2>
            <p class="m-0 mt-2 text-sm text-gray-300">
              This will permanently remove {{ deleteTarget?.label || 'this item' }} from your follow up records.
            </p>
          </div>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="outline" @click="confirmOpen = false">Cancel</UButton>
            <UButton color="error" :loading="saving" @click="confirmDelete">Delete</UButton>
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
