/* ThaiMate Service Worker — 설치형 PWA (홈 화면에 추가)
   원칙: 앱 셸만 캐시. Supabase/CDN 등 외부 요청은 절대 건드리지 않음.
   네비게이션은 네트워크 우선(항상 최신) → 오프라인일 때만 캐시 폴백. */
const CACHE = 'thaimate-v2';
const SHELL = ['/', '/index.html', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest'];

/* 닫힌 앱/화면 꺼짐에서도 채팅 'mate' 알림 — 웹푸시 수신(소리는 폰 기본음, 진동 패턴 적용) */
self.addEventListener('push', function(e){
  var d={}; try{ d=e.data?e.data.json():{}; }catch(_){ try{ d={body:e.data.text()}; }catch(__){ d={}; } }
  var title=d.title||'ThaiMate 💬';
  var body=d.body||'ThaiMate · 새 메시지가 왔어요';
  e.waitUntil(self.registration.showNotification(title, {
    body: body, tag:'mate-chat', renotify:true,
    icon:'/icon-192.png', badge:'/icon-192.png',
    vibrate:[200,100,200,100,300], data:{ url:d.url||'/' }
  }));
});
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var url=(e.notification.data&&e.notification.data.url)||'/';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(function(cs){
    for(var i=0;i<cs.length;i++){ if('focus' in cs[i]){ cs[i].focus(); return; } }
    if(clients.openWindow) return clients.openWindow(url);
  }));
});

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
