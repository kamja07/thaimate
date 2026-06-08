// views/memberList.js — 슈퍼관리자 전체 회원 명부 (강퇴 버튼 포함 2026-05-29)
import { loadAllProfiles, grantAdmin, revokeAdmin } from '../domain/users.js';
import { isAdmin, getSession } from '../core/auth.js';
import { escapeHtml } from '../core/ui-kit.js';
import { sb } from '../core/db.js';

export async function memberListView() {
  const admin = await isAdmin();
  if (!admin) return `<div class="card"><h2>접근 권한 없음</h2><p>슈퍼관리자만 가능합니다.</p></div>`;

  const session = getSession();
  const myId = session?.user?.id || null;

  const { data: profiles, error } = await loadAllProfiles();
  if (error) return `<div class="card"><h2>회원 명부 조회 실패</h2><p>${escapeHtml(error.message)}</p></div>`;

  const { data: admins } = await sb.from('app_admins').select('user_id');
  const adminSet = new Set((admins || []).map(a => a.user_id));

  return `
    <div class="card">
      <button class="btn btn-secondary" style="font-size:12px;padding:6px 10px;" onclick="window._gd.goBack()">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      <h2 style="margin:12px 0 4px;">📋 전체 회원 명부</h2>
      <p style="color:var(--text-secondary);font-size:13px;margin:0 0 12px;">총 ${profiles.length}명 · 👑 ${adminSet.size}명 슈퍼관리자</p>
      <input id="ml_search" type="text" placeholder="🔍 닉네임 / 실명 / 지역 / 이메일 검색" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:6px;font-size:14px;" oninput="window._gd.filterMembers()">
    </div>

    <div class="card">
      <div id="ml_list">
        ${renderMemberRows(profiles, adminSet, myId)}
      </div>
    </div>
  `;
}

function renderMemberRows(profiles, adminSet, myId) {
  return profiles.map(p => {
    const adminFlag = adminSet.has(p.id);
    const isMe = p.id === myId;
    const safeName = escapeHtml(p.name || '').replace(/'/g, '&#39;');
    return `
      <div class="ml-row" data-search="${escapeHtml((p.name || '') + ' ' + (p.real_name || '') + ' ' + (p.location || '') + ' ' + (p.contact_email || ''))}" style="padding:10px 0;border-bottom:1px solid var(--border);">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:14px;">
              ${adminFlag ? '👑 ' : ''}${escapeHtml(p.name || '익명')}${isMe ? ' <span style="color:#1976D2;font-size:11px;font-weight:400;">(나)</span>' : ''}
              ${p.real_name ? `<span style="font-weight:400;color:var(--text-secondary);font-size:12px;">· ${escapeHtml(p.real_name)}</span>` : ''}
            </div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;line-height:1.5;">
              ${p.location ? '📍 ' + escapeHtml(p.location) : ''}
              ${p.handicap != null ? ' · 핸디 ' + p.handicap : ''}
              ${p.manner_score != null ? ' · 매너 ' + p.manner_score : ''}
            </div>
            ${p.contact_email ? `<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">✉️ ${escapeHtml(p.contact_email)}</div>` : ''}
            ${p.phone ? `<div style="font-size:11px;color:var(--text-secondary);">📞 ${escapeHtml(p.phone)}</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
            ${adminFlag
              ? `<button class="btn btn-secondary" style="font-size:10px;padding:4px 8px;color:#d32f2f;border-color:#ffcdd2;" onclick="window._gd.doRevokeAdmin('${p.id}', '${safeName}')">관리자 해제</button>`
              : `<button class="btn btn-secondary" style="font-size:10px;padding:4px 8px;color:#FB8C00;border-color:#FFB300;" onclick="window._gd.doGrantAdmin('${p.id}', '${safeName}')">👑 관리자 지정</button>`
            }
            ${isMe ? '' : `<button style="font-size:10px;padding:4px 8px;background:#c62828;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;" onclick="window._gd.doAdminDeleteUser('${p.id}', '${safeName}')">🗑️ 강퇴</button>`}
          </div>
        </div>
      </div>
    `;
  }).join('');
}
