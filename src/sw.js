console.log('service-worker.js')

// advanced config for injectManifest approach
importScripts(
  'https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js',
)

// Detailed logging is very useful during development
workbox.setConfig({
  debug: false,
})

// Updating SW lifecycle to update the app after user triggered refresh
self.skipWaiting()
workbox.core.clientsClaim()
workbox.precaching.cleanupOutdatedCaches()

workbox.routing.registerRoute(
  ({ request, url }) => request.mode === 'navigate' && url.origin === self.location.origin,
  new workbox.strategies.NetworkFirst({
    cacheName: 'pages',
  })
)

workbox.routing.registerRoute(
  ({ url }) => url.origin === self.location.origin,
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'app-assets',
  })
)


workbox.routing.registerRoute(
  /https:\/\/code\.responsivevoice\.org/,
  new workbox.strategies.CacheFirst(),
)

workbox.routing.registerRoute(
  'https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js',
  new workbox.strategies.CacheFirst()
)

workbox.precaching.precacheAndRoute(self.__WB_MANIFEST)
