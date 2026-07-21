<script setup>
definePageMeta({ layout: "app", middleware: "auth" });

const route = useRoute();
const router = useRouter();
const { request } = useWorkerApi();

const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const outreach = ref(null);
const members = ref([]);
const reports = ref([]);
const reportOpen = ref(false);

const reportForm = reactive({
  reported_for_type: "worker",
  reported_for_member_id: null,
  name: "",
  age: null,
  home_address: "",
  work_address: "",
  school: "",
  phone_number: "",
  saved: false,
  filled: false,
  healed: false,
  followup_count: 0,
  notes: "",
});

const memberOptions = computed(() => [
  { label: "Myself", value: "myself", type: "worker" },
  ...members.value.map((member) => ({
    label: member.fullName || member.full_name,
    value: member.id,
    type: "member",
  })),
]);

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value).replace(/_/g, " ");
}

function displayDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function goBack() {
  if (window.history.length > 1) {
    router.back();
    return;
  }

  navigateTo("/outreaches");
}

async function fetchOutreach() {
  const response = await request(`/outreaches/${route.params.id}`, { method: "GET" });
  outreach.value = response?.data || null;
}

async function fetchReports() {
  const response = await request(`/outreaches/${route.params.id}/reports`, {
    method: "GET",
    query: { per_page: 100 },
  });
  reports.value = response?.data || [];
}

async function fetchMembers() {
  const response = await request("/members", { method: "GET", query: { per_page: 500 } });
  members.value = response?.data || [];
}

async function refresh() {
  loading.value = true;
  errorMessage.value = "";

  try {
    await Promise.all([fetchOutreach(), fetchReports(), fetchMembers()]);
  } catch (error) {
    errorMessage.value = error?.data?.message || error?.message || "Unable to load outreach reports.";
  } finally {
    loading.value = false;
  }
}

function openReport() {
  reportForm.reported_for_type = "worker";
  reportForm.reported_for_member_id = null;
  reportForm.name = "";
  reportForm.age = null;
  reportForm.home_address = "";
  reportForm.work_address = "";
  reportForm.school = "";
  reportForm.phone_number = "";
  reportForm.saved = false;
  reportForm.filled = false;
  reportForm.healed = false;
  reportForm.followup_count = 0;
  reportForm.notes = "";
  reportOpen.value = true;
}

function chooseReportedFor(value) {
  if (value === "myself") {
    reportForm.reported_for_type = "worker";
    reportForm.reported_for_member_id = null;
    return;
  }

  reportForm.reported_for_type = "member";
  reportForm.reported_for_member_id = value;
}

async function saveReport() {
  saving.value = true;
  errorMessage.value = "";

  try {
    await request(`/outreaches/${route.params.id}/reports`, {
      method: "POST",
      body: { ...reportForm },
    });
    reportOpen.value = false;
    await Promise.all([fetchReports(), fetchOutreach()]);
  } catch (error) {
    errorMessage.value = error?.data?.message || error?.message || "Unable to save outreach report.";
  } finally {
    saving.value = false;
  }
}

onMounted(refresh);
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
      <USkeleton class="h-60 rounded-2xl" />
    </div>

    <template v-else>
      <UCard class="border border-gray-200 bg-white shadow-sm">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="m-0 text-xs font-bold uppercase tracking-[0.18em] text-[#a83632]">Outreach</p>
            <h1 class="m-0 mt-2 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
              {{ outreach?.locationCovered || "Outreach reports" }}
            </h1>
            <p class="m-0 mt-2 text-sm text-gray-500">
              {{ displayDate(outreach?.date) }} / {{ outreach?.timeStarted || "-" }}
            </p>
          </div>
          <UButton class="bg-[#a83632] text-white hover:bg-[#922f2c]" @click="openReport">
            Add report
          </UButton>
        </div>
      </UCard>

      <UCard class="border border-gray-200 bg-white shadow-sm">
        <template #header>
          <div>
            <h2 class="m-0 text-base font-semibold text-gray-950">Reports</h2>
            <p class="m-0 mt-1 text-sm text-gray-500">{{ reports.length }} report{{ reports.length === 1 ? "" : "s" }} recorded.</p>
          </div>
        </template>

        <div v-if="!reports.length" class="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
          No reports recorded yet.
        </div>
        <div v-else class="space-y-2">
          <div v-for="report in reports" :key="report.id" class="rounded-xl border border-gray-200 p-3">
            <p class="m-0 text-sm font-semibold text-gray-950">{{ report.name }}</p>
            <p class="m-0 mt-1 text-xs text-gray-500">
              {{ displayValue(report.reportedForType) }} / {{ report.followupCount }} follow-up(s)
            </p>
            <div class="mt-2 flex flex-wrap gap-2 text-xs">
              <span class="rounded-full bg-green-50 px-2 py-1 text-green-700">Saved: {{ report.saved ? "Yes" : "No" }}</span>
              <span class="rounded-full bg-blue-50 px-2 py-1 text-blue-700">Filled: {{ report.filled ? "Yes" : "No" }}</span>
              <span class="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Healed: {{ report.healed ? "Yes" : "No" }}</span>
            </div>
          </div>
        </div>
      </UCard>
    </template>

    <UModal v-model:open="reportOpen">
      <template #content>
        <div class="modal-dark max-h-[88vh] w-[min(92vw,720px)] space-y-4 overflow-y-auto bg-gray-950 p-5 text-white">
          <h2 class="m-0 text-lg font-semibold text-white">Outreach report</h2>
          <UFormField label="Report for">
            <USelect
              :model-value="reportForm.reported_for_type === 'worker' ? 'myself' : reportForm.reported_for_member_id"
              :items="memberOptions"
              class="w-full"
              @update:model-value="chooseReportedFor"
            />
          </UFormField>
          <UFormField label="Name"><UInput v-model="reportForm.name" /></UFormField>
          <UFormField label="Age"><UInput v-model="reportForm.age" type="number" /></UFormField>
          <UFormField label="Home address"><UInput v-model="reportForm.home_address" /></UFormField>
          <UFormField label="Work address"><UInput v-model="reportForm.work_address" /></UFormField>
          <UFormField label="School"><UInput v-model="reportForm.school" /></UFormField>
          <UFormField label="Phone number"><UInput v-model="reportForm.phone_number" /></UFormField>
          <div class="grid gap-3 sm:grid-cols-3">
            <UCheckbox v-model="reportForm.saved" label="Saved" />
            <UCheckbox v-model="reportForm.filled" label="Filled" />
            <UCheckbox v-model="reportForm.healed" label="Healed" />
          </div>
          <UFormField label="Notes"><UTextarea v-model="reportForm.notes" /></UFormField>
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
