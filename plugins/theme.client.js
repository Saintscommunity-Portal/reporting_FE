export default defineNuxtPlugin(() => {
  const stored = window.localStorage.getItem('reporting_theme_mode')
  const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  const mode = stored || preferred

  document.documentElement.classList.toggle('dark', mode === 'dark')
  document.documentElement.style.colorScheme = mode
})
