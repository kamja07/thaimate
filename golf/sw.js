const VERSION = 'golfdong-v20-00-brand-self-leave-any';
const STATIC_CACHE = `${VERSION}-static`;
const STATIC_ASSETS = [
  './', './index.html', './manifest.json', './css/style.css',
  './js/main.js',
  './js/core/auth.js', './js/core/router.js', './js/core/render.js', './js/core/db.js', './js/core/ui-kit.js', './js/core/errors.js',
  './js/domain/users.js', './js/domain/clubs.js', './js/domain/events.js', './js/domain/awards.js',
  './js/views/auth.js', './js/views/home.js', './js/views/clubsList.js', './js/views/clubDetail.js', './js/views/eventDetail.js', './js/views/raffle.js', './js/views/clubApply.js', './js/views/clubAdmin.js', './js/views/activityForm.js', './js/views/myPage.js',
  '/js/domain/matches.js',
  '/js/views/matchesList.js',
  '/js/views/matchCreate.js',
  '/js/views/matchDetail.js', './js/views/memberList.js'
];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(STATIC_CACHE).then(c => c.addAll(STATIC_ASSETS).catch(()=>{}))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(resp => {
    if (resp.ok) { const c2 = resp.clone(); caches.open(STATIC_CACHE).then(c => c.put(e.request, c2)).catch(()=>{}); }
    return resp;
  }).catch(() => caches.match(e.request)));
});

// ─── Web Push (Phase 8) ───
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(_) {}
  const title = data.title || '골프동';
  const body = data.body || '새 메시지가 도착했습니다';
  const tag = data.tag || 'chat';
  const url = data.url || '/';
  // 앱 아이콘 카운터 배지 (받는 쪽 누적 unread)
  const unread = typeof data.unread === 'number' ? data.unread : 0;
  if (unread > 0 && 'setAppBadge' in self.navigator) {
    self.navigator.setAppBadge(unread).catch(() => {});
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body, tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url },
      vibrate: [200, 100, 200],
      silent: false,
      renotify: true,
      requireInteraction: false
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      for (const w of wins) {
        if (w.url.includes(self.location.origin) && 'focus' in w) {
          try { if (url && url !== '/') w.navigate(self.location.origin + url); } catch(_) {}
          return w.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
