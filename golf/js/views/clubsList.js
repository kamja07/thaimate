// views/clubsList.js — Clubs list
import { loadAllClubs, loadMyClubs, loadPendingClubs } from '../domain/clubs.js';
import { getSession, isAdmin } from '../core/auth.js';
import { escapeHtml } from '../core/ui-kit.js';

export async function clubsListView() {
  const session = getSession();
  // 독립 쿼리 병렬화 (순차 await → Promise.all): 4 round-trips → 1~2
  const [admin, allR, mineR] = await Promise.all([
    session ? isAdmin() : Promise.resolve(false),
    loadAllClubs(),
    session ? loadMyClubs(session.user.id) : Promise.resolve({ data: [] })
  ]);
  const all = allR.data || [];
  const mine = mineR.data || [];
  const myIds = new Set(mine.map(c => c.id));
  const { data: pending } = admin ? await loadPendingClubs() : { data: [] };
  
  return `
    <div class="card">
      <button class="btn btn-secondary" style="font-size:12px;padding:6px 10px;margin-bottom:12px;" onclick="window._gd.goBack()">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h2 style="margin:0;">👥 동호회</h2>
        ${session ? '<button class="btn btn-primary" style="font-size:13px;padding:8px 14px;" onclick="window._gd.goClubApply()">+ 개설</button>' : ''}
      </div>
      <p style="color:var(--text-secondary);font-size:14px;margin:8px 0 0;">한국·태국 한인 골프 동호회 목록입니다.</p>
    </div>
    
    ${admin && pending.length ? `
      <div class="card" style="background:#fff8e1;border:1px solid #FFB300;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <h3 style="margin:0;font-size:15px;color:#FB8C00;">👑 승인 대기 ${pending.length}건</h3>
            <p style="font-size:12px;color:var(--text-secondary);margin:4px 0 0;">슈퍼관리자 확인 필요</p>
          </div>
          <button class="btn btn-primary" style="background:#FB8C00;" onclick="window._gd.goClubAdmin()">관리</button>
        </div>
      </div>
    ` : ''}
    
    ${mine.length ? `
      <div class="card">
        <h3 style="margin-top:0;font-size:15px;">내가 참여 중인 동호회</h3>
        ${mine.map(c => clubRow(c, true)).join('')}
      </div>
    ` : ''}
    
    <div class="card">
      <h3 style="margin-top:0;font-size:15px;">전체 동호회 (${all.length})</h3>
      ${all.length === 0 ? '<p style="color:var(--text-secondary);">등록된 동호회가 없습니다.</p>' : all.map(c => clubRow(c, myIds.has(c.id))).join('')}
    </div>
  `;
}

function clubRow(c, isMember) {
  return `
    <div style="padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;cursor:pointer;" onclick="window._gd.openClub('${c.id}')">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-weight:600;">${escapeHtml(c.name || '미지정')}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">
            ${escapeHtml(c.location || '지역 미지정')} · 멤버 ${c.member_count || 0}명
          </div>
        </div>
        ${isMember ? '<span style="background:#4CAF50;color:white;font-size:11px;padding:4px 8px;border-radius:12px;">참여중</span>' : ''}
      </div>
    </div>
  `;
}
