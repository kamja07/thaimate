// views/matchesList.js — 매치 리스트
import { loadMatches } from '../domain/matches.js';
import { getSession } from '../core/auth.js';
import { escapeHtml } from '../core/ui-kit.js';

const REGIONS = ['전체','방콕권','파타야권','후아힌권','치앙마이권','푸켓권'];

// _filter는 window 전역

export async function matchesListView() {
  const _filter = { region: window.__matchRegion||'', sortBy: window.__matchSort||'recent' };
  const { data: matches } = await loadMatches(_filter);
  const session = getSession();
  
  const chipHtml = REGIONS.map(r => {
    const active = (r === '전체' ? !_filter.region : _filter.region === r);
    return `<button class="chip" onclick="window._gd.setMatchRegion('${r==='전체'?'':r}')" style="padding:6px 12px;margin-right:6px;margin-bottom:6px;border-radius:16px;border:1px solid ${active?'#2E7D32':'#ddd'};background:${active?'#E8F5E9':'#fff'};color:${active?'#2E7D32':'#666'};cursor:pointer;font-size:13px;">${r}</button>`;
  }).join('');
  
  const sortHtml = `
    <select onchange="window._gd.setMatchSort(this.value)" class="input" style="display:inline-block;width:auto;padding:4px 8px;font-size:13px;">
      <option value="recent" ${_filter.sortBy==='recent'?'selected':''}>최신순</option>
      <option value="deadline" ${_filter.sortBy==='deadline'?'selected':''}>마감 임박순</option>
    </select>
  `;
  
  const listHtml = matches.length === 0
    ? `<div class="card" style="text-align:center;color:#999;">매치가 없습니다. ${session ? '직접 한 건 올려보세요!' : '로그인하면 신청할 수 있어요.'}</div>`
    : matches.map(m => {
        const dateStr = m.match_date ? new Date(m.match_date).toLocaleDateString('ko-KR', {month:'numeric', day:'numeric', weekday:'short'}) : '';
        const timeStr = m.tee_time ? ' ' + m.tee_time.substring(0,5) : '';
        const remain = (m.spots_total||0) - (m.spots_taken||0);
        const hcp = (m.hcp_min!=null||m.hcp_max!=null) ? `핸디 ${m.hcp_min??'-'}~${m.hcp_max??'-'}` : '';
        const fee = '';
        return `
          <div class="card" onclick="window._gd.openMatch('${m.id}')" style="cursor:pointer;">
            <div style="display:flex;justify-content:space-between;align-items:start;">
              <div style="flex:1;">
                <div style="font-weight:600;font-size:15px;">⛳ ${escapeHtml(m.course||'미정')}</div>
                <div style="color:#666;font-size:13px;margin-top:4px;">📅 ${dateStr}${timeStr}</div>
                <div style="color:#666;font-size:12px;margin-top:4px;">${escapeHtml(m.host?.name||'')} · 핸디 ${m.host?.handicap??'-'} · ${escapeHtml(m.host?.location||'')}</div>
                ${m.note ? `<div style="font-size:12px;color:#999;margin-top:4px;">${escapeHtml(m.note.substring(0,60))}${m.note.length>60?'...':''}</div>` : ''}
              </div>
              <div style="text-align:right;">
                <div style="font-weight:700;color:${remain>0?'#2E7D32':'#999'};">${remain>0?`${remain}자리`:'마감'}</div>
                
                ${hcp ? `<div style="font-size:10px;color:#999;margin-top:2px;">${hcp}</div>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
  
  return `
    <div class="card">
      <button class="btn" onclick="window._gd.goBack()" style="margin-bottom:12px;">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h2 style="margin:0;">⛳ 동반 라운드 모집</h2>
        ${session ? `<button class="btn btn-primary" onclick="window._gd.goMatchCreate()" style="padding:8px 16px;">+ 모집</button>` : ''}
      </div>
      <p style="color:#666;font-size:13px;margin-top:4px;">호스트 승인 방식 · 신청 후 호스트가 확정합니다</p>
    </div>
    
    <div class="card">
      <div style="margin-bottom:8px;">${chipHtml}</div>
      <div>정렬: ${sortHtml}</div>
    </div>
    
    ${listHtml}
  `;
}
