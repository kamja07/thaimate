// views/myRounds.js — 내 라운드 기록 + 스코어카드
import { loadMyRounds, calcRoundStats } from '../domain/rounds.js';
import { getSession } from '../core/auth.js';
import { escapeHtml } from '../core/ui-kit.js';

const DEFAULT_PARS = [4,4,3,4,5,4,4,3,4,4,4,3,5,4,4,3,4,5]; // par 72

function scoreCellColor(score, par) {
  if (score == null || par == null) return '#999';
  const d = score - par;
  if (d <= -2) return '#1565c0'; // 이글
  if (d === -1) return '#2E7D32'; // 버디
  if (d === 0) return '#333'; // 파
  if (d === 1) return '#e65100'; // 보기
  return '#d32f2f'; // 더블+
}

function scoreCardHtml(holes, pars) {
  if (!Array.isArray(holes) || holes.length < 18) return '';
  const P = (Array.isArray(pars) && pars.length === 18) ? pars : DEFAULT_PARS;
  
  const front = holes.slice(0, 9);
  const back = holes.slice(9, 18);
  const frontPar = P.slice(0, 9).reduce((s,p)=>s+p,0);
  const backPar = P.slice(9, 18).reduce((s,p)=>s+p,0);
  const frontSum = front.reduce((s,h)=>s+(h||0),0);
  const backSum = back.reduce((s,h)=>s+(h||0),0);
  
  const row = (label, vals, sum, par) => `
    <tr>
      <td style="padding:2px 2px;font-size:10px;color:#666;font-weight:600;white-space:nowrap;width:30px;">${label}</td>
      ${vals.map((v,i) => {
        const par = (label === '후반' ? P.slice(9,18) : P.slice(0,9))[i];
        const c = scoreCellColor(v, par);
        return `<td style="padding:2px 1px;text-align:center;font-weight:600;font-size:12px;color:${c};">${v ?? '-'}</td>`;
      }).join('')}
      <td style="padding:2px 2px;text-align:center;font-weight:700;font-size:11px;background:#f5f5f5;width:32px;">${sum}</td>
    </tr>
  `;
  
  const parRow = (label, vals, sum) => `
    <tr style="background:#fafafa;">
      <td style="padding:2px 2px;font-size:9px;color:#999;white-space:nowrap;width:30px;">${label}</td>
      ${vals.map(v => `<td style="padding:2px 1px;text-align:center;font-size:10px;color:#999;">${v}</td>`).join('')}
      <td style="padding:2px 2px;text-align:center;font-size:9px;color:#999;background:#f5f5f5;width:32px;">${sum}</td>
    </tr>
  `;
  
  const hdr = (start) => `
    <tr>
      <td style="padding:2px 1px;font-size:9px;color:#999;"></td>
      ${Array.from({length:9},(_,i)=>`<td style="padding:2px 1px;text-align:center;font-size:9px;color:#999;">${start+i}</td>`).join('')}
      <td style="padding:2px 1px;text-align:center;font-size:9px;color:#999;background:#f5f5f5;">합계</td>
    </tr>
  `;
  
  return `
    <div style="margin-top:8px;padding:6px;background:#fff;border:1px solid #e0e0e0;border-radius:6px;">
      <table style="width:100%;border-collapse:collapse;font-family:'Courier New',monospace;table-layout:fixed;">
        <thead>${hdr(1)}</thead>
        <tbody>
          ${parRow('Par', P.slice(0,9), frontPar)}
          ${row('전반', front, frontSum, frontPar)}
        </tbody>
        <thead>${hdr(10)}</thead>
        <tbody>
          ${parRow('Par', P.slice(9,18), backPar)}
          ${row('후반', back, backSum, backPar)}
        </tbody>
      </table>
      <div style="text-align:right;margin-top:4px;font-size:11px;color:#666;">
        전반 ${frontSum} (${frontSum-frontPar>=0?'+':''}${frontSum-frontPar}) · 후반 ${backSum} (${backSum-backPar>=0?'+':''}${backSum-backPar})
      </div>
    </div>
  `;
}

export async function myRoundsView() {
  const session = getSession();
  if (!session) return '<div class="card"><button class="btn" onclick="window._gd.goBack()">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button><p style="margin-top:12px;text-align:center;color:#999;">로그인 후 이용 가능</p></div>';
  
  const { data: rounds, error } = await loadMyRounds(session.user.id);
  if (error) return `<div class="card"><button class="btn" onclick="window._gd.goBack()">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button><p style="color:#d32f2f;">에러: ${escapeHtml(error.message)}</p></div>`;
  
  const stats = calcRoundStats(rounds);
  
  const cardsHtml = rounds.length === 0
    ? `<div class="card" style="text-align:center;color:#999;padding:32px;">아직 등록된 라운드가 없습니다.<br><br>오른쪽 위 「+ 라운드」 버튼으로 첫 라운드를 기록해보세요.</div>`
    : rounds.map(r => {
        const isEvent = !!r.event_id;
        const dateStr = r.played_at ? new Date(r.played_at).toLocaleDateString('ko-KR', {month:'numeric', day:'numeric', weekday:'short'}) : '-';
        const eventBadge = isEvent ? `<span style="background:#E3F2FD;color:#1565c0;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px;">동호회</span>` : '';
        const hasScoreCard = Array.isArray(r.holes) && r.holes.length === 18;
        const pars = r.events?.hole_pars || DEFAULT_PARS;
        
        return `
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:start;">
              <div style="flex:1;">
                <div style="font-weight:600;font-size:14px;">⛳ ${escapeHtml(r.course || '-')}${eventBadge}</div>
                <div style="font-size:12px;color:#666;margin-top:4px;">📅 ${dateStr}${r.events?.name ? ' · ' + escapeHtml(r.events.name) : ''}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:24px;font-weight:700;color:${r.total<=80?'#2E7D32':(r.total>=100?'#d32f2f':'#333')};">${r.total ?? '-'}</div>
                ${!isEvent ? `<button class="btn" onclick="event.stopPropagation();window._gd.deleteMyRound('${r.id}')" style="font-size:10px;padding:2px 6px;color:#d32f2f;margin-top:4px;">삭제</button>` : ''}
              </div>
            </div>
            ${hasScoreCard ? scoreCardHtml(r.holes, pars) : ''}
          </div>
        `;
      }).join('');
  
  return `
    <div class="card">
      <button class="btn" onclick="window._gd.goBack()" style="margin-bottom:12px;">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h2 style="margin:0;">⛳ 내 라운드 기록</h2>
        <button class="btn btn-primary" onclick="window._gd.goRoundAdd()" style="padding:8px 16px;">+ 라운드</button>
      </div>
    </div>
    
    <div class="card" style="background:linear-gradient(135deg,#2E7D32 0%,#1B5E20 100%);color:white;">
      <div style="display:flex;justify-content:space-around;text-align:center;">
        <div><div style="font-size:24px;font-weight:700;">${stats.count}</div><div style="font-size:11px;opacity:0.8;">총 라운드</div></div>
        <div><div style="font-size:24px;font-weight:700;">${stats.avg}</div><div style="font-size:11px;opacity:0.8;">평균</div></div>
        <div><div style="font-size:24px;font-weight:700;">${stats.best}</div><div style="font-size:11px;opacity:0.8;">베스트 🏆</div></div>
        <div><div style="font-size:24px;font-weight:700;">${stats.recent}</div><div style="font-size:11px;opacity:0.8;">최근</div></div>
      </div>
    </div>
    
    ${cardsHtml}
  `;
}
