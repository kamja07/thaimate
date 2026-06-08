// views/activityForm.js — 동호회 활동 등록/수정 폼
// Phase B 2026-05-28: 골프장 드롭다운 강제 + course_id 사용 + 27/36홀 course_key 선택
import { loadClub } from '../domain/clubs.js';
import { loadEvent } from '../domain/events.js';
import { sb } from '../core/db.js';
import { escapeHtml } from '../core/ui-kit.js';

const REGION_ORDER = ['방콕권','파타야권','라차부리·칸차나부리권','후아힌권','카오야이권','콘깬권','치앙마이권','치앙라이권','푸켓권','기타'];

async function loadCoursesByRegion() {
  const { data, error } = await sb.from('golf_courses')
    .select('id, name, region, district, holes, course_names, pars')
    .order('region').order('name');
  if (error) { console.warn('[courses] load err', error); return {}; }
  const by = {};
  (data || []).forEach(c => {
    const r = c.region || '기타';
    if (!by[r]) by[r] = [];
    by[r].push(c);
  });
  return by;
}

function escAttr(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

export async function activityFormView(params) {
  const { clubId, eventId } = params || {};
  const isEdit = !!eventId;

  let clubName = '';
  if (clubId) {
    const { data: club } = await loadClub(clubId);
    clubName = club?.name || '';
  }

  let evt = null;
  if (isEdit) {
    const r = await loadEvent(eventId);
    evt = r.data;
    if (!evt) {
      return `<div class="card"><button class="btn" onclick="window._gd.goBack()">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button><p style="color:#d32f2f;margin-top:12px;">활동을 불러올 수 없습니다.</p></div>`;
    }
  }

  const cur = {
    type: evt?.type || 'round',
    name: evt?.name || '',
    eventDate: evt?.event_date || '',
    eventTime: evt?.event_time || '',
    course: evt?.course || '',
    courseId: evt?.course_id || '',
    courseKey: evt?.course_key || '',
    scoringMethod: evt?.scoring_method || '',
    body: evt?.body || ''
  };

  const coursesByRegion = await loadCoursesByRegion();
  window.__coursesByRegion = coursesByRegion;

  // 현재 골프장의 region 찾기 (course_id 우선, fallback으로 텍스트 동반자 모집)
  let curRegion = '';
  let curCourseObj = null;
  if (cur.courseId) {
    for (const r of REGION_ORDER) {
      const found = (coursesByRegion[r] || []).find(c => c.id === cur.courseId);
      if (found) { curRegion = r; curCourseObj = found; break; }
    }
  }
  if (!curRegion && cur.course) {
    for (const r of REGION_ORDER) {
      const found = (coursesByRegion[r] || []).find(c => c.name === cur.course);
      if (found) { curRegion = r; curCourseObj = found; if (!cur.courseId) cur.courseId = found.id; break; }
    }
  }

  const typeOpt = (val, label) => `<option value="${val}" ${cur.type===val?'selected':''}>${label}</option>`;

  const regionOpts = REGION_ORDER
    .filter(r => coursesByRegion[r])
    .map(r => `<option value="${r}" ${curRegion===r?'selected':''}>${r} (${coursesByRegion[r].length})</option>`).join('');

  const courseList = curRegion ? coursesByRegion[curRegion] : Object.values(coursesByRegion).flat();
  const courseOpts = courseList.map(c => {
    const sub = c.district ? ` (${c.district})` : '';
    const selected = cur.courseId === c.id ? 'selected' : '';
    return `<option value="${c.id}" data-name="${escAttr(c.name)}" data-holes="${c.holes || 18}" data-course-names='${escAttr(JSON.stringify(c.course_names || []))}' ${selected}>${escapeHtml(c.name)}${sub}</option>`;
  }).join('');

  // 27/36홀 코스 키 옵션 — 두 코스 (1st 9 + 2nd 9)
  let courseKeyOpts1 = '';
  let courseKeyOpts2 = '';
  let showCourseKey = false;
  let curKey1 = '', curKey2 = '';
  if (cur.courseKey && cur.courseKey.includes('+')) {
    const parts = cur.courseKey.split('+').map(s => s.trim());
    curKey1 = parts[0] || '';
    curKey2 = parts[1] || '';
  } else {
    curKey1 = cur.courseKey || '';
  }
  if (curCourseObj && Array.isArray(curCourseObj.course_names) && curCourseObj.course_names.length >= 2) {
    showCourseKey = true;
    const baseOpts = curCourseObj.course_names.map(k => ({ k, esc: escAttr(k), html: escapeHtml(k) }));
    courseKeyOpts1 = '<option value="">— 1st 9 (전반) —</option>' +
      baseOpts.map(o => `<option value="${o.esc}" ${curKey1===o.k?'selected':''}>${o.html}</option>`).join('');
    courseKeyOpts2 = '<option value="">— 2nd 9 (후반) —</option>' +
      baseOpts.map(o => `<option value="${o.esc}" ${curKey2===o.k?'selected':''}>${o.html}</option>`).join('');
  }

  const showCourse = (cur.type !== 'notice');
  const showScoring = (cur.type === 'round');

  return `
    <div class="card">
      <button class="btn" onclick="window._gd.goBack()" style="margin-bottom:12px;">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      <h2>${isEdit ? '✏️ 활동 수정' : '+ 활동 등록'}</h2>
      ${clubName ? `<p style="color:#666;font-size:14px;">${escapeHtml(clubName)}</p>` : ''}

      <label style="display:block;margin-top:16px;font-weight:600;">활동 타입</label>
      <select id="af_type" class="input" ${isEdit ? 'disabled' : 'onchange="window._gd.onActivityTypeChange()"'}>
        ${typeOpt('round', '🏆 정기 라운드 (시상 워크플로우 가능)')}
        ${typeOpt('flash', '⚡ 번개 라운드 (가볍게)')}
        ${typeOpt('social', '🍻 친목 모임 (라운드 후 식사/회식)')}
        ${typeOpt('notice', '📢 공지사항')}
      </select>
      ${isEdit ? '<p style="font-size:12px;color:#999;margin-top:4px;">※ 활동 타입은 수정할 수 없습니다.</p>' : ''}

      <label style="display:block;margin-top:16px;font-weight:600;">이름 *</label>
      <input id="af_name" class="input" type="text" value="${escapeHtml(cur.name)}" placeholder="예: 5월 정기 라운드">

      <div id="af_dateBlock">
        <label style="display:block;margin-top:16px;font-weight:600;">날짜 / 시간</label>
        <div style="display:flex;gap:8px;margin-top:4px;">
          <input id="af_date" class="input" type="date" value="${cur.eventDate || ''}" style="flex:1;">
          <input id="af_time" class="input" type="time" value="${cur.eventTime || ''}" style="flex:0 0 130px;" ${cur.type==='notice'?'style="display:none;"':''}>
        </div>
      </div>

      <div id="af_courseBlock" style="${showCourse?'':'display:none;'}">
        <label style="display:block;margin-top:16px;font-weight:600;">⛳ 골프장</label>
        <div style="display:flex;gap:8px;margin-top:4px;">
          <select id="af_courseRegion" class="input" style="flex:0 0 160px;" onchange="window._gd.onCourseRegionChange()">
            <option value="">— 권역 선택 —</option>
            ${regionOpts}
          </select>
          <select id="af_course" class="input" style="flex:1;" onchange="window._gd.onCourseSelectChange()">
            <option value="">— 골프장 선택 —</option>
            ${courseOpts}
          </select>
        </div>
        <div id="af_courseKeyBlock" style="margin-top:8px;${showCourseKey?'':'display:none;'}">
          <label style="display:block;font-size:13px;font-weight:600;color:#e65100;">⛳ 두 코스 선택 (27/36홀 — 한 라운드 = 9홀×2)</label>
          <div style="display:flex;gap:6px;margin-top:4px;">
            <select id="af_courseKey1" class="input" style="flex:1;border:1px solid #ff9800;">
              ${courseKeyOpts1}
            </select>
            <select id="af_courseKey2" class="input" style="flex:1;border:1px solid #ff9800;">
              ${courseKeyOpts2}
            </select>
          </div>
          <p style="font-size:11px;color:#999;margin-top:4px;">전반·후반 각각 다른 코스 선택 (같은 코스 중복 불가).</p>
        </div>
        <p id="af_courseHint" style="font-size:11px;color:#999;margin-top:4px;">${cur.type==='social'?'친목 모임도 보통 라운드 후 모이니까 골프장 함께 기록':'권역 → 골프장 선택 후 27/36홀이면 사용 코스 추가 선택'} — 빠진 곳 있으면 알려주세요.</p>
      </div>

      <div id="af_placeBlock" style="${cur.type==='social'?'':'display:none;'}">
        <label style="display:block;margin-top:16px;font-weight:600;">🍻 모임 장소 (식당/카페 등, 선택)</label>
        <input id="af_place" class="input" type="text" placeholder="예: 한식당 미가">
      </div>

      <div id="af_scoringBlock" style="${showScoring?'':'display:none;'}">
        <label style="display:block;margin-top:16px;font-weight:600;">시상 방식 (선택)</label>
        <select id="af_scoring" class="input">
          <option value="" ${!cur.scoringMethod?'selected':''}>— 미정 (시상 단계에서 회장이 결정) —</option>
          <option value="신페리오" ${cur.scoringMethod==='신페리오'?'selected':''}>신페리오</option>
          <option value="스테이블포드" ${cur.scoringMethod==='스테이블포드'?'selected':''}>스테이블포드</option>
          <option value="그로스" ${cur.scoringMethod==='그로스'?'selected':''}>그로스</option>
          <option value="넷" ${cur.scoringMethod==='넷'?'selected':''}>넷 (핸디 적용)</option>
        </select>
      </div>

      <label style="display:block;margin-top:16px;font-weight:600;">설명 / 내용</label>
      <textarea id="af_body" class="input" rows="4" placeholder="${cur.type==='notice'?'공지 내용을 적어주세요':(cur.type==='social'?'모임 시간·예약상황 등':'추가 안내사항 (선택)')}">${escapeHtml(cur.body)}</textarea>

      <button class="btn btn-primary" onclick="${isEdit ? `window._gd.doUpdateActivity('${eventId}')` : `window._gd.doCreateActivity('${clubId}')`}" style="margin-top:20px;width:100%;">
        ${isEdit ? '💾 수정 저장' : '+ 활동 등록'}
      </button>
    </div>
  `;
}
