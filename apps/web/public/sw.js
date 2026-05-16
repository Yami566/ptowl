/**
 * PTowl service worker — minimal, install-only.
 *
 * Browser installability rules require the page to register a service
 * worker with a fetch handler. This file fulfills that requirement
 * with the simplest possible passthrough implementation: every fetch
 * goes straight to the network. We do NOT cache HTML/CSS/JS here —
 * Cloudflare Pages already handles edge caching, and rolling our own
 * cache layer would risk shipping stale code on deploys.
 *
 * What this enables:
 *   - "Add to Home Screen" on iOS Safari + Android Chrome (PWA install).
 *   - Web Push capability (future iteration).
 *
 * What this does NOT do:
 *   - Offline mode. Adding offline support means making explicit
 *     decisions about which routes work offline (the schedule view?
 *     the calendar feed?) and how to invalidate cached app shell on
 *     deploy. That's a separate, larger piece of work.
 *   - Background sync, periodic sync, or Notifications API integration.
 */

const SW_VERSION = 'ptowl-v2-2026.05.16-same-origin-only';

self.addEventListener('install', (event) => {
  // Activate immediately on install — no waiting period for the new SW.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  // Take control of any already-open ptowl.com tabs.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Only intercept same-origin requests. Cross-origin requests
  // (fonts.gstatic.com, cloudflareinsights.com, clerk.ptowl.com, etc.)
  // pass through the browser's normal network stack untouched.
  //
  // Why this matters: Firefox in particular rejects when a
  // ServiceWorker proxies a cross-origin fetch that the browser then
  // can't resolve due to CORS interaction. Symptom surfaced by
  // scripts/e2e-auth.mjs on 2026-05-16:
  //   "A ServiceWorker passed a promise to FetchEvent.respondWith()
  //    that rejected with TypeError: NetworkError when attempting to
  //    fetch resource"
  //
  // The pre-fix all-paths handler broke Google Fonts loading on
  // Firefox + WebKit. Scoping to same-origin preserves PWA
  // installability (the registered fetch handler still exists) while
  // letting the browser handle third-party assets natively.
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request));
});

// Listen for explicit version-check pings from the page (used by deploy
// notifications in the future to surface "new version available" toasts).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'VERSION') {
    event.ports[0]?.postMessage({ version: SW_VERSION });
  }
});
