// views/businessList.js — 회원사 카테고리 + 리스트
import { BIZ_TYPES, loadBusinesses } from '../domain/business.js';
import { getSession } from '../core/auth.js';
import { escapeHtml } from '../core/ui-kit.js';

export async function businessListView() {
  const session = getSession();
  const curType = window.__bizType || '';
  
  // 카테고리별 카운트
  const counts = {};
  for (const t of BIZ_TYPES) {
    const { data } = await loadBusinesses({ type: t.key });
    counts[t.key] = data.length;
  }
  
  const gridHtml = BIZ_TYPES.map(t => {
    const active = t.key === curType;
    return `
      <div onclick="window._gd.setBizType('${t.key}')" style="background:${active?t.color+'22':'#fff'};border:2px solid ${active?t.color:'#e0e0e0'};border-radius:12px;padding:16px;text-align:center;cursor:pointer;transition:all 0.2s;">
        <div style="font-size:20px;font-weight:700;color:${t.color};">${t.label}</div>
        <div style="font-size:13px;color:#666;margin-top:6px;">${counts[t.key]}곳</div>
      </div>
    `;
  }).join('');
  
  let listHtml = '';
  if (curType) {
    const { data: items } = await loadBusinesses({ type: curType });
    listHtml = items.length === 0
      ? '<div class="card" style="text-align:center;color:#999;padding:24px;">아직 등록된 사업체가 없습니다.</div>'
      : items.map(b => {
          const photo = b.photos?.[0] || b.logo_url;
          return `
            <div class="card" onclick="window._gd.openBusiness('${b.id}')" style="cursor:pointer;display:flex;gap:12px;">
              ${photo ? `<img src="${photo}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;flex-shrink:0;" loading="lazy">` : `<div style="width:70px;height:70px;background:#f0f0f0;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:32px;flex-shrink:0;">🏢</div>`}
              <div style="flex:1;">
                <div style="font-weight:600;font-size:15px;">${escapeHtml(b.name)} ✓</div>
                <div style="font-size:12px;color:#666;margin-top:4px;">${escapeHtml(b.location || '')} ${b.region ? '· ' + escapeHtml(b.region) : ''}</div>
                ${b.description ? `<div style="font-size:12px;color:#999;margin-top:4px;">${escapeHtml(b.description.substring(0,50))}${b.description.length>50?'...':''}</div>` : ''}
              </div>
            </div>
          `;
        }).join('');
  }
  
  return `
    <div class="card">
      <button class="btn" onclick="window._gd.goBack()" style="margin-bottom:12px;">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h2 style="margin:0;">🤝 회원사</h2>
        ${session ? '<button class="btn btn-primary" onclick="window._gd.goBusinessApply()" style="padding:8px 16px;"> + 신규 신청 </button>' : ''}
      </div>
      <p style="color:#666;font-size:13px;margin-top:4px;">한인 골프 커뮤니티 후원 사업체 — 카테고리 선택</p>
    </div>
    
    <div class="card">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${gridHtml}
      </div>
    </div>
    
    ${listHtml}
  `;
}
