<script setup>
definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const route = useRoute()
const router = useRouter()
const { request } = useWorkerApi()

const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const formError = ref('')
const submitOpen = ref(false)
const studyGroup = ref(null)
const members = ref([])

const form = reactive({
  submit_for: 'self',
  submission_type: 'physical',
  submission_link: '',
  submission_note: '',
})

const submitForOptions = computed(() => [
  { label: 'Myself', value: 'self' },
  ...members.value.map((member) => ({ label: member.fullName || member.full_name, value: member.id })),
])
const workerSubmission = computed(() => studyGroup.value?.workerSubmission || null)
const resubmissionCount = computed(() => workerSubmission.value?.resubmissionCount || 0)
const canSubmit = computed(() => workerSubmission.value?.submissionStatus !== 'approved' && resubmissionCount.value < 3)
const submitButtonLabel = computed(() => {
  if (workerSubmission.value?.submissionStatus === 'rejected') return 'Resubmit'
  if (workerSubmission.value?.submissionStatus === 'defaulted') return 'Submit late'
  if (workerSubmission.value?.submissionStatus === 'submitted') return 'Update submission'
  return 'Submit'
})

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

function displayDateTime(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function statusMeta(status) {
  if (status === 'defaulted') return { label: 'Defaulted', class: 'border-red-200 bg-red-50 text-red-700' }
  if (status === 'approved') return { label: 'Approved', class: 'border-green-200 bg-green-50 text-green-700' }
  if (status === 'rejected') return { label: 'Rejected', class: 'border-amber-200 bg-amber-50 text-amber-700' }
  if (status === 'submitted') return { label: 'Submitted', class: 'border-blue-200 bg-blue-50 text-blue-700' }

  return { label: 'Not submitted', class: 'border-gray-200 bg-white text-gray-600' }
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }

  navigateTo('/study-group')
}

async function fetchStudyGroup() {
  const response = await request(`/study-groups/${route.params.id}`, { method: 'GET' })
  studyGroup.value = response?.data || null
}

async function fetchMembers() {
  const response = await request('/members', { method: 'GET', query: { per_page: 100 } })
  members.value = response?.data || []
}

async function refresh() {
  loading.value = true
  errorMessage.value = ''

  try {
    await Promise.all([fetchStudyGroup(), fetchMembers()])
  } catch (error) {
    errorMessage.value = error?.data?.message || error?.message || 'Unable to load Study Group.'
  } finally {
    loading.value = false
  }
}

function openSubmit() {
  if (!canSubmit.value) return

  form.submit_for = 'self'
  form.submission_type = workerSubmission.value?.submissionType || 'physical'
  form.submission_link = workerSubmission.value?.submissionLink || ''
  form.submission_note = workerSubmission.value?.submissionNote || ''
  formError.value = ''
  submitOpen.value = true
}

async function submitStudyGroup() {
  if (!studyGroup.value) return
  saving.value = true
  formError.value = ''

  try {
    const body = {
      submission_type: form.submission_type,
      submission_link: form.submission_link,
      submission_note: form.submission_note,
    }
    const path = form.submit_for === 'self'
      ? `/study-groups/${studyGroup.value.id}/submit`
      : `/study-groups/${studyGroup.value.id}/members/${form.submit_for}/submit`

    await request(path, { method: 'POST', body })
    submitOpen.value = false
    await refresh()
  } catch (error) {
    formError.value = error?.data?.message || error?.message || 'Unable to submit Study Group.'
  } finally {
    saving.value = false
  }
}

onMounted(refresh)
</script>

<template>
  <section class="space-y-5">
    <UButton
      color="neutral"
      variant="outline"
      class="border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
      icon="i-heroicons-arrow-left"
      @click="goBack"
    >
      Back
    </UButton>

    <UAlert v-if="errorMessage" color="error" variant="soft" :title="errorMessage" />

    <div v-if="loading" class="space-y-4">
      <USkeleton class="h-28 rounded-2xl" />
      <USkeleton class="h-48 rounded-2xl" />
    </div>

    <template v-else-if="studyGroup">
      <UCard class="border border-gray-200 bg-white shadow-sm">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="m-0 text-xs font-bold uppercase tracking-[0.18em] text-[#a83632]">Study Group</p>
            <h1 class="m-0 mt-2 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">{{ studyGroup.title }}</h1>
            <p class="m-0 mt-2 text-sm capitalize text-gray-500">
              {{ displayValue(studyGroup.materialType) }} / {{ displayDate(studyGroup.fromDate) }} to {{ displayDate(studyGroup.toDate) }}
            </p>
          </div>
          <span
            class="rounded-full border px-3 py-1.5 text-xs font-semibold"
            :class="statusMeta(workerSubmission?.submissionStatus).class"
          >
            {{ statusMeta(workerSubmission?.submissionStatus).label }}
          </span>
        </div>
      </UCard>

      <div class="grid gap-4 lg:grid-cols-[1fr_360px]">
        <UCard class="border border-gray-200 bg-white shadow-sm">
          <template #header>
            <h2 class="m-0 text-base font-semibold text-gray-950">Assignment details</h2>
          </template>

          <div v-if="studyGroup.questions" class="mb-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p class="m-0 text-sm font-semibold text-gray-950">Questions</p>
            <p class="m-0 mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">{{ studyGroup.questions }}</p>
          </div>

          <dl class="grid gap-4 sm:grid-cols-2">
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">Church</dt>
              <dd class="m-0 mt-1 text-sm text-gray-900">{{ displayValue(studyGroup.churchName) }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">Created by</dt>
              <dd class="m-0 mt-1 text-sm text-gray-900">{{ displayValue(studyGroup.createdByName) }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">Start date</dt>
              <dd class="m-0 mt-1 text-sm text-gray-900">{{ displayDate(studyGroup.fromDate) }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">Due date</dt>
              <dd class="m-0 mt-1 text-sm text-gray-900">{{ displayDate(studyGroup.toDate) }}</dd>
            </div>
          </dl>
        </UCard>

        <UCard class="border border-gray-200 bg-white shadow-sm">
          <template #header>
            <h2 class="m-0 text-base font-semibold text-gray-950">Your submission</h2>
          </template>

          <div class="space-y-4">
            <div class="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p class="m-0 text-xs text-gray-500">Status</p>
              <p class="m-0 mt-1 text-sm font-semibold capitalize text-gray-950">
                {{ displayValue(workerSubmission?.submissionStatus) }}
              </p>
              <p class="m-0 mt-2 text-xs text-gray-500">
                Resubmissions: {{ resubmissionCount }} of 3
              </p>
            </div>

            <div v-if="workerSubmission" class="space-y-3 text-sm text-gray-700">
              <p class="m-0"><span class="font-semibold text-gray-950">Submitted:</span> {{ displayDateTime(workerSubmission.submittedAt) }}</p>
              <p class="m-0 capitalize"><span class="font-semibold text-gray-950">Timing:</span> {{ displayValue(workerSubmission.submissionTiming) }}</p>
              <p class="m-0"><span class="font-semibold text-gray-950">Grade:</span> {{ displayValue(workerSubmission.grade) }}</p>
              <p class="m-0"><span class="font-semibold text-gray-950">Pastor comments:</span> {{ displayValue(workerSubmission.notes || workerSubmission.rejectionReason) }}</p>
            </div>

            <UAlert
              v-if="!canSubmit"
              color="neutral"
              variant="soft"
              :title="workerSubmission?.submissionStatus === 'approved' ? 'This submission has been approved.' : 'Maximum resubmissions reached.'"
            />

            <UButton
              class="w-full justify-center bg-[#a83632] text-white hover:bg-[#922f2c] disabled:bg-gray-200 disabled:text-gray-500"
              :disabled="!canSubmit"
              @click="openSubmit"
            >
              {{ submitButtonLabel }}
            </UButton>
          </div>
        </UCard>
      </div>
    </template>

    <UModal v-model:open="submitOpen">
      <template #content>
        <div class="modal-dark w-[calc(100vw-2rem)] max-w-lg space-y-4 bg-gray-950 p-5 text-white sm:w-full">
          <div>
            <h2 class="m-0 text-lg font-semibold text-white">{{ submitButtonLabel }} Study Group</h2>
            <p class="m-0 mt-1 text-sm text-gray-300">{{ studyGroup?.title }}</p>
          </div>
          <UAlert v-if="formError" color="error" variant="soft" :title="formError" />
          <UFormField label="Submit for" class="w-full">
            <USelect v-model="form.submit_for" :items="submitForOptions" class="w-full" />
          </UFormField>
          <UFormField label="Submission type" class="w-full">
            <USelect
              v-model="form.submission_type"
              :items="[
                { label: 'Physical', value: 'physical' },
                { label: 'Link', value: 'link' },
              ]"
              class="w-full"
            />
          </UFormField>
          <UFormField v-if="form.submission_type === 'link'" label="Submission link" class="w-full">
            <UInput v-model="form.submission_link" placeholder="https://..." class="w-full" />
          </UFormField>
          <UFormField label="Note" class="w-full">
            <UTextarea v-model="form.submission_note" class="w-full" />
          </UFormField>
          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <UButton color="neutral" variant="outline" class="w-full justify-center sm:w-auto" @click="submitOpen = false">Cancel</UButton>
            <UButton class="w-full justify-center bg-[#a83632] text-white hover:bg-[#922f2c] sm:w-auto" :loading="saving" @click="submitStudyGroup">Submit</UButton>
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
