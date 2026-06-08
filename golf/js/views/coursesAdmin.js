// views/coursesAdmin.js — 권역별 accordion + name_en 병기
import { loadAllCourses, REGION_OPTIONS } from '../domain/courses.js';
import { isAdmin } from '../core/auth.js';
import { sb } from '../core/db.js';
import { escapeHtml } from '../core/ui-kit.js';

let _isSuperAdminFlag = false;

function escAttr(s) {
  return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function missingFields(c) {
  const miss = [];
  if (!c.region) miss.push('권역');
  if (!c.district) miss.push('지역');
  if (!c.holes) miss.push('홀수');
  const holes = c.holes || 18;
  if (holes >= 27 && (!c.course_names || c.course_names.length < 2)) miss.push('코스명');
  if (!c.pars || typeof c.pars !== 'object' || Object.keys(c.pars).length === 0) {
    miss.push('Par');
  } else {
    if (holes === 18) {
      let arr = c.pars.main;
      if (!Array.isArray(arr)) {
        if (Array.isArray(c.pars)) arr = c.pars;
        else { const keys = Object.keys(c.pars); if (keys.length && Array.isArray(c.pars[keys[0]])) arr = c.pars[keys[0]]; }
      }
      if (!arr || arr.length !== 18) miss.push('Par');
    } else if (c.course_names && c.course_names.length) {
      const bad = c.course_names.some(cn => { const arr = c.pars[cn]; return !arr || !Array.isArray(arr) || arr.length !== 9; });
      if (bad) miss.push('일부 Par');
    } else {
      miss.push('Par');
    }
  }
  return miss;
}

function renderRow(c) {
  const miss = missingFields(c);
  const isComplete = miss.length === 0;
  const badge = isComplete
    ? '<span style="background:#1B5E20;color:white;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:700;">✓</span>'
    : '<span style="background:#F57F17;color:white;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:700;">⚠ ' + escapeHtml(miss.join('·')) + '</span>';
  const bg = isComplete ? '' : 'background:#FFFBEB;';
  const nameEn = c.name_en ? '<div style="font-size:11px;color:#666;font-weight:400;margin-top:1px;">' + escapeHtml(c.name_en) + '</div>' : '';
  return '<div style="padding:10px 12px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:8px;' + bg + '">' +
    '<div style="flex:1;min-width:0;">' +
      '<div style="font-weight:600;font-size:14px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
        '<span>' + escapeHtml(c.name) + '</span>' + badge +
      '</div>' + nameEn +
      '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' +
        (c.district ? escapeHtml(c.district) + ' · ' : '<span style="color:#F57F17;font-weight:600;">지역 미입력 · </span>') + (c.holes || 18) + '홀' +
        (c.course_names && c.course_names.length ? ' · ' + escapeHtml(c.course_names.join('/')) : '') +
      '</div>' +
    '</div>' +
    '<div style="display:flex;gap:4px;flex-shrink:0;">' +
      '<button class="btn btn-secondary" style="font-size:10px;padding:4px 8px;" onclick="window._gd.goEditCourse(\'' + c.id + '\')">수정</button>' +
      (_isSuperAdminFlag ? '<button style="font-size:10px;padding:4px 8px;background:#c62828;color:white;border:none;border-radius:4px;font-weight:600;cursor:pointer;" onclick="window._gd.doDeleteCourse(\'' + c.id + '\', \'' + escAttr(c.name) + '\')">삭제</button>' : '') +
    '</div>' +
  '</div>';
}

function renderRegionAccordion(region, list) {
  if (!list || list.length === 0) return '';
  const incCount = list.filter(c => missingFields(c).length > 0).length;
  const compCount = list.length - incCount;
  const rows = list.map(renderRow).join('');
  const compBadge = compCount > 0 ? '<span style="background:rgba(255,255,255,0.25);padding:2px 8px;border-radius:10px;margin-right:4px;font-size:11px;">✓ ' + compCount + '</span>' : '';
  const incBadge = incCount > 0 ? '<span style="background:#F57F17;padding:2px 8px;border-radius:10px;font-size:11px;">⚠ ' + incCount + '</span>' : '';
  return '<details class="card" style="padding:0;margin-bottom:8px;">' +
    '<summary style="padding:14px 16px;font-weight:700;font-size:14px;background:linear-gradient(135deg,#2E7D32,#4CAF50);color:white;border-radius:8px;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;">' +
      '<span>' + escapeHtml(region) + ' <span style="opacity:0.85;font-weight:500;">(' + list.length + ')</span></span>' +
      '<span>' + compBadge + incBadge + '</span>' +
    '</summary>' +
    '<div>' + rows + '</div>' +
  '</details>';
}

function groupByRegion(arr) {
  const by = {};
  arr.forEach(c => { const r = c.region || '기타'; if (!by[r]) by[r] = []; by[r].push(c); });
  return by;
}

function orderRegions(byObj) {
  const ord = REGION_OPTIONS.filter(r => byObj[r]);
  Object.keys(byObj).forEach(r => { if (!ord.includes(r)) ord.push(r); });
  return ord;
}

export async function coursesAdminView() {
  const admin = await isAdmin();
  _isSuperAdminFlag = !!admin;
  let canEdit = !!admin;
  if (!canEdit) {
    try { const { data } = await sb.rpc('is_email_verified_user'); canEdit = !!data; }
    catch (e) { console.warn('perm check err', e); }
  }
  if (!canEdit) return '<div class="card"><h2>⚠ 권한 없음</h2><p style="color:#666;font-size:13px;">이메일 인증 회원만 가능합니다.</p><button class="btn btn-secondary" onclick="window._gd.goBack()">← 뒤로</button></div>';

  const { data: courses, error } = await loadAllCourses();
  if (error) return '<div class="card"><p style="color:#d32f2f;">' + escapeHtml(error.message) + '</p></div>';

  const list = courses || [];
  let compTotal = 0, incTotal = 0;
  list.forEach(c => { if (missingFields(c).length === 0) compTotal++; else incTotal++; });

  const byR = groupByRegion(list);
  const accordions = orderRegions(byR).map(r => renderRegionAccordion(r, byR[r])).join('');

  return '<div class="card">' +
    '<button class="btn btn-secondary" style="font-size:12px;padding:6px 10px;" onclick="window._gd.goBack()">← 뒤로</button>' + '<button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:8px;">' +
      '<h2 style="margin:0;">⛳ 골프장 관리</h2>' +
      '<button class="btn btn-primary" onclick="window._gd.goNewCourse()" style="padding:8px 14px;flex-shrink:0;">+ 신규 등록</button>' +
    '</div>' +
    '<p style="color:var(--text-secondary);font-size:13px;margin:6px 0 0;">' +
      '총 ' + list.length + '개 · ' +
      '<span style="color:#1B5E20;font-weight:700;">✓ 완전 ' + compTotal + '</span> · ' +
      '<span style="color:#F57F17;font-weight:700;">⚠ 누락 ' + incTotal + '</span>' +
    '</p>' +
    '<p style="color:#888;font-size:11px;margin:6px 0 0;">권역을 눌러 펼치거나 접을 수 있어요.</p>' +
  '</div>' + accordions;
}
