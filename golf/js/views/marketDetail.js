// views/marketDetail.js — 매물 상세
import { loadMarketItem } from '../domain/market.js';
import { getSession } from '../core/auth.js';
import { escapeHtml } from '../core/ui-kit.js';

export async function marketDetailView(params) {
  const id = params?.id;
  if (!id) return '<div class="card">id 필수</div>';
  
  const { data: item } = await loadMarketItem(id);
  if (!item) return '<div class="card"><button class="btn" onclick="window._gd.goBack()">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button><p style="color:#d32f2f;margin-top:12px;">매물을 찾을 수 없습니다.</p></div>';
  
  const session = getSession();
  const isOwner = session?.user?.id === item.seller_id;
  const isSold = item.status !== '판매중';
  
  const photosHtml = (item.images || []).length > 0
    ? `<div style="display:flex;gap:6px;overflow-x:auto;padding:8px 0;">
        ${item.images.map(url => `<img src="${url}" style="width:200px;height:200px;object-fit:cover;border-radius:8px;flex-shrink:0;cursor:pointer;" onclick="window.open('${url}','_blank')">`).join('')}
      </div>`
    : '<div style="background:#f5f5f5;height:200px;display:flex;align-items:center;justify-content:center;font-size:48px;border-radius:8px;">🛍️</div>';
  
  let actionBlock = '';
  if (!session) {
    actionBlock = '<div class="card" style="background:#f5f5f5;"><p style="text-align:center;color:#666;">로그인 후 채팅 가능</p></div>';
  } else if (isOwner) {
    actionBlock = `
      <div class="card" style="background:#FFF3E0;border:1px solid #fbc02d;">
        <p style="font-weight:600;color:#e65100;margin:0 0 8px 0;">내가 등록한 매물</p>
        <button class="btn" onclick="window._gd.goMarketEdit('${id}')" style="width:100%;margin-bottom:6px;color:#1565c0;border:1px solid #1565c0;">✏️ 매물 수정</button>
        ${!isSold ? `<button class="btn btn-primary" onclick="window._gd.doCompleteMarketItem('${id}')" style="width:100%;margin-bottom:6px;">✅ 거래완료 (매물 삭제됨)</button>` : ''}
        <button class="btn" onclick="window._gd.doDeleteMarketItem('${id}')" style="width:100%;color:#d32f2f;border:1px solid #d32f2f;">🗑️ 매물 삭제</button>
        <p style="font-size:11px;color:#666;margin-top:6px;text-align:center;">거래완료 시 매물·사진 자동 삭제</p>
      </div>
    `;
  } else {
    actionBlock = isSold
      ? '<div class="card" style="background:#f5f5f5;"><p style="text-align:center;color:#999;font-weight:600;">😢 거래가 종료된 매물입니다</p></div>'
      : `<button class="btn btn-primary" onclick="window._gd.startMarketChat('${id}','${item.seller_id}','${escapeHtml(item.title)}')" style="width:100%;padding:16px;font-size:16px;">💬 판매자와 채팅</button>`;
  }
  
  const dateStr = new Date(item.created_at).toLocaleDateString('ko-KR');
  const statusBadge = isSold
    ? `<span style="background:#999;color:white;padding:4px 10px;border-radius:6px;font-size:13px;font-weight:600;">${escapeHtml(item.status)}</span>`
    : `<span style="background:#E8F5E9;color:#2E7D32;padding:4px 10px;border-radius:6px;font-size:13px;font-weight:600;">판매중</span>`;
  
  return `
    <div class="card">
      <button class="btn" onclick="window._gd.goBack()" style="margin-bottom:12px;">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      <div style="display:flex;justify-content:space-between;align-items:start;gap:12px;">
        <h2 style="margin:0;flex:1;">${escapeHtml(item.title)}</h2>
        ${statusBadge}
      </div>
      <div style="margin-top:8px;color:#666;font-size:13px;">${escapeHtml(item.category||'')}${item.sub_category ? ' · ' + escapeHtml(item.sub_category) : ''} · ${escapeHtml(item.condition||'')}</div>
    </div>
    
    <div class="card">
      ${photosHtml}
    </div>
    
    <div class="card">
      <div style="font-weight:800;font-size:24px;color:#2E7D32;">฿${item.price?.toLocaleString() || 0}</div>
      ${item.location ? `<div style="margin-top:6px;font-size:13px;">📍 ${escapeHtml(item.location)}</div>` : ''}
      ${item.description ? `<div style="margin-top:10px;padding:10px;background:#fafafa;border-radius:6px;font-size:13px;white-space:pre-wrap;">${escapeHtml(item.description)}</div>` : ''}
    </div>
    
    <div class="card">
      <div style="font-weight:600;margin-bottom:6px;">👤 판매자</div>
      <div style="font-size:14px;">${escapeHtml(item.profiles?.name||'')}</div>
      <div style="font-size:12px;color:#666;margin-top:2px;">${escapeHtml(item.profiles?.location||'')} · 핸디 ${item.profiles?.handicap??'-'}</div>
      <div style="font-size:11px;color:#999;margin-top:4px;">${dateStr} 등록</div>
    </div>
    
    ${actionBlock}
  `;
}
