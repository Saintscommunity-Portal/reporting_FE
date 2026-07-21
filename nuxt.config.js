export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  ssr: false,
  devtools: { enabled: true },

  modules: ["@nuxt/ui", "@pinia/nuxt", "@vite-pwa/nuxt"],

  css: ["~/assets/css/main.css"],

  runtimeConfig: {
    public: {
      apiBase:
        process.env.API_BASE ||
        //      "https://analyticsbe-production.up.railway.app/api/v1",
        "http://127.0.0.1:8000/api/v1",
    },
  },

  app: {
    head: {
      title: "Saints Community Church",
      meta: [
        { name: "theme-color", content: "#a83632" },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "default" },
        {
          name: "apple-mobile-web-app-title",
          content: "Saints Community Church",
        },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1, viewport-fit=cover",
        },
      ],
      link: [
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
        { rel: "icon", type: "image/png", sizes: "192x192", href: "/icons/icon-192.png" },
        { rel: "icon", type: "image/png", sizes: "512x512", href: "/icons/icon-512.png" },
      ],
    },
  },

  pwa: {
    registerType: "autoUpdate",
    workbox: {
      navigateFallback: "/",
      cleanupOutdatedCaches: true,
      globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
      runtimeCaching: [
        {
          urlPattern: ({ url }) => url.origin === self.location.origin,
          handler: "NetworkFirst",
          options: {
            cacheName: "scc-reporting-app-shell",
            expiration: {
              maxEntries: 80,
              maxAgeSeconds: 60 * 60 * 24 * 7,
            },
          },
        },
      ],
    },
    manifest: {
      name: "Saints Community Church",
      short_name: "SCC",
      description: "Mobile reporting app for Saints Community Church workers",
      theme_color: "#a83632",
      background_color: "#ffffff",
      display: "standalone",
      orientation: "portrait",
      start_url: "/",
      scope: "/",
      icons: [
        {
          src: "/icons/icon-192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "/icons/icon-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
  },
});
