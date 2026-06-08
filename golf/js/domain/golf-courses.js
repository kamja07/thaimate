// v2/js/domain/golf-courses.js
// 골프장 정보 조회/수정 — 회장/슈퍼관리자 권한 (RLS)

import { sb, sbCourses } from '../core/db.js';
import { getSession } from '../core/auth.js';

export async function loadAllGolfCourses() {
  const { data, error } = await sbCourses.from('golf_courses')
    .select('id, name, region, district, holes, course_names, pars, last_updated_at')
    .order('region')
    .order('name');
  if (error) return { error };
  return { data: data || [] };
}

export async function updateGolfCourse(courseId, payload) {
  const session = await getSession();
  if (!session?.user) return { error: new Error('로그인이 필요합니다') };
  const update = { id: courseId };
  if (payload.holes !== undefined) update.holes = payload.holes;
  if (payload.course_names !== undefined) update.course_names = payload.course_names;
  if (payload.pars !== undefined) update.pars = payload.pars;
  // 중앙 공용 골프장 DB로 전달 (last_updated_by 등 사용자 참조는 보내지 않음 → B FK 회피)
  const { error } = await sb.rpc('contribute_course', { p_course: update });
  if (error) return { error };
  return { ok: true };
}

export function calcParProgress(courses) {
  const total = courses.length;
  const filled = courses.filter(c => c.pars && Object.keys(c.pars).length > 0).length;
  return { total, filled, percent: total ? Math.round(filled * 100 / total) : 0 };
}
