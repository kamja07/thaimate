// views/businessReview.js — 회원사 승인 대기 (슈퍼관리자)
import { loadPendingBusinesses, BIZ_TYPE_LABEL } from '../domain/business.js';
import { escapeHtml } from '../core/ui-kit.js';

export async function businessReviewView() {
  const { data: pending } = await loadPendingBusinesses();
  
  const cards = pending.length === 0
    ? '<div class="card" style="text-align:center;color:#999;padding:24px;">대기 중인 신청이 없습니다.</div>'
    : pending.map(b => `
        <div class="card">
          <div style="font-weight:700;font-size:16px;">${escapeHtml(b.name)}</div>
          <div style="color:#666;font-size:13px;margin-top:4px;">${BIZ_TYPE_LABEL[b.type] || b.type} · ${escapeHtml(b.region || '')} ${b.location ? '· ' + escapeHtml(b.location) : ''}</div>
          ${b.description ? `<div style="font-size:13px;margin-top:8px;color:#333;">${escapeHtml(b.description)}</div>` : ''}
          <div style="margin-top:8px;font-size:12px;color:#666;">
            ${b.phone ? '📞 ' + escapeHtml(b.phone) + ' ' : ''}
            ${b.website ? '🌐 ' + escapeHtml(b.website) + ' ' : ''}
            ${b.contact_email ? '✉️ ' + escapeHtml(b.contact_email) : ''}
          </div>
          <div style="font-size:11px;color:#999;margin-top:6px;">신청자: ${escapeHtml(b.applicant?.name || '-')} · ${new Date(b.applied_at).toLocaleDateString('ko-KR')}</div>
          ${(b.photos||[]).length > 0 ? `<div style="display:flex;gap:4px;margin-top:8px;overflow-x:auto;">${b.photos.slice(0,3).map(u=>`<img src="${u}" style="width:60px;height:60px;object-fit:cover;border-radius:4px;">`).join('')}</div>` : ''}
          <div style="display:flex;gap:6px;margin-top:12px;">
            <button class="btn" onclick="window._gd.doRejectBusiness('${b.id}')" style="flex:1;color:#d32f2f;border:1px solid #d32f2f;">거절</button>
            <button class="btn btn-primary" onclick="window._gd.doApproveBusiness('${b.id}')" style="flex:1;">✅ 승인</button>
          </div>
        </div>
      `).join('');
  
  return `
    <div class="card">
      <button class="btn" onclick="window._gd.goBack()" style="margin-bottom:12px;">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      <h2>🤝 회원사 신청 대기 (${pending.length})</h2>
    </div>
    ${cards}
  `;
}
