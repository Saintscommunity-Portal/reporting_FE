export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore()

  auth.hydrateFromCookie()

  if (!auth.isAuthenticated) {
    return navigateTo('/login')
  }

  if (!auth.worker) {
    try {
      await auth.refreshWorker()
    } catch {
      return navigateTo('/login')
    }
  }
})
