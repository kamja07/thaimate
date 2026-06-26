// domain/clubs.js — Club queries + write actions
import { sb, query, mutate } from '../core/db.js';
import { cached as _cached } from '../core/cache-helper.js';
import { getSession, isAdmin } from '../core/auth.js';

export async function loadAllClubs() {
  return _cached('loadAllClubs', 10000, async () => {
  const { data, error } = await sb.from('golf_clubs').select('id, name, location, description, leader_id, member_count, requires_approval, require_realname, approved_at').not('approved_at', 'is', null).order('member_count', { ascending: false });
  return { data: data || [], error };
});
}

export async function loadMyClubs(userId) {
  return _cached('loadMyClubs_' + JSON.stringify([userId]), 10000, async () => {
  if (!userId) return { data: [], error: null };
  const { data, error } = await sb.from('club_members').select('club_id, role, status, golf_clubs(id, name, location, leader_id, member_count, approved_at)').eq('user_id', userId).eq('status', 'approved');
  if (error) return { data: [], error };
  return { data: (data || []).filter(m => m.clubs).map(m => ({ ...m.clubs, role: m.role, status: m.status })), error: null };
});
}

export async function loadClub(clubId) {
  return await query(sb.from('golf_clubs').select('*, leader:profiles!golf_clubs_leader_id_fkey(id, name)').eq('id', clubId).maybeSingle());
}

export async function loadClubMembers(clubId) {
  const { data, error } = await sb.from('club_members').select('user_id, role, status, joined_at, profiles!club_members_user_id_fkey(id, name, real_name, phone, location, handicap, created_by_proxy_uuid)').eq('club_id', clubId).eq('status', 'approved').order('role', { ascending: false });
  return { data: data || [], error };
}

export async function loadPendingJoinRequests(clubId) {
  const { data, error } = await sb.from('club_members').select('user_id, requested_at, join_note, profiles!club_members_user_id_fkey(id, name, real_name, phone, location, handicap, created_by_proxy_uuid)').eq('club_id', clubId).eq('status', 'pending').order('requested_at', { ascending: true });
  return { data: data || [], error };
}

export async function loadPendingClubs() {
  const { data, error } = await sb.from('golf_clubs').select('id, name, location, description, leader_id, profiles!golf_clubs_leader_id_fkey(id, name)').is('approved_at', null);
  return { data: data || [], error };
}

export async function loadClubActivities(clubId) {
  const { data, error } = await sb.from('events').select('id, name, type, event_date, event_time, course, scoring_method, status, body').eq('club_id', clubId).order('event_date', { ascending: false }).limit(30);
  return { data: data || [], error };
}

export async function getMyClubMembership(clubId, userId) {
  if (!userId) return { data: null };
  const { data } = await sb.from('club_members').select('role, status').eq('club_id', clubId).eq('user_id', userId).maybeSingle();
  return { data };
}

async function bumpMemberCount(clubId, delta) {
  try {
    const { data } = await sb.from('golf_clubs').select('member_count').eq('id', clubId).maybeSingle();
    const current = data?.member_count ?? 0;
    const next = Math.max(0, current + delta);
    await sb.from('golf_clubs').update({ member_count: next }).eq('id', clubId);
  } catch(_) {}
}

export async function applyForClub({ name, location, description, requiresApproval, requireRealname }) {
  const session = getSession();
  if (!session) return { error: new Error('로그인 필요') };
  const { isVerifiedEmail } = await import('../core/email-verify.js');
  if (!isVerifiedEmail(session.user)) {
    return { error: new Error('이메일 인증이 필요합니다 — MY 페이지에서 진짜 이메일을 등록하고 인증해주세요') };
  }
  if (!name?.trim()) return { error: new Error('동호회 이름 필수') };
  if (!location?.trim()) return { error: new Error('활동 지역 필수') };
  const { data, error, rls } = await mutate(
    sb.from('golf_clubs').insert({
      name: name.trim(), location: location.trim(),
      description: description?.trim() || null,
      leader_id: session.user.id, member_count: 1,
      requires_approval: !!requiresApproval, require_realname: !!requireRealname, approved_at: null
    }),
    { rlsMessage: '동호회 개설 신청 실패: 권한 없음' }
  );
  if (error) return { error, rls };
  const newClub = data?.[0];
  if (newClub?.id) {
    const nowIso = new Date().toISOString();
    await sb.from('club_members').insert({
      club_id: newClub.id, user_id: session.user.id,
      role: 'leader', status: 'approved',
      joined_at: nowIso, requested_at: nowIso,
      approved_at: nowIso, approved_by: session.user.id
    });
  }
  return { data: newClub, error: null, rls: false };
}

export async function approveClub(clubId) {
  const { data, error, rls } = await mutate(
    sb.from('golf_clubs').update({ approved_at: new Date().toISOString() }).eq('id', clubId),
    { rlsMessage: '동호회 승인 실패: 슈퍼관리자 권한 필요' }
  );
  return { data: data?.[0], error, rls };
}

export async function rejectClub(clubId) {
  await sb.from('club_members').delete().eq('club_id', clubId);
  const { error } = await sb.from('golf_clubs').delete().eq('id', clubId);
  if (error) return { error };
  return { data: { rejected: true }, error: null };
}

export async function requestJoinClub(clubId, joinInfo) {
  const session = getSession();
  if (!session) return { error: new Error('로그인 필요') };
  const { data: existing } = await sb.from('club_members').select('status').eq('club_id', clubId).eq('user_id', session.user.id).maybeSingle();
  if (existing) {
    if (existing.status === 'approved') return { error: new Error('이미 가입된 동호회') };
    if (existing.status === 'pending') return { error: new Error('이미 가입 신청 중 — 회장 승인 대기') };
  }
  // 실명 필수 동호회: 제출한 실명·연락처를 내 프로필에 저장
  if (joinInfo && (joinInfo.realName || joinInfo.phone)) {
    const prof = {};
    if (joinInfo.realName) prof.real_name = joinInfo.realName.trim();
    if (joinInfo.phone) prof.phone = joinInfo.phone.trim();
    if (Object.keys(prof).length) await sb.from('profiles').update(prof).eq('id', session.user.id);
  }
  // 슈퍼관리자는 무조건 즉시 가입, 일반 회원은 무조건 회장 승인 필요
  const admin = await isAdmin();
  const status = admin ? 'approved' : 'pending';
  const nowIso = new Date().toISOString();
  const row = { club_id: clubId, user_id: session.user.id, role: 'member', status, requested_at: nowIso };
  if (joinInfo && joinInfo.note) row.join_note = joinInfo.note.trim();
  if (status === 'approved') {
    row.joined_at = nowIso;
    row.approved_at = nowIso;
    row.approved_by = session.user.id;
  }
  const { data, error, rls } = await mutate(
    sb.from('club_members').insert(row),
    { rlsMessage: '가입 신청 실패: 권한 없음' }
  );
  if (!error && status === 'approved') await bumpMemberCount(clubId, +1);
  return { data: data?.[0], error, rls, status };
}

export async function approveJoinRequest(clubId, userId) {
  const session = getSession();
  const nowIso = new Date().toISOString();
  const { data, error, rls } = await mutate(
    sb.from('club_members').update({ status: 'approved', joined_at: nowIso, approved_at: nowIso, approved_by: session?.user?.id }).eq('club_id', clubId).eq('user_id', userId),
    { rlsMessage: '가입 승인 실패: 회장 권한 필요' }
  );
  if (!error) await bumpMemberCount(clubId, +1);
  return { data: data?.[0], error, rls };
}

export async function rejectJoinRequest(clubId, userId) {
  const { error } = await sb.from('club_members').delete().eq('club_id', clubId).eq('user_id', userId).eq('status', 'pending');
  if (error) return { error };
  return { data: { rejected: true }, error: null };
}

export async function removeClubMember(clubId, userId) {
  const { error } = await sb.from('club_members').delete().eq('club_id', clubId).eq('user_id', userId).eq('status', 'approved').neq('role', 'leader');
  if (error) return { error };
  await bumpMemberCount(clubId, -1);
  return { data: { removed: true }, error: null };
}

export async function updateClub(clubId, { name, location, description, requiresApproval, requireRealname }) {
  const updates = {};
  if (name != null) updates.name = name.trim();
  if (location != null) updates.location = location.trim();
  if (description !== undefined) updates.description = description?.trim() || null;
  if (requiresApproval != null) updates.requires_approval = !!requiresApproval;
  if (requireRealname != null) updates.require_realname = !!requireRealname;
  const { data, error, rls } = await mutate(
    sb.from('golf_clubs').update(updates).eq('id', clubId),
    { rlsMessage: '동호회 정보 수정 실패: 회장 권한 필요' }
  );
  return { data: data?.[0], error, rls };
}

export async function leaveClub(clubId) {
  const session = getSession();
  if (!session) return { error: new Error('로그인 필요') };
  const { error } = await sb.from('club_members').delete().eq('club_id', clubId).eq('user_id', session.user.id).neq('role', 'leader');
  if (error) return { error };
  await bumpMemberCount(clubId, -1);
  return { data: { left: true }, error: null };
}

export async function setCoLeader(clubId, userId) {
  const session = getSession();
  if (!session?.user || !session.user.email_confirmed_at || /@golfdong\.local$/i.test(session.user.email || '')) {
    return { error: new Error('진짜 이메일 인증된 회장만 공동관리자를 지정할 수 있습니다') };
  }
  const { data, error, rls } = await mutate(
    sb.from('club_members').update({ role: 'co_leader' })
      .eq('club_id', clubId).eq('user_id', userId).eq('status', 'approved').neq('role', 'leader'),
    { rlsMessage: '공동관리자 지정 권한 없음 — 회장만 가능' }
  );
  return { data, error, rls };
}

export async function unsetCoLeader(clubId, userId) {
  const { data, error, rls } = await mutate(
    sb.from('club_members').update({ role: 'member' })
      .eq('club_id', clubId).eq('user_id', userId).eq('status', 'approved').eq('role', 'co_leader'),
    { rlsMessage: '공동관리자 취소 권한 없음 — 회장만 가능' }
  );
  return { data, error, rls };
}


// =========== 동호회 폐지 신청/승인 ===========

export async function requestDisband(clubId, reason) {
  const session = await getSession();
  if (!session?.user) return { error: new Error('로그인이 필요합니다') };
  const { data: club, error: e1 } = await sb.from('golf_clubs').select('leader_id, disband_requested_at').eq('id', clubId).single();
  if (e1 || !club) return { error: e1 || new Error('동호회를 찾을 수 없습니다') };
  if (club.leader_id !== session.user.id) return { error: new Error('동호회장만 폐지를 신청할 수 있습니다') };
  if (club.disband_requested_at) return { error: new Error('이미 폐지가 신청된 동호회입니다') };
  const { error } = await sb.from('golf_clubs').update({
    disband_requested_at: new Date().toISOString(),
    disband_requested_by: session.user.id,
    disband_reason: reason || null
  }).eq('id', clubId);
  if (error) return { error };
  return { ok: true };
}

export async function cancelDisband(clubId) {
  const session = await getSession();
  if (!session?.user) return { error: new Error('로그인이 필요합니다') };
  const { data: club, error: e1 } = await sb.from('golf_clubs').select('leader_id, disband_requested_at').eq('id', clubId).single();
  if (e1 || !club) return { error: e1 || new Error('동호회를 찾을 수 없습니다') };
  if (club.leader_id !== session.user.id) return { error: new Error('동호회장만 취소할 수 있습니다') };
  if (!club.disband_requested_at) return { error: new Error('폐지 신청된 상태가 아닙니다') };
  const { error } = await sb.from('golf_clubs').update({
    disband_requested_at: null,
    disband_requested_by: null,
    disband_reason: null
  }).eq('id', clubId);
  if (error) return { error };
  return { ok: true };
}

export async function loadDisbandPending() {
  const { data, error } = await sb
    .from('golf_clubs')
    .select('id, name, location, leader_id, disband_requested_at, disband_requested_by, disband_reason, member_count')
    .not('disband_requested_at', 'is', null)
    .order('disband_requested_at', { ascending: false });
  if (error) return { error };
  return { data: data || [] };
}

export async function approveDisband(clubId) {
  const { error } = await sb.rpc('approve_club_disband', { p_club_id: clubId });
  if (error) return { error };
  return { ok: true };
}

export async function rejectDisband(clubId) {
  const { error } = await sb.rpc('reject_club_disband', { p_club_id: clubId });
  if (error) return { error };
  return { ok: true };
}


// --- Super-admin: full club list + cascade delete (2026-05-29) ---
export async function loadAllClubsForAdmin() {
  const { data, error } = await sb.from('golf_clubs')
    .select('id, name, leader_id, approved_at, disband_requested_at')
    .order('approved_at', { ascending: false, nullsFirst: true });
  if (error) return { data: [], error };
  const leaderIds = Array.from(new Set((data || []).map(c => c.leader_id).filter(Boolean)));
  let leaderMap = {};
  if (leaderIds.length) {
    const { data: leaders } = await sb.from('profiles').select('id, name').in('id', leaderIds);
    (leaders || []).forEach(p => { leaderMap[p.id] = p.name; });
  }
  const enriched = await Promise.all((data || []).map(async (c) => {
    const { count: memberCount } = await sb.from('club_members').select('*', { count: 'exact', head: true }).eq('club_id', c.id);
    const { count: eventCount } = await sb.from('events').select('*', { count: 'exact', head: true }).eq('club_id', c.id);
    return Object.assign({}, c, { leader_name: leaderMap[c.leader_id] || '?', member_count: memberCount || 0, event_count: eventCount || 0 });
  }));
  return { data: enriched, error: null };
}

export async function adminDeleteClub(clubId) {
  const { data, error } = await sb.rpc('admin_delete_club', { p_club_id: clubId });
  return { data, error };
}
