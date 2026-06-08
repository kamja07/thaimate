// domain/matches.js — 동반 라운드 동반자 모집 (호스트 승인 방식)
import { sb, sbCourses, query, mutate } from '../core/db.js';
import { getSession } from '../core/auth.js';

export async function loadMatches({ region, sortBy } = {}) {
  const { cached: _cached } = await import('../core/cache-helper.js');
  return _cached('loadMatches_' + JSON.stringify([{ region, sortBy } = {}]), 10000, async () => {
  let q = sb.from('matches')
    .select('id, host_id, course, match_date, tee_time, spots_total, spots_taken, hcp_min, hcp_max, fee, note, created_at, host:profiles!matches_host_id_fkey(id, name, location, handicap)')
    .gte('match_date', new Date().toISOString().split('T')[0]); // 오늘 이후만
  
  if (sortBy === 'deadline') q = q.order('match_date', { ascending: true });
  else q = q.order('created_at', { ascending: false });
  
  const { data, error } = await q.limit(50);
  if (error) return { data: [], error };
  
  let result = data || [];
  if (region) {
    // course 이름으로 golf_courses 조회 후 region 필터 (한 번에 IN으로)
    const courseNames = [...new Set(result.map(r => r.course).filter(Boolean))];
    if (courseNames.length) {
      const { data: gc } = await sbCourses.from('golf_courses').select('name, region').in('name', courseNames);
      const courseRegion = {};
      (gc || []).forEach(c => { courseRegion[c.name] = c.region; });
      result = result.filter(m => courseRegion[m.course] === region);
    }
  }
  return { data: result, error: null };
});
}

export async function loadMatch(matchId) {
  return await query(
    sb.from('matches')
      .select('*, host:profiles!matches_host_id_fkey(id, name, location, handicap)')
      .eq('id', matchId).maybeSingle()
  );
}

export async function createMatch({ course, matchDate, teeTime, spotsTotal, hcpMin, hcpMax, fee, note }) {
  const session = getSession();
  if (!session) return { error: new Error('로그인 필요') };
  const { isVerifiedEmail } = await import('../core/email-verify.js');
  if (!isVerifiedEmail(session.user)) {
    return { error: new Error('이메일 인증이 필요합니다 — MY 페이지에서 진짜 이메일을 등록하고 인증해주세요') };
  }
  if (!course?.trim()) return { error: new Error('골프장 필수') };
  if (!matchDate) return { error: new Error('날짜 필수') };
  
  const row = {
    host_id: session.user.id,
    course: course.trim(),
    match_date: matchDate,
    tee_time: teeTime || null,
    spots_total: parseInt(spotsTotal) || 3,
    spots_taken: 0,
    hcp_min: hcpMin != null && hcpMin !== '' ? parseInt(hcpMin) : null,
    hcp_max: hcpMax != null && hcpMax !== '' ? parseInt(hcpMax) : null,
    fee: fee != null && fee !== '' ? parseInt(fee) : null,
    note: note?.trim() || null
  };
  
  const { data, error, rls } = await mutate(
    sb.from('matches').insert(row),
    { rlsMessage: '매치 등록 실패' }
  );
  return { data: data?.[0], error, rls };
}

export async function loadMatchApplications(matchId, status = null) {
  let q = sb.from('match_applications')
    .select('id, user_id, status, applied_at, profiles!match_applications_user_id_fkey(id, name, location, handicap)')
    .eq('match_id', matchId)
    .order('applied_at', { ascending: true });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  return { data: data || [], error };
}

export async function getMyMatchApplication(matchId, userId) {
  if (!userId) return { data: null };
  const { data } = await sb.from('match_applications')
    .select('status, applied_at')
    .eq('match_id', matchId).eq('user_id', userId).maybeSingle();
  return { data };
}

export async function applyMatch(matchId) {
  const session = getSession();
  if (!session) return { error: new Error('로그인 필요') };
  
  // 이미 신청했는지
  const { data: existing } = await sb.from('match_applications')
    .select('status').eq('match_id', matchId).eq('user_id', session.user.id).maybeSingle();
  if (existing) {
    if (existing.status === 'approved') return { error: new Error('이미 확정된 매치입니다') };
    if (existing.status === 'pending') return { error: new Error('이미 신청 — 호스트 승인 대기 중') };
  }
  
  const { data, error, rls } = await mutate(
    sb.from('match_applications').insert({
      match_id: matchId,
      user_id: session.user.id,
      status: 'pending',
      applied_at: new Date().toISOString()
    }),
    { rlsMessage: '신청 실패' }
  );
  return { data: data?.[0], error, rls };
}

export async function approveMatchApply(matchId, userId) {
  const { error } = await sb.from('match_applications')
    .update({ status: 'approved' })
    .eq('match_id', matchId).eq('user_id', userId);
  if (error) return { error };
  await bumpSpots(matchId, +1);
  return { data: { approved: true }, error: null };
}

export async function rejectMatchApply(matchId, userId) {
  const { error } = await sb.from('match_applications')
    .delete().eq('match_id', matchId).eq('user_id', userId).eq('status', 'pending');
  if (error) return { error };
  return { data: { rejected: true }, error: null };
}

export async function cancelMyMatchApply(matchId) {
  const session = getSession();
  if (!session) return { error: new Error('로그인 필요') };
  // 이전 status approved 였으면 spots_taken -1
  const { data: existing } = await sb.from('match_applications')
    .select('status').eq('match_id', matchId).eq('user_id', session.user.id).maybeSingle();
  const { error } = await sb.from('match_applications')
    .delete().eq('match_id', matchId).eq('user_id', session.user.id);
  if (error) return { error };
  if (existing?.status === 'approved') await bumpSpots(matchId, -1);
  return { data: { canceled: true }, error: null };
}

async function bumpSpots(matchId, delta) {
  try {
    const { data } = await sb.from('matches').select('spots_taken, spots_total').eq('id', matchId).maybeSingle();
    const cur = data?.spots_taken ?? 0;
    const total = data?.spots_total ?? 99;
    const next = Math.max(0, Math.min(total, cur + delta));
    await sb.from('matches').update({ spots_taken: next }).eq('id', matchId);
  } catch(_) {}
}
