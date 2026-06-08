// core/auth.js — Session management
// CRITICAL: bypasses sb.auth.getSession() which deadlocks via LockManager
// Instead reads localStorage directly. sb client auto-loads JWT for sb.from() calls.

import { sb } from './db.js';

// EMBED: read ThaiMate's session key (same-origin localStorage is shared).
const STORAGE_KEY = 'sb-jhtsncdeoulanvytfwrl-auth-token';
let _session = null;
let _profile = null;
const _listeners = [];

export function getSession() { return _session; }
export function getProfile() { return _profile; }
export function isLoggedIn() { return !!_session; }
export function onAuthChange(fn) { _listeners.push(fn); return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1); }; }
function emit() { _listeners.forEach(fn => { try { fn(_session, _profile); } catch(e) { console.warn('auth listener err', e); } }); }

// Read session from localStorage directly (fast, no lock contention)
export async function loadSession() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { _session = null; _profile = null; return null; }
    // newer supabase-js stores the session as "base64-<encoded json>"
    if (raw.startsWith('base64-')) {
      try { raw = decodeURIComponent(escape(atob(raw.slice(7)))); } catch (_) {}
    }
    const stored = JSON.parse(raw);
    if (!stored || !stored.access_token) { _session = null; return null; }
    if (stored.expires_at && stored.expires_at * 1000 <= Date.now()) {
      console.warn('[auth] stored session expired');
      _session = null; return null;
    }
    _session = {
      access_token: stored.access_token,
      refresh_token: stored.refresh_token,
      user: stored.user,
      expires_at: stored.expires_at
    };
    // Load profile in background with 5s timeout (don't block)
    try {
      await Promise.race([
        loadProfile(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('PROFILE_TIMEOUT')), 5000))
      ]);
    } catch (e) {
      console.warn('[auth] loadProfile timeout/error:', e.message);
    }
    return _session;
  } catch (e) {
    console.error('[auth] loadSession error', e);
    _session = null;
    _profile = null;
    return null;
  }
}

async function loadProfile() {
  if (!_session || !_session.user) return;
  const { data, error } = await sb.from('profiles').select('*').eq('id', _session.user.id).maybeSingle();
  if (error) { console.warn('[auth] profile fetch err', error); return; }
  _profile = data;
}

export async function signIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error };
  await loadSession();
  emit();
  return { data };
}

export async function signOut() {
  try { await sb.auth.signOut(); } catch(e) { console.warn('[auth] signOut err', e); }
  _session = null;
  _profile = null;
  emit();
}

// Permission helpers — used by views to gate UI
export async function isAdmin() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;
  const { data } = await sb.from('app_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  return !!data;
}

export async function isClubLeader(clubId) {
  if (!_session || !clubId) return false;
  const { data } = await sb.from('golf_clubs').select('leader_id').eq('id', clubId).maybeSingle();
  return !!data && data.leader_id === _session.user.id;
}

// 공동관리자 — club_members.role='co_leader' && status='approved'
export async function isClubCoLeader(clubId) {
  if (!_session || !clubId) return false;
  const { data } = await sb.from('club_members')
    .select('role, status').eq('club_id', clubId)
    .eq('user_id', _session.user.id).maybeSingle();
  return !!data && data.role === 'co_leader' && data.status === 'approved';
}

// 통합 — 슈퍼관리자 OR 회장 OR 공동관리자
export async function isClubManager(clubId) {
  if (await isAdmin()) return true;
  if (clubId) {
    if (await isClubLeader(clubId)) return true;
    if (await isClubCoLeader(clubId)) return true;
  }
  return false;
}

// ─── 자동 session 동기화 (stale 방지) ───
sb.auth.onAuthStateChange((event, sess) => {
  _session = sess;
});
