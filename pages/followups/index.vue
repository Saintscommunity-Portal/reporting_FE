<script setup>
definePageMeta({ layout: "app", middleware: "auth" });

const { request } = useWorkerApi();

const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const followups = ref([]);
const followupOpen = ref(false);
const confirmOpen = ref(false);
const editingFollowupId = ref(null);
const deleteTarget = ref(null);
const meta = ref({ current_page: 1, last_page: 1, total: 0, per_page: 10 });
const filters = reactive({ from_date: "", to_date: "" });
const followupForm = reactive({ time_from: "", time_to: "" });

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

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

async function fetchFollowups(page = 1) {
  loading.value = true;
  errorMessage.value = "";
  try {
    const query = { page, per_page: meta.value.per_page || 10 };
    if (filters.from_date) query.from_date = filters.from_date;
    if (filters.to_date) query.to_date = filters.to_date;
    const response = await request("/followups", { method: "GET", query });
    followups.value = response?.data || [];
    meta.value = { ...meta.value, ...(response?.meta || {}) };
  } catch (error) {
    errorMessage.value =
      error?.data?.message || error?.message || "Unable to load follow ups.";
  } finally {
    loading.value = false;
  }
}

function openCreateFollowup() {
  editingFollowupId.value = null;
  followupForm.time_from = "";
  followupForm.time_to = "";
  followupOpen.value = true;
}

function openEditFollowup(followup) {
  editingFollowupId.value = followup.id;
  followupForm.time_from = toDateTimeLocal(followup.timeFrom);
  followupForm.time_to = toDateTimeLocal(followup.timeTo);
  followupOpen.value = true;
}

async function saveFollowup() {
  saving.value = true;
  try {
    const activeEditId = editingFollowupId.value;
    const path = editingFollowupId.value
      ? `/followups/${editingFollowupId.value}`
      : "/followups";
    const method = editingFollowupId.value ? "PATCH" : "POST";
    await request(path, { method, body: { ...followupForm } });
    followupOpen.value = false;
    await fetchFollowups(meta.value.current_page || 1);
    editingFollowupId.value = null;
  } catch (error) {
    errorMessage.value =
      error?.data?.message || error?.message || "Unable to save follow up.";
  } finally {
    saving.value = false;
  }
}

function askDeleteFollowup(followup) {
  deleteTarget.value = {
    type: "followup",
    id: followup.id,
    label: displayDate(followup.timeFrom),
  };
  confirmOpen.value = true;
}

function viewReports(followup) {
  if (!followup?.id) return;
  navigateTo(`/followups/${followup.id}`);
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  saving.value = true;
  try {
    if (deleteTarget.value.type === "followup") {
      await request(`/followups/${deleteTarget.value.id}`, {
        method: "DELETE",
      });
      await fetchFollowups(meta.value.current_page || 1);
    }
    confirmOpen.value = false;
    deleteTarget.value = null;
  } catch (error) {
    errorMessage.value =
      error?.data?.message || error?.message || "Unable to delete item.";
  } finally {
    saving.value = false;
  }
}

onMounted(fetchFollowups);
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
          Follow ups
        </p>
        <h1
          class="m-0 mt-2 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl"
        >
          Follow up reports
        </h1>
        <p class="m-0 mt-2 text-sm text-gray-500">
          Create follow up activities and report member or outreach follow ups.
        </p>
      </div>
      <UButton
        class="bg-[#a83632] text-white hover:bg-[#922f2c]"
        @click="openCreateFollowup"
        >Add new follow up activity</UButton
      >
    </div>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      :title="errorMessage"
    />

    <div class="space-y-3">
      <div class="space-y-3">
        <USkeleton
          v-if="loading"
          v-for="item in 4"
          :key="item"
          class="h-24 rounded-2xl"
        />
        <UCard
          v-for="followup in followups"
          v-else
          :key="followup.id"
          class="border border-gray-200 bg-white shadow-sm"
        >
          <div
            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 class="m-0 text-base font-semibold text-gray-950">
                {{ displayDate(followup.timeFrom) }}
              </h2>
              <p class="m-0 mt-1 text-sm text-gray-500">
                {{ displayDate(followup.timeTo) }} /
                {{ followup.reportCount || 0 }} report(s)
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <UButton
                color="neutral"
                variant="outline"
                @click="viewReports(followup)"
                >View reports</UButton
              >
              <UButton
                color="neutral"
                variant="outline"
                @click="openEditFollowup(followup)"
                >Edit</UButton
              >
              <UButton
                color="error"
                variant="soft"
                @click="askDeleteFollowup(followup)"
                >Delete</UButton
              >
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <UModal v-model:open="followupOpen">
      <template #content>
        <div class="modal-dark space-y-4 bg-gray-950 p-5 text-white">
          <h2 class="m-0 text-lg font-semibold text-white">
            {{ editingFollowupId ? "Update follow up" : "New follow up" }}
          </h2>
          <UFormField label="From"
            ><UInput v-model="followupForm.time_from" type="datetime-local"
          /></UFormField>
          <UFormField label="To"
            ><UInput v-model="followupForm.time_to" type="datetime-local"
          /></UFormField>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              @click="followupOpen = false"
              >Cancel</UButton
            >
            <UButton
              class="bg-[#a83632] text-white hover:bg-[#922f2c]"
              :loading="saving"
              @click="saveFollowup"
              >{{ editingFollowupId ? "Update" : "Save" }}</UButton
            >
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="confirmOpen">
      <template #content>
        <div class="modal-dark space-y-4 bg-gray-950 p-5 text-white">
          <div>
            <h2 class="m-0 text-lg font-semibold text-white">
              Delete
              {{ deleteTarget?.type === "followup" ? "follow up" : "report" }}
            </h2>
            <p class="m-0 mt-2 text-sm text-gray-300">
              This will permanently remove
              {{ deleteTarget?.label || "this item" }} from your follow up
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
