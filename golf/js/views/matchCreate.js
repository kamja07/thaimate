// views/matchCreate.js — 매치 등록 폼 (골프장 권역+선택, 날짜+시간, 인원, 핸디, 그린피, 메모)
import { sb } from '../core/db.js';
import { createMatch } from '../domain/matches.js';
import { escapeHtml } from '../core/ui-kit.js';

const REGION_ORDER = ['방콕권','파타야권','라차부리·칸차나부리권','후아힌권','카오야이권','콘깬권','치앙마이권','치앙라이권','푸켓권','기타'];

async function loadCoursesByRegion() {
  const { data, error } = await sb.from('golf_courses').select('id, name, region, district').order('region').order('name');
  if (error) { console.warn(error); return {}; }
  const by = {};
  (data || []).forEach(c => {
    const r = c.region || '기타';
    if (!by[r]) by[r] = [];
    by[r].push(c);
  });
  return by;
}

export async function matchCreateView() {
  const coursesByRegion = await loadCoursesByRegion();
  window.__matchCoursesByRegion = coursesByRegion;
  
  const regionOpts = REGION_ORDER
    .filter(r => coursesByRegion[r])
    .map(r => `<option value="${r}">${r} (${coursesByRegion[r].length})</option>`).join('');
  
  const today = new Date().toISOString().split('T')[0];
  const oneWeek = new Date(Date.now()+7*86400000).toISOString().split('T')[0];
  
  return `
    <div class="card">
      <button class="btn" onclick="window._gd.goBack()" style="margin-bottom:12px;">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      <h2>+ 동반 라운드 모집</h2>
      <p style="color:#666;font-size:13px;">호스트 승인 방식 — 신청자 보고 본인이 확정합니다</p>
      
      <label style="display:block;margin-top:16px;font-weight:600;">⛳ 골프장 *</label>
      <div style="display:flex;gap:8px;margin-top:4px;">
        <select id="mc_courseRegion" class="input" style="flex:0 0 160px;" onchange="window._gd.onMatchCourseRegionChange()">
          <option value="">— 권역 선택 —</option>
          ${regionOpts}
        </select>
        <select id="mc_course" class="input" style="flex:1;">
          <option value="">— 골프장 선택 —</option>
        </select>
      </div>
      
      <label style="display:block;margin-top:16px;font-weight:600;">날짜 / 티오프 *</label>
      <div style="display:flex;gap:8px;margin-top:4px;">
        <input id="mc_date" class="input" type="date" value="${oneWeek}" min="${today}" style="flex:1;">
        <input id="mc_time" class="input" type="time" value="07:00" style="flex:0 0 130px;">
      </div>
      
      <label style="display:block;margin-top:16px;font-weight:600;">모집 인원</label>
      <select id="mc_spots" class="input">
        <option value="1">1명</option>
        <option value="2">2명</option>
        <option value="3" selected>3명</option>
      </select>
      
      <label style="display:block;margin-top:16px;font-weight:600;">핸디 범위 (선택)</label>
      <div style="display:flex;gap:8px;align-items:center;">
        <input id="mc_hcpMin" class="input" type="number" placeholder="최소" style="flex:1;" min="0" max="36">
        <span>~</span>
        <input id="mc_hcpMax" class="input" type="number" placeholder="최대" style="flex:1;" min="0" max="36">
      </div>
      
      
      
      <label style="display:block;margin-top:16px;font-weight:600;">메모 (선택)</label>
      <textarea id="mc_note" class="input" rows="3" placeholder="예: 라운드 후 한식당 식사, 노캐디, 카트 별도 등"></textarea>
      
      <button class="btn btn-primary" onclick="window._gd.doCreateMatch()" style="margin-top:20px;width:100%;">+ 등록</button>
    </div>
  `;
}
