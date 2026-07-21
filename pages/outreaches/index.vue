<script setup>
definePageMeta({ layout: "app", middleware: "auth" });

const { request } = useWorkerApi();

const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const outreaches = ref([]);
const members = ref([]);
const outreachOpen = ref(false);
const meta = ref({ current_page: 1, last_page: 1, total: 0, per_page: 10 });
const filters = reactive({ from_date: "", to_date: "" });
const outreachForm = reactive({
  date: "",
  time_started: "",
  location_covered: "",
  member_id: null,
});
const hasPreviousPage = computed(
  () => Number(meta.value.current_page || 1) > 1,
);
const hasNextPage = computed(
  () =>
    Number(meta.value.current_page || 1) < Number(meta.value.last_page || 1),
);

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value).replace(/_/g, " ");
}

function displayDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

async function fetchOutreaches(page = 1) {
  loading.value = true;
  errorMessage.value = "";
  try {
    const query = { page, per_page: meta.value.per_page || 10 };
    if (filters.from_date) query.from_date = filters.from_date;
    if (filters.to_date) query.to_date = filters.to_date;
    const response = await request("/outreaches", { method: "GET", query });
    outreaches.value = response?.data || [];
    meta.value = { ...meta.value, ...(response?.meta || {}) };
  } catch (error) {
    errorMessage.value =
      error?.data?.message || error?.message || "Unable to load outreaches.";
  } finally {
    loading.value = false;
  }
}

async function fetchMembers() {
  const response = await request("/members", {
    method: "GET",
    query: { per_page: 500 },
  });
  members.value = response?.data || [];
}

function openCreateOutreach() {
  outreachForm.date = "";
  outreachForm.time_started = "";
  outreachForm.location_covered = "";
  outreachForm.member_id = null;
  outreachOpen.value = true;
}

async function saveOutreach() {
  saving.value = true;
  errorMessage.value = "";
  try {
    await request("/outreaches", { method: "POST", body: { ...outreachForm } });
    outreachOpen.value = false;
    await fetchOutreaches();
  } catch (error) {
    errorMessage.value =
      error?.data?.message || error?.message || "Unable to save outreach.";
  } finally {
    saving.value = false;
  }
}

function viewReports(outreach) {
  if (!outreach?.id) return;
  navigateTo(`/outreaches/${outreach.id}`);
}

onMounted(async () => {
  await Promise.all([fetchOutreaches(), fetchMembers()]);
});
</script>

<template>
  <section class="space-y-5">
    <div
      class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p
          class="m-0 text-xs font-bold uppercase tracking-[0.18em] text-[#a83632]"
        >
          Outreach
        </p>
        <h1
          class="m-0 mt-2 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl"
        >
          Outreach reports
        </h1>
        <p class="m-0 mt-2 text-sm text-gray-500">
          Create outreach activities and record people reached out to
        </p>
      </div>
      <UButton
        icon="i-heroicons-plus-20-solid"
        class="bg-[#a83632] text-white hover:bg-[#922f2c]"
        @click="openCreateOutreach"
        >Add new outreach activity</UButton
      >
    </div>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      :title="errorMessage"
    />

    <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div class="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <UFormField label="From"
          ><UInput v-model="filters.from_date" type="date"
        /></UFormField>
        <UFormField label="To"
          ><UInput v-model="filters.to_date" type="date"
        /></UFormField>
        <UButton
          class="bg-[#a83632] text-white hover:bg-[#922f2c]"
          @click="fetchOutreaches(1)"
          >Apply</UButton
        >
      </div>
    </div>

    <div class="space-y-3">
      <div class="space-y-3">
        <USkeleton
          v-if="loading"
          v-for="item in 4"
          :key="item"
          class="h-24 rounded-2xl"
        />
        <UCard
          v-for="outreach in outreaches"
          v-else
          :key="outreach.id"
          class="border border-gray-200 bg-white shadow-sm"
        >
          <div
            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 class="m-0 text-base font-semibold text-gray-950">
                {{ outreach.locationCovered }}
              </h2>
              <p class="m-0 mt-1 text-sm text-gray-500">
                {{ displayDate(outreach.date) }} / {{ outreach.timeStarted }}
              </p>
              <p class="m-0 mt-1 text-xs text-gray-500">
                {{ outreach.reportCount || 0 }} report{{
                  Number(outreach.reportCount || 0) === 1 ? "" : "s"
                }}
              </p>
            </div>
            <UButton
              color="neutral"
              variant="outline"
              @click="viewReports(outreach)"
              >View reports</UButton
            >
          </div>
        </UCard>
      </div>
    </div>

    <UModal v-model:open="outreachOpen">
      <template #content>
        <div class="modal-dark space-y-4 bg-gray-950 p-5 text-white">
          <h2 class="m-0 text-lg font-semibold text-white">New outreach</h2>
          <UFormField label="Date"
            ><UInput v-model="outreachForm.date" type="date"
          /></UFormField>
          <UFormField label="Time started"
            ><UInput v-model="outreachForm.time_started" type="time"
          /></UFormField>
          <UFormField label="Location covered"
            ><UInput v-model="outreachForm.location_covered"
          /></UFormField>
          <UFormField label="Recorded for member (optional)">
            <USelect
              v-model="outreachForm.member_id"
              :items="
                members.map((member) => ({
                  label: member.fullName || member.full_name,
                  value: member.id,
                }))
              "
            />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              @click="outreachOpen = false"
              >Cancel</UButton
            >
            <UButton
              class="bg-[#a83632] text-white hover:bg-[#922f2c]"
              :loading="saving"
              @click="saveOutreach"
              >Save</UButton
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
