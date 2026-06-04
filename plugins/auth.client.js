export default defineNuxtPlugin(async () => {
  const auth = useAuthStore()

  auth.hydrateFromCookie()

  if (auth.token) {
    try {
      await auth.refreshWorker()
    } catch {
      auth.clearSession()
    }
  } else {
    auth.initialized = true
  }
})
