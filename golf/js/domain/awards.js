// domain/awards.js — Award workflow (event_awards table)
// 5 stages: lock → peoria (신페리오만) → longest/nearest → publish → raffle

import { sb, mutate } from '../core/db.js';
import { getSession } from '../core/auth.js';

// Stage 1: Lock results (creates event_awards row)
export async function lockResults(eventId) {
  const session = getSession();
  if (!session) return { error: new Error('로그인 필요'), rls: false };
  const { data, error, rls } = await mutate(
    sb.from('event_awards').insert({
      event_id: eventId,
      locked_at: new Date().toISOString(),
      created_by: session.user.id
    }),
    { rlsMessage: '잠금 실패: 권한 없음 (회장 또는 슈퍼관리자만)' }
  );
  return { data: data?.[0], error, rls };
}

// Stage 2: Peoria 12-hole draw — par3/par4/par5 each exclude 2 (정석 신페리오)
export async function drawPeoriaHoles(eventId) {
  // 1) Get course par
  const { data: ev } = await sb.from('events').select('course_id, course_key').eq('id', eventId).maybeSingle();
  let pars = [4,5,4,3,5,4,5,4,3,4,5,4,4,5,4,3,5,4]; // default fallback
  if (ev?.course_id) {
    try {
      const { getCoursePar } = await import('../core/score-card.js');
      const cp = await getCoursePar(ev.course_id, ev.course_key);
      if (Array.isArray(cp) && cp.length >= 18) pars = cp.slice(0, 18);
    } catch (e) { console.warn('[peoria] getCoursePar failed', e); }
  }
  // 2) Group holes by par
  const par3 = [], par4 = [], par5 = [];
  for (let i = 0; i < 18; i++) {
    const p = pars[i];
    if (p === 3) par3.push(i+1);
    else if (p === 4) par4.push(i+1);
    else if (p === 5) par5.push(i+1);
  }
  // 3) Shuffle each group and exclude 2 (keep the rest)
  function shuffleAndExclude(arr, n) {
    if (arr.length <= n) return [];
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(n);
  }
  const keep3 = shuffleAndExclude(par3, 2);
  const keep4 = shuffleAndExclude(par4, 2);
  const keep5 = shuffleAndExclude(par5, 2);
  const holes = [...keep3, ...keep4, ...keep5].sort((a, b) => a - b);
  const { data, error, rls } = await mutate(
    sb.from('event_awards').update({
      peoria_holes: holes,
      updated_at: new Date().toISOString()
    }).eq('event_id', eventId),
    { rlsMessage: '12홀 저장 실패: 권한 없음' }
  );
  return { data: data?.[0], holes, error, rls };
}

// Stage 3: Longest drive + nearest pin
export async function setSpecialAwards(eventId, longestUserIds, nearestUserIds) {
  // Normalize to arrays + dedup + filter empty
  const longArr = (Array.isArray(longestUserIds) ? longestUserIds : (longestUserIds ? [longestUserIds] : [])).filter(Boolean);
  const nearArr = (Array.isArray(nearestUserIds) ? nearestUserIds : (nearestUserIds ? [nearestUserIds] : [])).filter(Boolean);
  const longDedup = [...new Set(longArr)];
  const nearDedup = [...new Set(nearArr)];
  if (longDedup.length > 4) return { error: new Error('롱기스트는 최대 4명') };
  if (nearDedup.length > 4) return { error: new Error('니어리스트는 최대 4명') };
  const { data, error, rls } = await mutate(
    sb.from('event_awards').update({
      longest_drive_user_ids: longDedup.length ? longDedup : null,
      nearest_pin_user_ids: nearDedup.length ? nearDedup : null,
      longest_drive_user_id: longDedup[0] || null,
      nearest_pin_user_id: nearDedup[0] || null,
      updated_at: new Date().toISOString()
    }).eq('event_id', eventId),
    { rlsMessage: '롱기/니어 저장 실패: 권한 없음' }
  );
  return { data: data?.[0], error, rls };
}

// Toggle "include normal award winners in raffle pool"
export async function setRaffleIncludeWinners(eventId, includeWinners) {
  const { data, error, rls } = await mutate(
    sb.from('event_awards').update({ raffle_include_winners: !!includeWinners, updated_at: new Date().toISOString() }).eq('event_id', eventId),
    { rlsMessage: '럭키 옵션 저장 실패: 권한 없음' }
  );
  return { data: data?.[0], error, rls };
}

// Stage 2: Choose method + ranks (BEFORE publishing, so we can branch peoria flow)
export async function setMethodAndRanks(eventId, ranks, method, grossRanks) {
  if (ranks == null || ranks < 0 || ranks > 4) return { error: new Error('보정 시상 인원은 0~4명') };
  if (!method || !['none', 'peoria', 'stableford', 'stableford_net', 'gross', 'net'].includes(method)) return { error: new Error('시상 방식 미선택') };
  if (grossRanks == null || grossRanks < 0 || grossRanks > 3) return { error: new Error('그로스 시상 인원은 0~3명') };
  const { data, error, rls } = await mutate(
    sb.from('event_awards').update({
      award_ranks: ranks,
      award_method: method,
      gross_ranks: grossRanks,
      updated_at: new Date().toISOString()
    }).eq('event_id', eventId),
    { rlsMessage: '시상 방식 저장 실패: 권한 없음' }
  );
  return { data: data?.[0], error, rls };
}

// Stage 4: Publish awards (now just sets awarded_at) (ranks + method + awarded_at)
export async function publishAwards(eventId) {
  const { data, error, rls } = await mutate(
    sb.from('event_awards').update({
      awarded_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('event_id', eventId),
    { rlsMessage: '발표 실패: 권한 없음' }
  );
  return { data: data?.[0], error, rls };
}

// Stage 5 (optional): Raffle winners
export async function saveRaffleWinners(eventId, winners, count) {
  const { data, error, rls } = await mutate(
    sb.from('event_awards').update({
      raffle_winners: winners,
      raffle_count: count || (winners?.length ?? 0),
      raffle_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('event_id', eventId),
    { rlsMessage: '럭키드로우 저장 실패: 권한 없음' }
  );
  return { data: data?.[0], error, rls };
}

// Unlock: delete event_awards row (full reset)
export async function unlockResults(eventId) {
  const { error } = await sb.from('event_awards').delete().eq('event_id', eventId);
  if (error) return { error };
  return { data: { reset: true }, error: null };
}
