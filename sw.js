/* ThaiMate Service Worker — 설치형 PWA (홈 화면에 추가)
   원칙: 앱 셸만 캐시. Supabase/CDN 등 외부 요청은 절대 건드리지 않음.
   네비게이션은 네트워크 우선(항상 최신) → 오프라인일 때만 캐시 폴백. */
const CACHE = 'thaimate-v1';
const SHELL = ['/', '/index.html', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  // 외부 출처(Supabase, jsdelivr 등)는 통과 — 캐시/가로채기 안 함
  if (url.origin !== self.location.origin) return;

  // 페이지 진입: 네트워크 우선, 실패 시 캐시 셸로 폴백
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put('/', cp)).catch(() => {}); return res; })
        .catch(() => caches.match('/').then(r => r || caches.match('/index.html')))
    );
    return;
  }

  // 동일 출처 정적 자원: 캐시 우선, 없으면 네트워크 후 캐시
  e.respondWith(
    caches.match(req).then(c => c || fetch(req).then(res => {
      if (res && res.status === 200 && res.type === 'basic') {
        const cp = res.clone();
        caches.open(CACHE).then(cc => cc.put(req, cp)).catch(() => {});
      }
      return res;
    }))
  );
});
