import { sb, sbCourses } from '../core/db.js';
import { escapeHtml } from '../core/ui-kit.js';
import { renderScorecard } from '../core/score-card.js';

const REGION_ORDER = ['방콕권','파타야권','후아힌권','카오야이권','치앙마이권','푸켓권','기타'];

export async function roundAddView() {
  const { data } = await sbCourses.from('golf_courses').select('id, name, region, district, holes, course_names, pars').order('region').order('name');
  const courses = data || [];
  const by = {};
  courses.forEach(c => { const r = c.region || '기타'; if (!by[r]) by[r]=[]; by[r].push(c); });
  window.__raCoursesByRegion = by;
  const regionOpts = REGION_ORDER.filter(r => by[r]).map(r => `<option value="${r}">${r} (${by[r].length})</option>`).join('');
  const today = new Date().toISOString().slice(0, 10);
  return `
    <div class="card">
      <button class="btn btn-secondary" onclick="window.history.back()">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      <h2 style="margin-top:12px;">+ 라운드 기록</h2>
      <div style="color:#666;margin-bottom:16px;font-size:13px;">개인 라운드 — 동호회 라운드는 동호회 상세에서</div>
    </div>
    <div class="card">
      <label style="display:block;font-weight:600;margin-bottom:4px;">⛳ 골프장 *</label>
      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <select id="ra_courseRegion" class="input" style="flex:0 0 160px;" onchange="window._gd.onRaRegionChange()">
          <option value="">— 권역 선택 —</option>
          ${regionOpts}
        </select>
        <select id="ra-course-select" class="input" style="flex:1;" onchange="window._gd.doRoundCourseChange()">
          <option value="">— 골프장 선택 —</option>
        </select>
      </div>
      <div style="margin-bottom:8px;font-size:12px;color:#888;">또는 직접 입력</div>
      <input type="text" id="ra-course-text" placeholder="(선택) 골프장 직접 입력" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;margin-bottom:12px;">
      <div id="ra-course-key-section" style="display:none;margin-bottom:12px;padding:8px;background:#fff3cd;border:1px solid #ffc107;border-radius:4px;">
        <label style="display:block;font-weight:600;font-size:13px;color:#e65100;margin-bottom:4px;">⛳ 사용 코스 (27/36홀)</label>
        <div style="display:flex;gap:8px;">
          <select id="ra-course-key1" class="input" style="flex:1;border:1px solid #ff9800;" onchange="window._gd.doRoundCourseChange()"><option value="">— 1st 9 —</option></select>
          <select id="ra-course-key2" class="input" style="flex:1;border:1px solid #ff9800;" onchange="window._gd.doRoundCourseChange()"><option value="">— 2nd 9 —</option></select>
        </div>
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block;font-weight:600;margin-bottom:4px;">📅 날짜 *</label>
        <input type="date" id="ra-date" value="${today}" style="padding:8px;border:1px solid #ccc;border-radius:4px;">
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block;font-weight:600;margin-bottom:8px;">🎯 18홀 스코어 (총 스코어는 자동 합산)</label>
        <div id="ra-scorecard-container">
          ${renderScorecard({ pars: null, scores: [], prefix: 'ra', readonly: false, holes: 18 })}
        </div>
      </div>
      <button style="width:100%;padding:14px;background:#2e7d32;color:white;border:none;border-radius:6px;font-weight:600;cursor:pointer;font-size:15px;" onclick="window._gd && window._gd.doAddPersonalRound()">+ 등록</button>
    </div>
  `;
}