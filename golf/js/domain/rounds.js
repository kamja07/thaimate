// domain/rounds.js — 개인 라운드 기록 (event_id=null인 row가 개인)
// Phase B 2026-05-28: addPersonalRound에 courseId, courseKey 보존
import { sb, query, mutate } from '../core/db.js';
import { getSession } from '../core/auth.js';

export async function loadMyRounds(userId) {
  if (!userId) return { data: [], error: null };
  const { data, error } = await sb.from('rounds')
    .select('id, user_id, course, played_at, total, holes, event_id, created_at, events(name, event_date, hole_pars)')
    .eq('user_id', userId)
    .order('played_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(100);
  return { data: data || [], error };
}

export async function addPersonalRound({ course, courseId, courseKey, playedAt, total, holes }) {
  const session = getSession();
  if (!session) return { error: new Error('로그인 필요') };
  if (!course?.trim()) return { error: new Error('골프장 필수') };
  if (!playedAt) return { error: new Error('날짜 필수') };
  if (total == null || total === '') return { error: new Error('총 스코어 필수') };

  const row = {
    user_id: session.user.id,
    course: course.trim(),
    played_at: playedAt,
    total: parseInt(total),
    event_id: null
  };
  if (courseId) row.course_id = courseId;
  if (courseKey) row.course_key = courseKey;
  if (Array.isArray(holes) && holes.length === 18 && holes.every(h => h != null)) {
    row.holes = holes.map(h => parseInt(h));
  }

  const { data, error, rls } = await mutate(
    sb.from('rounds').insert(row),
    { rlsMessage: '라운드 등록 실패' }
  );
  return { data: data?.[0], error, rls };
}

export async function deleteRound(roundId) {
  const session = getSession();
  if (!session) return { error: new Error('로그인 필요') };
  const { error } = await sb.from('rounds')
    .delete().eq('id', roundId).eq('user_id', session.user.id).is('event_id', null);
  if (error) return { error };
  return { data: { deleted: true }, error: null };
}

export function calcRoundStats(rounds) {
  if (!rounds || rounds.length === 0) return { count: 0, avg: '-', best: '-', recent: '-' };
  const valid = rounds.filter(r => r.total != null);
  if (valid.length === 0) return { count: 0, avg: '-', best: '-', recent: '-' };
  const sum = valid.reduce((s, r) => s + r.total, 0);
  return {
    count: valid.length,
    avg: Math.round(sum / valid.length),
    best: Math.min(...valid.map(r => r.total)),
    recent: valid[0].total
  };
}
