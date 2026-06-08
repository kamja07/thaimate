// domain/push.js — Web Push 알림 구독 관리 (Phase 8)
import { sb, mutate } from '../core/db.js';
import { getSession } from '../core/auth.js';

const VAPID_PUBLIC = 'BJs4i-k2XGA1Ygm9egfcfp7IRCUyKBut7qE6zEN7v5apjS8fupMklfstbbMsM1XRf3A1A7XTOzz4YrlbjFh5608';

function urlBase64ToUint8Array(s) {
  const pad = '='.repeat((4 - s.length % 4) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getPushPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function subscribeToPush() {
  const session = getSession();
  if (!session) return { error: new Error('로그인 필요') };
  if (!isPushSupported()) return { error: new Error('이 브라우저는 푸시를 지원하지 않습니다') };
  if (Notification.permission === 'denied') return { error: new Error('알림 차단됨 — 브라우저 설정에서 허용 후 다시 시도') };
  if (Notification.permission !== 'granted') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return { error: new Error('알림 권한이 필요합니다') };
  }
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  // VAPID key mismatch 자동 처리 — 옛 키로 등록된 sub이면 unsubscribe 후 새로
  if (sub) {
    try {
      const currentKeyBuf = sub.options?.applicationServerKey;
      if (currentKeyBuf) {
        const bytes = new Uint8Array(currentKeyBuf);
        let bin = '';
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        const currentKey = btoa(bin).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        if (currentKey !== VAPID_PUBLIC) {
          await sub.unsubscribe();
          sub = null;
        }
      }
    } catch(_) {}
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC)
    });
  }
  const j = sub.toJSON();
  const { error } = await mutate(
    sb.from('push_subscriptions').upsert({
      user_id: session.user.id,
      endpoint: j.endpoint,
      p256dh: j.keys.p256dh,
      auth_key: j.keys.auth,
      user_agent: navigator.userAgent.substring(0, 200),
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,endpoint' }),
    { rlsMessage: '푸시 구독 저장 실패' }
  );
  if (error) return { error };
  return { data: { endpoint: j.endpoint } };
}

export async function unsubscribeFromPush() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    const endpoint = sub.endpoint;
    try { await sub.unsubscribe(); } catch(_) {}
    const session = getSession();
    if (session) {
      try { await sb.from('push_subscriptions').delete().eq('user_id', session.user.id).eq('endpoint', endpoint); } catch(_) {}
    }
  }
  return { data: { unsubscribed: true } };
}

export async function checkAndAutoSubscribe() {
  if (!isPushSupported()) return;
  if (Notification.permission === 'granted') {
    try { await subscribeToPush(); } catch(_) {}
  }
}
