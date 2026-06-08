// views/clubsManage.js — 슈퍼관리자 동호회 직접 삭제 (2026-05-29)
import { loadAllClubsForAdmin } from '../domain/clubs.js';
import { isAdmin } from '../core/auth.js';
import { escapeHtml } from '../core/ui-kit.js';

function escAttr(s) {
  return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

export async function clubsManageView() {
  const admin = await isAdmin();
  if (!admin) return `<div class="card"><h2>접근 권한 없음</h2><p>슈퍼관리자만 가능합니다.</p></div>`;

  const { data: clubs, error } = await loadAllClubsForAdmin();
  if (error) return `<div class="card"><h2>동호회 조회 실패</h2><p>${escapeHtml(error.message)}</p></div>`;

  return `
    <div class="card">
      <button class="btn btn-secondary" style="font-size:12px;padding:6px 10px;" onclick="window._gd.goBack()">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      <h2 style="margin:12px 0 4px;">🗑️ 동호회 관리</h2>
      <p style="color:var(--text-secondary);font-size:13px;margin:0 0 8px;">총 ${clubs.length}개 · 슈퍼관리자 직접 삭제 가능</p>
      <p style="color:#d32f2f;font-size:12px;margin:0;font-weight:600;">⚠️ 삭제 시 활동/참가/스코어/멤버 모두 cascade 삭제 (복구 불가)</p>
    </div>

    <div class="card" style="padding:0;">
      ${clubs.length === 0 ? '<p style="text-align:center;color:#999;padding:24px;">동호회 없음</p>' : clubs.map(c => `
        <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:15px;color:var(--text-primary);">${escapeHtml(c.name || '(이름없음)')}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;line-height:1.5;">
              회장: ${escapeHtml(c.leader_name || '?')}<br>
              멤버 ${c.member_count}명 · 활동 ${c.event_count}건
              ${c.approved_at ? ' · ✅ 승인됨' : ' · ⏳ 미승인'}
              ${c.disband_requested_at ? ' · 🗑️ 폐지신청중' : ''}
            </div>
          </div>
          <button onclick="window._gd.doAdminDeleteClub('${c.id}', '${escAttr(c.name)}')" 
            style="padding:8px 14px;background:#d32f2f;color:white;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;flex-shrink:0;white-space:nowrap;">
            삭제
          </button>
        </div>
      `).join('')}
    </div>
  `;
}
