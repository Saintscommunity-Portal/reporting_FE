export function useWorkerApi() {
  const { request } = useApi()

  function workerRequest(path, options = {}) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`

    return request(`/worker${normalizedPath}`, options)
  }

  return {
    request: workerRequest,
  }
}
