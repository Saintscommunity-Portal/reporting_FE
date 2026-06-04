export function useApi() {
  const config = useRuntimeConfig()
  const auth = useAuthStore()

  async function request(path, options = {}) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`

    try {
      return await $fetch(normalizedPath, {
        baseURL: config.public.apiBase,
        ...options,
        headers: {
          Accept: 'application/json',
          ...(options.headers || {}),
          ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        },
      })
    } catch (error) {
      if (error?.statusCode === 401) {
        auth.clearSession()
      }

      throw error
    }
  }

  return {
    request,
  }
}
