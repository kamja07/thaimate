import { sb, mutate, query } from '../core/db.js';
// domain/users.js — User registration + profile helpers

import { signIn as authSignIn, loadSession } from '../core/auth.js';

function makeInternalEmail() {
  const r = Math.random().toString(36).slice(2, 10);
  return `u_${Date.now()}_${r}@golfdong.local`;
}

function looksLikeEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export async function signUp({ nickname, password, location, handicap, realName = '', contactEmail = '', phone = '' }) {
  // Required
  if (!nickname || nickname.length < 2) return { error: new Error('닉네임은 2자 이상 필수') };
  if (!password || password.length < 4) return { error: new Error('비밀번호는 4자 이상 필수') };
  if (!location) return { error: new Error('활동 지역을 선택해주세요') };
  if (handicap === null || handicap === undefined || handicap === '' || isNaN(handicap)) return { error: new Error('핸디캡을 입력해주세요 (0~36)') };
  const hc = Number(handicap);
  if (hc < 0 || hc > 36) return { error: new Error('핸디캡은 0~36 사이') };
  
  // Optional but validated if provided
  if (contactEmail && !looksLikeEmail(contactEmail)) return { error: new Error('이메일 형식이 올바르지 않습니다') };
  
  // Pre-check: nickname already taken
  const { data: existing } = await sb.from('profiles').select('id').ilike('name', nickname).maybeSingle();
  if (existing) return { error: new Error(`닉네임 "${nickname}"은(는) 이미 사용 중입니다 (대소문자 무관)`) };
  
  if (contactEmail) {
    const { data: exEmail } = await sb.from('profiles').select('id').ilike('contact_email', contactEmail.trim()).maybeSingle();
    if (exEmail) return { error: new Error(`이메일 "${ contactEmail }"은 이미 사용 중입니다`) };
  }
  
  const internalEmail = makeInternalEmail();
  const { data: signUpData, error: signUpErr } = await sb.auth.signUp({ email: internalEmail, password });
  if (signUpErr) return { error: signUpErr };
  const userId = signUpData.user?.id;
  if (!userId) return { error: new Error('사용자 ID 발급 실패') };
  
  const { error: profErr } = await sb.from('profiles').upsert({
    id: userId,
    name: nickname,
    location,
    handicap: hc,
    auth_email: internalEmail,
    contact_email: contactEmail ? contactEmail.trim() : null,
    phone: phone ? phone.trim() : null
  }, { onConflict: 'id' });
  if (profErr) return { error: profErr };
  
  const r = await authSignIn(internalEmail, password);
  if (r.error) return { error: r.error };
  if (contactEmail) {
    try { await sb.auth.updateUser({ email: contactEmail.trim() }); } catch (e) { console.warn('[signup] verify request failed', e); }
  }
  return { user: signUpData.user };
}

export async function signInByNickname(nickname, password) {
  const { data: prof, error: profErr } = await sb.from('profiles').select('id, name').ilike('name', nickname).maybeSingle();
  if (profErr || !prof) return { error: new Error(`존재하지 않는 닉네임: "${nickname}"`) };
  const { data: emailData } = await sb.rpc('get_user_email_by_id', { uid: prof.id });
  if (!emailData) return { error: new Error('이메일 조회 실패 — 관리자에게 문의') };
  return await authSignIn(emailData, password);
}

export async function updateMyProfile({ realName, location, handicap, contactEmail, phone }) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: new Error('로그인 필요') };
  const updates = {};
  if (realName !== undefined) updates.real_name = (realName && realName.trim()) ? realName.trim() : null;
  if (location !== undefined) updates.location = location;
  if (handicap !== undefined && handicap !== '') updates.handicap = parseFloat(handicap);
  if (contactEmail !== undefined) updates.contact_email = (contactEmail && contactEmail.trim()) ? contactEmail.trim() : null;
  if (phone !== undefined) updates.phone = (phone && phone.trim()) ? phone.trim() : null;
  const { data, error } = await sb.from('profiles').update(updates).eq('id', user.id).select().maybeSingle();
  return { data, error };
}

// ─────── Profile management ───────

export async function loadAllProfiles() {
  // RLS should allow admins to see all
  const { data, error } = await sb.from('profiles')
    .select('id, name, handicap, location, manner_score, real_name, contact_email, phone, created_at')
    .order('created_at', { ascending: false })
    .limit(500);
  

  return { data: data || [], error };
}

export async function loadMyProfile() {
  const session = (await import('../core/auth.js')).getSession();
  if (!session) return { data: null, error: new Error('로그인 필요') };
  const { data, error } = await sb.from('profiles')
    .select('id, name, handicap, location, real_name, contact_email, phone, manner_score, created_at')
    .eq('id', session.user.id).maybeSingle();
  return { data, error };
}


export async function grantAdmin(userId) {
  const { data, error } = await sb.rpc('admin_grant_admin', { p_user_id: userId });
  return { data, error };
}

export async function revokeAdmin(userId) {
  const { data, error } = await sb.rpc('admin_revoke_admin', { p_user_id: userId });
  return { data, error };
}

export async function isUserAdmin(userId) {
  if (!userId) return false;
  const { data } = await sb.from('app_admins').select('user_id').eq('user_id', userId).maybeSingle();
  return !!data;
}


export async function adminDeleteUser(userId) {
  const { data, error } = await sb.rpc('admin_delete_user', { p_user_id: userId });
  return { data, error };
}

export async function requestEmailVerification(newEmail) {
  if (!looksLikeEmail(newEmail)) return { error: new Error('이메일 형식이 올바르지 않습니다') };
  const { data, error } = await sb.auth.updateUser({ email: newEmail.trim() });
  return { data, error };
}
