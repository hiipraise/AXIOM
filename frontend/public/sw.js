// AXIOM Push Notification Service Worker
// Handles incoming push events and notification clicks.

var CACHE_NAME = 'axiom-push-v1'

// ── Install: activate immediately ──────────────────────────────────────────
self.addEventListener('install', function () {
  self.skipWaiting()
})

// ── Activate: claim clients and clean old caches ──────────────────────────
self.addEventListener('activate', function (event) {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(function (keys) {
        return Promise.all(
          keys.filter(function (k) { return k !== CACHE_NAME }).map(function (k) { return caches.delete(k) })
        )
      }),
    ])
  )
})

// ── Push event: show notification ─────────────────────────────────────────
self.addEventListener('push', function (event) {
  if (!event.data) return

  var data

  try {
    data = event.data.json()
  } catch (_) {
    data = { title: 'AXIOM', body: event.data.text() }
  }

  var title = data.title || 'AXIOM'
  var options = {
    body: data.body || '',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || 'axiom-notification',
    renotify: data.renotify || false,
    vibrate: [200, 100, 200],
    requireInteraction: false,
    silent: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ── Notification click: open app or navigate to link ──────────────────────
self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  var url = '/'

  try {
    url = event.notification.tag && event.notification.tag.indexOf('http') === 0
      ? event.notification.tag
      : '/'
  } catch (_) {
    url = '/'
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i]
        if (client.url.indexOf(self.location.origin) === 0 && 'focus' in client) {
          client.focus()
          if (client.navigate) {
            client.navigate(url)
          }
          return
        }
      }
      clients.openWindow(url)
    })
  )
})
