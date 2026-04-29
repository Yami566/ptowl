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

const SW_VERSION = 'ptowl-v1-2026.04.25';

self.addEventListener('install', (event) => {
  // Activate immediately on install — no waiting period for the new SW.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  // Take control of any already-open ptowl.com tabs.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pure passthrough. No cache, no offline shell, no fancy strategies.
  // Cloudflare Pages handles caching at the edge already.
  event.respondWith(fetch(event.request));
});

// Listen for explicit version-check pings from the page (used by deploy
// notifications in the future to surface "new version available" toasts).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'VERSION') {
    event.ports[0]?.postMessage({ version: SW_VERSION });
  }
});
