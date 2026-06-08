// views/clubAdmin.js — 슈퍼관리자 동호회 승인 페이지
import { loadPendingClubs } from '../domain/clubs.js';
import { isAdmin } from '../core/auth.js';
import { escapeHtml } from '../core/ui-kit.js';

export async function clubAdminView() {
  const admin = await isAdmin();
  if (!admin) return `<div class="card"><h2>접근 권한 없음</h2><p>슈퍼관리자만 접근 가능합니다.</p></div>`;
  
  const { data: pending } = await loadPendingClubs();
  
  return `
    <div class="card">
      <button class="btn btn-secondary" style="font-size:12px;padding:6px 10px;" onclick="window._gd.goBack()">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      <h2 style="margin:12px 0 4px;">👑 동호회 개설 승인</h2>
      <p style="color:var(--text-secondary);font-size:13px;margin:0 0 16px;">대기 중 ${pending.length}건</p>
    </div>
    
    ${pending.length === 0 ? '<div class="card"><p style="color:var(--text-secondary);text-align:center;">대기 중인 동호회 개설 신청이 없습니다</p></div>' : pending.map(c => `
      <div class="card">
        <h3 style="margin:0 0 6px;">${escapeHtml(c.name)}</h3>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">
          📍 ${escapeHtml(c.location || '미정')} · 신청자: ${escapeHtml(c.profiles?.name || '알 수 없음')}
        </div>
        ${c.description ? `<p style="font-size:13px;line-height:1.5;background:#f5f5f5;padding:10px;border-radius:6px;margin:8px 0;">${escapeHtml(c.description)}</p>` : ''}
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button class="btn btn-primary" style="flex:1;background:#43A047;" onclick="window._gd.doApproveClub('${c.id}')">✓ 승인</button>
          <button class="btn btn-secondary" style="flex:1;color:#d32f2f;border-color:#ffcdd2;" onclick="window._gd.doRejectClub('${c.id}', '${escapeHtml(c.name).replace(/'/g, '&#39;')}')">✗ 거절</button>
        </div>
      </div>
    `).join('')}
  `;
}
