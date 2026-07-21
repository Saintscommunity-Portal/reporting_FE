<script setup>
definePageMeta({ layout: "app", middleware: "auth" });

const route = useRoute();
const router = useRouter();
const { request } = useWorkerApi();

const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const followup = ref(null);
const reports = ref([]);
const reportOpen = ref(false);
const confirmOpen = ref(false);
const editingReportId = ref(null);
const deleteTarget = ref(null);
const suppressTargetTypeWatch = ref(false);
const targetOptions = ref([]);
const targetSearch = ref("");

const reportForm = reactive({
  target_type: "member",
  followup_member_id: null,
  followup_outreach_report_id: null,
  material_used: "",
  teaching_note: "",
  activity_type: "followup",
  response_or_questions: "",
  time_spent: 15,
});

const activityOptions = [
  "teaching",
  "prayer",
  "followup",
  "outreach",
  "holyghost_meeting",
].map((value) => ({ label: displayValue(value), value }));
const targetTypeOptions = [
  { label: "Disciple", value: "member" },
  { label: "New Convert", value: "outreach_report" },
];

function displayValue(value) {
  if (!value) return "-";
  return String(value).replace(/_/g, " ");
}

function displayDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function goBack() {
  if (window.history.length > 1) {
    router.back();
    return;
  }

  navigateTo("/followups");
}

async function fetchFollowup() {
  const response = await request(`/followups/${route.params.id}`, {
    method: "GET",
  });
  followup.value = response?.data || null;
}

async function fetchReports() {
  const response = await request(`/followups/${route.params.id}/reports`, {
    method: "GET",
    query: { per_page: 100 },
  });
  reports.value = response?.data || [];
}

async function refresh() {
  loading.value = true;
  errorMessage.value = "";

  try {
    await Promise.all([fetchFollowup(), fetchReports()]);
  } catch (error) {
    errorMessage.value =
      error?.data?.message ||
      error?.message ||
      "Unable to load follow up reports.";
  } finally {
    loading.value = false;
  }
}

async function searchTargets() {
  const response = await request("/followup-targets/search", {
    method: "GET",
    query: { type: reportForm.target_type, q: targetSearch.value },
  });
  targetOptions.value = (response?.data || []).map((item) => ({
    label: `${item.name}${item.phone || item.phone_number ? ` / ${item.phone || item.phone_number}` : ""}`,
    value: item.id,
  }));
}

async function openReport() {
  editingReportId.value = null;
  reportForm.target_type = "member";
  reportForm.followup_member_id = null;
  reportForm.followup_outreach_report_id = null;
  reportForm.material_used = "";
  reportForm.teaching_note = "";
  reportForm.activity_type = "followup";
  reportForm.response_or_questions = "";
  reportForm.time_spent = 15;
  targetSearch.value = "";
  reportOpen.value = true;
  await searchTargets();
}

async function openEditReport(report) {
  editingReportId.value = report.id;
  suppressTargetTypeWatch.value = true;
  try {
    reportForm.target_type =
      report.targetType ||
      (report.followupMemberId ? "member" : "outreach_report");
    reportForm.followup_member_id = report.followupMemberId || null;
    reportForm.followup_outreach_report_id =
      report.followupOutreachReportId || null;
    reportForm.material_used = report.materialUsed || "";
    reportForm.teaching_note = report.teachingNote || "";
    reportForm.activity_type = report.activityType || "followup";
    reportForm.response_or_questions = report.responseOrQuestions || "";
    reportForm.time_spent = report.timeSpent || 15;
    targetSearch.value = report.targetName || "";
    reportOpen.value = true;
    await searchTargets();
    const selectedTargetId =
      reportForm.followup_member_id || reportForm.followup_outreach_report_id;
    if (
      selectedTargetId &&
      !targetOptions.value.some((item) => item.value === selectedTargetId)
    ) {
      targetOptions.value.unshift({
        label: `${report.targetName || "Selected target"}${report.targetPhone ? ` / ${report.targetPhone}` : ""}`,
        value: selectedTargetId,
      });
    }
  } finally {
    suppressTargetTypeWatch.value = false;
  }
}

function selectTarget(value) {
  if (reportForm.target_type === "member") {
    reportForm.followup_member_id = value;
    reportForm.followup_outreach_report_id = null;
  } else {
    reportForm.followup_member_id = null;
    reportForm.followup_outreach_report_id = value;
  }
}

async function saveReport() {
  saving.value = true;
  errorMessage.value = "";

  try {
    const path = editingReportId.value
      ? `/followup-reports/${editingReportId.value}`
      : `/followups/${route.params.id}/reports`;
    const method = editingReportId.value ? "PATCH" : "POST";
    await request(path, { method, body: { ...reportForm } });
    reportOpen.value = false;
    editingReportId.value = null;
    await fetchReports();
  } catch (error) {
    errorMessage.value =
      error?.data?.message ||
      error?.message ||
      "Unable to save follow up report.";
  } finally {
    saving.value = false;
  }
}

function askDeleteReport(report) {
  deleteTarget.value = {
    id: report.id,
    label: report.targetName || "this report",
  };
  confirmOpen.value = true;
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  saving.value = true;

  try {
    await request(`/followup-reports/${deleteTarget.value.id}`, {
      method: "DELETE",
    });
    confirmOpen.value = false;
    deleteTarget.value = null;
    await fetchReports();
  } catch (error) {
    errorMessage.value =
      error?.data?.message || error?.message || "Unable to delete report.";
  } finally {
    saving.value = false;
  }
}

watch(
  () => reportForm.target_type,
  async () => {
    if (suppressTargetTypeWatch.value) return;
    reportForm.followup_member_id = null;
    reportForm.followup_outreach_report_id = null;
    await searchTargets();
  },
);

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

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      :title="errorMessage"
    />

    <div v-if="loading" class="space-y-4">
      <USkeleton class="h-28 rounded-2xl" />
      <USkeleton class="h-60 rounded-2xl" />
    </div>

    <template v-else>
      <UCard class="border border-gray-200 bg-white shadow-sm">
        <div
          class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div>
            <p
              class="m-0 text-xs font-bold uppercase tracking-[0.18em] text-[#a83632]"
            >
              Follow ups
            </p>
            <h1
              class="m-0 mt-2 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl"
            >
              Follow up reports
            </h1>
            <p class="m-0 mt-2 text-sm text-gray-500">
              {{ displayDate(followup?.timeFrom) }} to
              {{ displayDate(followup?.timeTo) }}
            </p>
          </div>
          <UButton
            class="bg-[#a83632] text-white hover:bg-[#922f2c]"
            @click="openReport"
          >
            Add report
          </UButton>
        </div>
      </UCard>

      <UCard class="border border-gray-200 bg-white shadow-sm">
        <template #header>
          <div>
            <h2 class="m-0 text-base font-semibold text-gray-950">Reports</h2>
            <p class="m-0 mt-1 text-sm text-gray-500">
              {{ reports.length }} report{{ reports.length === 1 ? "" : "s" }}
              recorded.
            </p>
          </div>
        </template>

        <div
          v-if="!reports.length"
          class="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500"
        >
          No reports recorded yet.
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="report in reports"
            :key="report.id"
            class="rounded-xl border border-gray-200 p-3"
          >
            <div
              class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div>
                <p class="m-0 text-sm font-semibold text-gray-950">
                  {{ report.targetName }}
                </p>
                <p class="m-0 mt-1 text-xs text-gray-500">
                  {{ displayValue(report.activityType) }} /
                  {{ report.timeSpent }} mins
                </p>
              </div>
              <div class="flex shrink-0 flex-wrap gap-2">
                <UButton
                  size="sm"
                  color="neutral"
                  variant="outline"
                  @click="openEditReport(report)"
                  >Edit</UButton
                >
                <UButton
                  size="sm"
                  color="error"
                  variant="soft"
                  @click="askDeleteReport(report)"
                  >Delete</UButton
                >
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </template>

    <UModal v-model:open="reportOpen">
      <template #content>
        <div
          class="modal-dark max-h-[88vh] w-[min(92vw,720px)] space-y-4 overflow-y-auto bg-gray-950 p-5 text-white"
        >
          <h2 class="m-0 text-lg font-semibold text-white">
            {{
              editingReportId ? "Update follow up report" : "Follow up report"
            }}
          </h2>
          <UFormField label="This person is a?"
            ><USelect
              v-model="reportForm.target_type"
              :items="targetTypeOptions"
              class="w-full"
          /></UFormField>
          <UFormField label="Search for person by name"
            ><UInput
              v-model="targetSearch"
              class="w-full"
              @input="searchTargets"
          /></UFormField>
          <UFormField label="who did you follow up on?">
            <USelect
              :model-value="
                reportForm.followup_member_id ||
                reportForm.followup_outreach_report_id
              "
              :items="targetOptions"
              class="w-full"
              @update:model-value="selectTarget"
            />
          </UFormField>
          <UFormField label="what did you do with this person?"
            ><USelect
              v-model="reportForm.activity_type"
              :items="activityOptions"
              class="w-full"
          /></UFormField>
          <UFormField label="how long did you spend"
            ><UInput
              v-model="reportForm.time_spent"
              type="number"
              class="w-full"
          /></UFormField>
          <UFormField label="what material did you use, if you taught?"
            ><UTextarea v-model="reportForm.material_used" class="w-full"
          /></UFormField>
          <UFormField label="Teaching note"
            ><UTextarea v-model="reportForm.teaching_note" class="w-full"
          /></UFormField>
          <UFormField label="Response/questions"
            ><UTextarea
              v-model="reportForm.response_or_questions"
              class="w-full"
          /></UFormField>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              @click="reportOpen = false"
              >Cancel</UButton
            >
            <UButton
              class="bg-[#a83632] text-white hover:bg-[#922f2c]"
              :loading="saving"
              @click="saveReport"
              >{{ editingReportId ? "Update" : "Save" }}</UButton
            >
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="confirmOpen">
      <template #content>
        <div class="modal-dark space-y-4 bg-gray-950 p-5 text-white">
          <div>
            <h2 class="m-0 text-lg font-semibold text-white">Delete report</h2>
            <p class="m-0 mt-2 text-sm text-gray-300">
              This will permanently remove
              {{ deleteTarget?.label || "this report" }} from your follow up
              records.
            </p>
          </div>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              @click="confirmOpen = false"
              >Cancel</UButton
            >
            <UButton color="error" :loading="saving" @click="confirmDelete"
              >Delete</UButton
            >
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
