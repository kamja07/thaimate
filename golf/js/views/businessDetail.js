// views/businessDetail.js — 회원사 상세
import { loadBusiness, BIZ_TYPE_LABEL } from '../domain/business.js';
import { getSession } from '../core/auth.js';
import { escapeHtml } from '../core/ui-kit.js';

export async function businessDetailView(params) {
  const id = params?.id;
  if (!id) return '<div class="card">id 필수</div>';
  const { data: b } = await loadBusiness(id);
  const session = getSession();
  const isMyBusiness = session?.user?.id === b?.applied_by;
  if (!b) return '<div class="card"><button class="btn" onclick="window._gd.goBack()">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button><p style="color:#d32f2f;">사업체 없음</p></div>';
  
  const photosHtml = (b.photos || []).length > 0
    ? `<div style="display:flex;gap:6px;overflow-x:auto;padding:8px 0;">
        ${b.photos.map(url => `<img src="${url}" style="width:200px;height:200px;object-fit:cover;border-radius:8px;flex-shrink:0;cursor:pointer;" onclick="window.open('${url}','_blank')">`).join('')}
      </div>`
    : '<div style="background:#f5f5f5;height:120px;display:flex;align-items:center;justify-content:center;font-size:48px;border-radius:8px;">🏢</div>';
  
  return `
    <div class="card">
      <button class="btn" onclick="window._gd.goBack()" style="margin-bottom:12px;">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      <h2 style="margin:0;">${escapeHtml(b.name)}</h2>
      <div style="color:#666;font-size:13px;margin-top:6px;">${BIZ_TYPE_LABEL[b.type] || b.type} ${b.region ? '· ' + escapeHtml(b.region) : ''} ${b.location ? '· ' + escapeHtml(b.location) : ''}</div>
      <span style="background:#E8F5E9;color:#2E7D32;padding:3px 8px;border-radius:4px;font-size:11px;display:inline-block;margin-top:6px;">✓ 인증된 회원사</span>
    </div>
    
    <div class="card">${photosHtml}</div>
    
    ${b.description ? `<div class="card"><div style="font-size:14px;white-space:pre-wrap;">${escapeHtml(b.description)}</div></div>` : ''}
    
    <div class="card">
      ${b.address ? `<div style="margin-bottom:8px;">📍 ${escapeHtml(b.address)}</div>` : ''}
      ${b.phone ? `<div style="margin-bottom:8px;">📞 <a href="tel:${escapeHtml(b.phone)}" style="color:#1565c0;">${escapeHtml(b.phone)}</a></div>` : ''}
      ${b.website ? `<div style="margin-bottom:8px;">🌐 <a href="${escapeHtml(b.website)}" target="_blank" rel="noopener" style="color:#1565c0;">${escapeHtml(b.website)}</a></div>` : ''}
      ${b.contact_email ? `<div>✉️ <a href="mailto:${escapeHtml(b.contact_email)}" style="color:#1565c0;">${escapeHtml(b.contact_email)}</a></div>` : ''}
    </div>
    
    ${session && !isMyBusiness ? `<button class="btn btn-primary" onclick="window._gd.startBusinessChat('${b.id}','${b.applied_by}','${escapeHtml(b.name)}')" style="width:100%;padding:14px;font-size:15px;">💬 회원사에 문의</button>` : ''}
    ${isMyBusiness ? '<div class="card" style="background:#E8F5E9;text-align:center;color:#2E7D32;font-weight:600;">👑 내가 등록한 회원사</div>' : ''}
  `;
}
