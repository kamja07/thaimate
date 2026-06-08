// domain/courses.js — Super-admin golf course CRUD (2026-05-29)
import { sb, sbCourses } from '../core/db.js';

export const REGION_OPTIONS = ['방콕권','파타야권','라차부리·칸차나부리권','후아힌권','카오야이권','콘깬권','치앙마이권','치앙라이권','푸켓권','기타'];
export const HOLES_OPTIONS = [18, 27, 36];

export async function loadAllCourses() {
  const { data, error } = await sbCourses.from('golf_courses')
    .select('id, name, name_en, region, district, holes, course_names, pars')
    .order('region', { nullsFirst: false })
    .order('name');
  return { data: data || [], error };
}

export async function loadCourse(id) {
  const { data, error } = await sbCourses.from('golf_courses').select('*').eq('id', id).maybeSingle();
  return { data, error };
}

export async function createCourse({ name, region, district, holes, courseNames, pars }) {
  const row = {
    name,
    region: region || null,
    district: district || null,
    holes: holes || 18,
    course_names: (courseNames && courseNames.length) ? courseNames : null,
    pars: null
  };
  // pars 검증: array 또는 object 모두 지원
  if (pars !== undefined && pars !== null) {
    const validateArr = (a) => Array.isArray(a) && a.length > 0
      && a.every(p => Number.isInteger(p) && p >= 3 && p <= 6);
    let ok = false;
    if (Array.isArray(pars)) {
      if (validateArr(pars) && [9, 18, 27, 36].includes(pars.length)) ok = true;
    } else if (typeof pars === 'object') {
      const keys = Object.keys(pars);
      if (keys.length > 0) {
        ok = keys.every(k => validateArr(pars[k]));
        if (ok && holes) {
          const totalLen = keys.reduce((s, k) => s + pars[k].length, 0);
          if (totalLen !== holes) ok = false;
        }
      }
    }
    if (ok) row.pars = pars;
  }
  // 중앙(공용) 골프장 DB로 기여 — id를 클라이언트에서 생성(async 전달이라 즉시 알아야 함)
  row.id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : undefined;
  const { error } = await sb.rpc('contribute_course', { p_course: row });
  return { data: error ? null : row, error };
}
export async function updateCourse({ id, name, region, district, holes, courseNames, pars }) {
  // 안전 update: undefined 필드는 row에서 제외(부분 update 허용, 기존값 보존)
  const row = {};
  if (name !== undefined) row.name = name;
  if (region !== undefined) row.region = region || null;
  if (district !== undefined) row.district = district || null;
  if (holes !== undefined && holes) row.holes = holes;
  if (courseNames !== undefined) {
    row.course_names = (courseNames && courseNames.length) ? courseNames : null;
  }
  // pars: array 또는 object 모두 지원
  // 18홀: { main: [18개 정수] }
  // 27/36홀: { 'A': [9개], 'B': [9개], ... }
  // null/undefined: row에서 제외(보존)
  if (pars !== undefined && pars !== null) {
    const validateArr = (a) => Array.isArray(a) && a.length > 0
      && a.every(p => Number.isInteger(p) && p >= 3 && p <= 6);
    let ok = false;
    if (Array.isArray(pars)) {
      if (validateArr(pars) && [9, 18, 27, 36].includes(pars.length)) ok = true;
    } else if (typeof pars === 'object') {
      const keys = Object.keys(pars);
      if (keys.length > 0) {
        ok = keys.every(k => validateArr(pars[k]));
        // 합계 길이가 holes과 일치하면 더 안전
        if (ok && holes) {
          const totalLen = keys.reduce((s, k) => s + pars[k].length, 0);
          if (totalLen !== holes) ok = false;
        }
      }
    }
    if (ok) {
      row.pars = pars;
    } else {
      return { data: null, error: { message: 'Par 입력이 올바르지 않습니다. 모든 홀의 par를 3~6 사이 정수로 빠짐없이 입력해주세요.' } };
    }
  }
  if (Object.keys(row).length === 0) {
    return { data: null, error: { message: '변경된 항목이 없습니다.' } };
  }
  const payload = Object.assign({ id }, row);
  const { error } = await sb.rpc('contribute_course', { p_course: payload });
  return { data: error ? null : payload, error };
}
export async function deleteCourse(id) {
  const { data, error } = await sb.rpc('contribute_delete_course', { p_id: id });
  return { data, error };
}
