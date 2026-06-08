// domain/events.js — Event + participants + scores + activity CRUD
// Phase B 2026-05-28: createActivity/updateActivity에 course_id, course_key 지원 + getCoursePar 사용
import { sb, query, mutate } from '../core/db.js';
import { getSession } from '../core/auth.js';
import { getCoursePar } from '../core/score-card.js';

export async function loadEvent(eventId) {
  return await query(sb.from('events').select('*, club:golf_clubs(id, name, leader_id)').eq('id', eventId).maybeSingle());
}

export async function loadEventAwards(eventId) {
  const { data, error } = await sb.from('event_awards').select('*').eq('event_id', eventId).maybeSingle();
  return { data, error };
}

export async function loadEventParticipants(eventId) {
  const { data: parts, error: pErr } = await sb.from('event_participants').select('user_id, status, profiles(id, name, handicap)').eq('event_id', eventId);
  if (pErr) return { data: [], error: pErr };
  const { data: rounds, error: rErr } = await sb.from('rounds').select('user_id, total, holes').eq('event_id', eventId);
  if (rErr) console.warn('rounds load err', rErr);
  const roundsByUser = {};
  (rounds || []).forEach(r => { roundsByUser[r.user_id] = r; });
  const merged = (parts || []).map(p => ({
    user_id: p.user_id,
    name: p.profiles?.name || '익명',
    handicap: p.profiles?.handicap,
    status: p.status,
    total: roundsByUser[p.user_id]?.total ?? null,
    holes: roundsByUser[p.user_id]?.holes ?? null
  }));
  merged.sort((a, b) => (a.total ?? 999) - (b.total ?? 999));
  return { data: merged, error: null };
}

export async function createActivity(clubId, { name, type, eventDate, eventTime, course, courseId, courseKey, scoringMethod, body }) {
  const session = getSession();
  if (!session) return { error: new Error('로그인 필요') };
  if (!clubId) return { error: new Error('동호회 ID 필수') };
  if (!name?.trim()) return { error: new Error('활동 이름 필수') };
  if (!['round', 'flash', 'social', 'notice'].includes(type)) return { error: new Error('활동 타입 잘못됨') };
  if (type === 'round' && !eventDate) return { error: new Error('라운드 날짜 필수') };
  const row = {
    club_id: clubId,
    name: name.trim(),
    type,
    body: body?.trim() || null,
    status: 'scheduled',
    created_by: session.user.id
  };
  row.event_date = eventDate || new Date().toISOString().split('T')[0];
  if (eventTime) row.event_time = eventTime;
  if (course?.trim()) row.course = course.trim();
  if (courseId) row.course_id = courseId;
  if (courseKey) row.course_key = courseKey;
  if (type === 'round') {
    row.scoring_method = scoringMethod?.trim() || null;
    row.hole_pars = null; // explicit null
    // hole_pars: course_id가 있으면 getCoursePar로 정확 조회 (ilike 폐기)
    if (courseId) {
      try {
        const fetched = await getCoursePar(courseId, courseKey);
        if (Array.isArray(fetched) && fetched.length === 18) {
          row.hole_pars = fetched;
        }
      } catch (e) { console.warn('par lookup failed', e); }
    }
  }
  const { data, error, rls } = await mutate(
    sb.from('events').insert(row),
    { rlsMessage: '활동 등록 실패: 회장 권한 필요' }
  );
  return { data: data?.[0], error, rls };
}

export async function updateActivity(eventId, { name, eventDate, eventTime, course, courseId, courseKey, scoringMethod, body }) {
  const session = getSession();
  if (!session) return { error: new Error('로그인 필요') };
  if (!eventId) return { error: new Error('eventId 필수') };
  const updates = {};
  if (name != null && name.trim()) updates.name = name.trim();
  if (eventDate != null && eventDate !== '') updates.event_date = eventDate;
  if (eventTime !== undefined) updates.event_time = (eventTime && eventTime.trim()) ? eventTime : null;
  if (course !== undefined) updates.course = (course && course.trim()) ? course.trim() : null;
  if (courseId !== undefined) updates.course_id = courseId || null;
  if (courseKey !== undefined) updates.course_key = (courseKey && courseKey.trim()) ? courseKey.trim() : null;
  if (scoringMethod !== undefined) updates.scoring_method = (scoringMethod && scoringMethod.trim()) ? scoringMethod.trim() : null;
  if (body !== undefined) updates.body = (body && body.trim()) ? body.trim() : null;

  // course_id 바뀌면 hole_pars 재조회 (단, 기존 hole_pars 있으면 보존)
  if (courseId !== undefined && courseId) {
    try {
      const { data: existing } = await sb.from('events').select('hole_pars').eq('id', eventId).maybeSingle();
      if (!existing?.hole_pars || !Array.isArray(existing.hole_pars) || existing.hole_pars.length !== 18) {
        const fetched = await getCoursePar(courseId, courseKey);
        if (Array.isArray(fetched) && fetched.length === 18) {
          updates.hole_pars = fetched;
        }
      }
    } catch (e) { console.warn('par re-lookup failed', e); }
  }

  const { data, error, rls } = await mutate(
    sb.from('events').update(updates).eq('id', eventId).select(),
    { rlsMessage: '활동 수정 실패: 회장 권한 필요' }
  );
  return { data: data?.[0], error, rls };
}

export async function loadMyEventRound(eventId, userId) {
  if (!userId || !eventId) return { data: null };
  const { data } = await sb.from('rounds').select('id, total, holes').eq('event_id', eventId).eq('user_id', userId).maybeSingle();
  return { data };
}

export async function saveMyEventRound(eventId, holes, total) {
  const session = getSession();
  if (!session) return { error: new Error('로그인 필요') };
  if (!eventId) return { error: new Error('eventId 필수') };
  const { data: part } = await sb.from('event_participants').select('user_id').eq('event_id', eventId).eq('user_id', session.user.id).maybeSingle();
  if (!part) return { error: new Error('참가자가 아닙니다') };

  const { data: evt } = await sb.from('events').select('id, course, event_date').eq('id', eventId).maybeSingle();
  const { data: aw } = await sb.from('event_awards').select('locked_at').eq('event_id', eventId).maybeSingle();
  if (aw?.locked_at) return { error: new Error('시상 잠금됨 — 점수 수정 불가') };

  const { data: existing } = await sb.from('rounds').select('id').eq('event_id', eventId).eq('user_id', session.user.id).maybeSingle();
  const row = {
    event_id: eventId,
    user_id: session.user.id,
    course: evt?.course || evt?.name || '미지정',
    played_at: evt?.event_date || new Date().toISOString().split('T')[0],
    total: parseInt(total),
    holes: Array.isArray(holes) && holes.length === 18 ? holes.map(h => parseInt(h)) : null
  };
  if (existing) {
    const { error } = await sb.from('rounds').update(row).eq('id', existing.id);
    return { data: { updated: true }, error };
  } else {
    const { error } = await sb.from('rounds').insert(row);
    return { data: { inserted: true }, error };
  }
}

export async function deleteActivity(eventId) {
  const { error } = await sb.from('events').delete().eq('id', eventId);
  if (error) return { error };
  return { data: { deleted: true }, error: null };
}
