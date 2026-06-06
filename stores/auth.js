import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null,
    worker: null,
    loading: false,
    error: null,
    initialized: false,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    workerName: (state) => {
      const profile = state.worker?.worker
      const profileName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()

      return profileName || state.worker?.name || state.worker?.email || 'Worker'
    },
    workerInitials() {
      const name = this.workerName.trim()

      if (!name) return 'WK'

      return name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('')
    },
  },

  actions: {
    hydrateFromCookie() {
      const tokenCookie = useCookie('reporting_worker_token', {
        sameSite: 'lax',
        default: () => null,
      })
      const workerCookie = useCookie('reporting_worker_user', {
        sameSite: 'lax',
        default: () => null,
      })

      this.token = tokenCookie.value
      this.worker = workerCookie.value
    },

    syncCookies() {
      const tokenCookie = useCookie('reporting_worker_token', {
        sameSite: 'lax',
        default: () => null,
      })
      const workerCookie = useCookie('reporting_worker_user', {
        sameSite: 'lax',
        default: () => null,
      })

      tokenCookie.value = this.token
      workerCookie.value = this.worker
    },

    async login(credentials) {
      this.loading = true
      this.error = null

      try {
        const { request } = useWorkerApi()
        const response = await request('/login', {
          method: 'POST',
          body: credentials,
        })

        this.token = response?.token || null
        this.worker = response?.user || null
        this.syncCookies()

        await this.refreshWorker()

        return response
      } catch (error) {
        this.error = error?.data?.message || 'Unable to sign in with those credentials.'
        throw error
      } finally {
        this.loading = false
      }
    },

    async refreshWorker() {
      if (!this.token) {
        this.initialized = true
        return null
      }

      this.loading = true
      this.error = null

      try {
        const { request } = useWorkerApi()
        const response = await request('/me')

        this.worker = response
        this.syncCookies()
        this.initialized = true

        return response
      } catch (error) {
        if (error?.statusCode === 401) {
          this.clearSession()
        }

        this.error = error?.data?.message || 'Unable to refresh your session.'
        this.initialized = true
        throw error
      } finally {
        this.loading = false
      }
    },

    async logout() {
      try {
        if (this.token) {
          const { request } = useWorkerApi()
          await request('/logout', { method: 'POST' })
        }
      } finally {
        this.clearSession()
        await navigateTo('/login')
      }
    },

    clearSession() {
      this.token = null
      this.worker = null
      this.initialized = true
      this.syncCookies()
    },
  },
})
