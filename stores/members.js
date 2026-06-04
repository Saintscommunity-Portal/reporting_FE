import { defineStore } from 'pinia'

export const useMembersStore = defineStore('members', {
  state: () => ({
    members: [],
    selectedMember: null,
    meta: {
      current_page: 1,
      from: 0,
      last_page: 1,
      per_page: 10,
      to: 0,
      total: 0,
    },
    loading: false,
    saving: false,
    error: null,
  }),

  actions: {
    async fetchMembers(params = {}) {
      this.loading = true
      this.error = null

      try {
        const { request } = useWorkerApi()
        const response = await request('/members', {
          method: 'GET',
          query: params,
        })

        this.members = Array.isArray(response?.data) ? response.data : []
        this.meta = {
          ...this.meta,
          ...(response?.meta || {}),
        }

        return response
      } catch (error) {
        this.members = []
        this.error = error?.data?.message || error?.message || 'Unable to load members.'
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchMember(id) {
      this.loading = true
      this.error = null

      try {
        const { request } = useWorkerApi()
        const response = await request(`/members/${id}`)
        const member = response?.data || response

        this.selectedMember = member

        return member
      } catch (error) {
        this.error = error?.data?.message || error?.message || 'Unable to load member.'
        throw error
      } finally {
        this.loading = false
      }
    },

    async createMember(payload) {
      this.saving = true
      this.error = null

      try {
        const { request } = useWorkerApi()
        const response = await request('/members', {
          method: 'POST',
          body: payload,
        })

        return response?.data || response
      } catch (error) {
        this.error = error?.data?.message || error?.message || 'Unable to create member.'
        throw error
      } finally {
        this.saving = false
      }
    },

    async updateMember(id, payload) {
      this.saving = true
      this.error = null

      try {
        const { request } = useWorkerApi()
        const response = await request(`/members/${id}`, {
          method: 'PATCH',
          body: payload,
        })
        const member = response?.data || response

        this.selectedMember = member

        return member
      } catch (error) {
        this.error = error?.data?.message || error?.message || 'Unable to update member.'
        throw error
      } finally {
        this.saving = false
      }
    },
  },
})
