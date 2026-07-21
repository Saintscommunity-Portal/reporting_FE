import { defineStore } from 'pinia'

const workerAuthCookieOptions = {
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 30,
  secure: import.meta.env.PROD,
  default: () => null,
}

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
      const tokenCookie = useCookie('reporting_worker_token', workerAuthCookieOptions)
      const workerCookie = useCookie('reporting_worker_user', workerAuthCookieOptions)

      this.token = tokenCookie.value
      this.worker = workerCookie.value
    },

    syncCookies() {
      const tokenCookie = useCookie('reporting_worker_token', workerAuthCookieOptions)
      const workerCookie = useCookie('reporting_worker_user', workerAuthCookieOptions)

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

    async forgotPassword(payload) {
      this.loading = true
      this.error = null

      try {
        const { request } = useWorkerApi()
        return await request('/forgot-password', {
          method: 'POST',
          body: payload,
        })
      } catch (error) {
        this.error = error?.data?.message || 'Unable to send password reset instructions.'
        throw error
      } finally {
        this.loading = false
      }
    },

    async resetPassword(payload) {
      this.loading = true
      this.error = null

      try {
        const { request } = useWorkerApi()
        return await request('/reset-password', {
          method: 'POST',
          body: payload,
        })
      } catch (error) {
        const errors = error?.data?.errors
        this.error = errors
          ? Object.values(errors).flat().join(' ')
          : error?.data?.message || 'Unable to reset your password.'
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

    async updateProfile(payload) {
      this.loading = true
      this.error = null

      try {
        const { request } = useWorkerApi()
        const response = await request('/profile', {
          method: 'PATCH',
          body: payload,
        })

        this.worker = response?.data || response
        this.syncCookies()

        return response
      } catch (error) {
        const errors = error?.data?.errors
        this.error = errors
          ? Object.values(errors).flat().join(' ')
          : error?.data?.message || 'Unable to update your profile.'
        throw error
      } finally {
        this.loading = false
      }
    },

    async updatePassword(payload) {
      this.loading = true
      this.error = null

      try {
        const { request } = useWorkerApi()
        return await request('/profile/password', {
          method: 'PATCH',
          body: payload,
        })
      } catch (error) {
        const errors = error?.data?.errors
        this.error = errors
          ? Object.values(errors).flat().join(' ')
          : error?.data?.message || 'Unable to update your password.'
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteAccount() {
      this.loading = true
      this.error = null

      try {
        const { request } = useWorkerApi()
        await request('/profile', { method: 'DELETE' })
      } finally {
        this.loading = false
        this.clearSession()
        await navigateTo('/login')
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
