// views/marketList.js — 장터/나눔터 리스트
import { loadMarketItems, MARKET_CATEGORIES } from '../domain/market.js';
import { getSession } from '../core/auth.js';
import { escapeHtml } from '../core/ui-kit.js';

export async function marketListView() {
  const cat = window.__marketCat || '';
  const { data: items } = await loadMarketItems({ category: cat });
  const session = getSession();

  const chipHtml = ['전체', ...MARKET_CATEGORIES].map(c => {
    const v = c === '전체' ? '' : c;
    const active = v === cat;
    return `<button class="chip" onclick="window._gd.setMarketCat('${v}')" style="padding:8px 14px;margin-right:6px;margin-bottom:6px;border-radius:18px;border:1px solid ${active?'#1565c0':'#ddd'};background:${active?'#E3F2FD':'#fff'};color:${active?'#1565c0':'#666'};cursor:pointer;font-size:14px;font-weight:${active?'600':'400'};">${c}</button>`;
  }).join('');

  const cards = items.length === 0
    ? '<div class="card" style="text-align:center;color:#999;padding:32px;">나눔이 없습니다.</div>'
    : items.map(it => {
        const firstImg = it.images?.[0];
        const dateStr = new Date(it.created_at).toLocaleDateString('ko-KR', { month:'numeric', day:'numeric' });
        const isSold = it.status !== '판매중';
        const catLabel = (it.category || '') + (it.sub_category ? ' · ' + it.sub_category : '');
        const priceLabel = it.price > 0 ? '฿' + it.price.toLocaleString() : '🎁 나눔';
        return `
          <div class="card" onclick="window._gd.openMarketItem('${it.id}')" style="cursor:pointer;display:flex;gap:12px;${isSold?'opacity:0.6;':''}">
            ${firstImg ? `<img src="${firstImg}" style="width:80px;height:80px;object-fit:cover;border-radius:6px;flex-shrink:0;" loading="lazy">` : `<div style="width:80px;height:80px;background:#f0f0f0;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:32px;flex-shrink:0;">${it.icon || '🤝'}</div>`}
            <div style="flex:1;">
              <div style="font-weight:600;font-size:15px;">${escapeHtml(it.title)}${isSold?' <span style="background:#999;color:white;padding:2px 6px;border-radius:4px;font-size:10px;">'+escapeHtml(it.status)+'</span>':''}</div>
              <div style="color:#666;font-size:12px;margin-top:4px;">${escapeHtml(catLabel)} · ${escapeHtml(it.condition||'')} ${it.location ? '· 📍'+escapeHtml(it.location) : ''}</div>
              <div style="font-weight:700;font-size:16px;color:#2E7D32;margin-top:6px;">${priceLabel}</div>
              <div style="font-size:11px;color:#999;margin-top:2px;">${escapeHtml(it.profiles?.name||'')} · ${dateStr}</div>
            </div>
          </div>
        `;
      }).join('');

  return `
    <div class="card">
      <button class="btn" onclick="window._gd.goBack()" style="margin-bottom:12px;">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h2 style="margin:0;">🤝 장터/나눔터</h2>
        ${session ? '<button class="btn btn-primary" onclick="window._gd.goMarketCreate()" style="padding:8px 16px;">+ 등록</button>' : ''}
      </div>
      <p style="color:#666;font-size:13px;margin-top:4px;">골프용품 · 생활용품 · 차량 · 숙소 · 기타 — 거래완료 시 자동 삭제</p>
    </div>

    <div class="card">
      <div>${chipHtml}</div>
    </div>

    ${cards}
  `;
}
