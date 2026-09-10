/**
 * Sadaat Travels — Service Worker
 *
 * Phase 1: Minimal service worker for PWA installability.
 * Future phases will add:
 *   - Offline caching strategies
 *   - Background sync
 *   - Push notification support
 */

const CACHE_NAME = 'sadaat-v1';

// Basic install — just claim clients
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network-first strategy (fallback to cache if offline)
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls — always go to network
  if (event.request.url.includes('/auth/v1/') || 
      event.request.url.includes('/rest/v1/') ||
      event.request.url.includes('/functions/v1/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline — try cache
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || new Response('Offline', { status: 503 });
        });
      })
  );
});
