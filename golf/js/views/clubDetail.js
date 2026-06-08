// views/clubDetail.js — Club detail + activity feed + join/manage actions
// 2026-05-28: 비멤버 가드 — 활동 피드/멤버 리스트 가리고 가입 신청 카드 강제
import { loadClub, loadClubMembers, loadClubActivities, loadPendingJoinRequests, getMyClubMembership } from '../domain/clubs.js';
import { getSession, isAdmin } from '../core/auth.js';
import { escapeHtml } from '../core/ui-kit.js';

export async function clubDetailView(params) {
  const clubId = params.id;
  if (!clubId) return `<div class="card"><h2>잘못된 동호회 ID</h2></div>`;

  const { data: club, error } = await loadClub(clubId);
  if (error || !club) return `<div class="card"><h2>조회할 수 없는 동호회</h2><button class="btn btn-secondary" onclick="window._gd.goBack()">뒤로</button></div>`;

  const { data: members } = await loadClubMembers(clubId);
  const session = getSession();
  const admin = session ? await isAdmin() : false;
  const isLeader = session && club.leader_id === session.user.id;
  const { data: myMembership } = session ? await getMyClubMembership(clubId, session.user.id) : { data: null };
  const myRole = myMembership?.role;
  const isCoLeader = myRole === 'co_leader' && myMembership?.status === 'approved';
  const canManage = isLeader || isCoLeader || admin;
  const canAssignCoLeader = isLeader || admin;

  const isMember = myMembership?.status === 'approved';
  const isPending = myMembership?.status === 'pending';
  const needsApproval = !!club.requires_approval;

  // 멤버 또는 관리자만 활동피드/멤버리스트 조회 가능
  const canViewContents = isMember || canManage;

  // 활동·가입신청 로드 (canViewContents일 때만 — 권한 누수 방지)
  let activities = [];
  let pendingJoins = [];
  if (canViewContents) {
    const r1 = await loadClubActivities(clubId);
    activities = r1.data || [];
  }
  if (canManage) {
    const r2 = await loadPendingJoinRequests(clubId);
    pendingJoins = r2.data || [];
  }

  return `
    <div class="card">
      <button class="btn btn-secondary" style="font-size:12px;padding:6px 10px;" onclick="window._gd.goBack()">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:12px;">
        <div style="flex:1;">
          <h2 style="margin:0 0 4px;">${escapeHtml(club.name)}</h2>
          <div style="color:var(--text-secondary);font-size:13px;">
            ${escapeHtml(club.location || '지역 미지정')} · 멤버 ${members.length}명
            ${isLeader ? ' · 👑 회장' : ''}
            ${admin ? ' · 슈퍼관리자' : ''}
          </div>
        </div>
        ${canManage ? `
          <button class="btn btn-secondary" style="font-size:12px;padding:6px 10px;" onclick="window._gd.openClubEdit('${club.id}')">✏️ 수정</button>
        ` : ''}
      </div>
      ${club.description ? `<p style="margin-top:12px;font-size:14px;line-height:1.5;background:#fafafa;padding:12px;border-radius:6px;">${escapeHtml(club.description)}</p>` : ''}

      ${!session ? `
        <div style="margin-top:12px;text-align:center;background:#fff8e1;padding:16px;border-radius:8px;border:1px solid #FFE082;">
          <p style="margin:0 0 10px;font-size:14px;color:#FB8C00;font-weight:600;">🔒 로그인 후 가입 신청 가능</p>
          <p style="margin:0 0 12px;font-size:12px;color:#888;">멤버만 활동 피드를 볼 수 있습니다</p>
          <button class="btn btn-primary" style="font-size:14px;padding:10px 20px;" onclick="window._gd.goSignIn()">로그인</button>
        </div>
      ` : isMember ? `
        <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;background:#e8f5e9;padding:10px 14px;border-radius:8px;">
          <span style="color:#2e7d32;font-weight:600;font-size:13px;">✓ 참여 중</span>
          ${!isLeader ? `<button class="btn btn-secondary" style="font-size:11px;padding:6px 10px;color:#d32f2f;border-color:#ffcdd2;" onclick="window._gd.doLeaveClub('${club.id}', '${escapeHtml(club.name).replace(/'/g, '&#39;')}')">탈퇴</button>` : ''}
        </div>
      ` : isPending ? `
        <div style="margin-top:12px;text-align:center;background:#fff3e0;padding:14px;border-radius:8px;border:1px solid #FFCC80;">
          <p style="margin:0 0 6px;color:#F57C00;font-size:14px;font-weight:600;">⏳ 가입 신청 대기 중</p>
          <p style="margin:0;font-size:12px;color:#888;">회장이 승인하면 활동 피드와 멤버 목록이 보입니다</p>
        </div>
      ` : `
        <div style="margin-top:12px;background:#fff3e0;padding:18px;border-radius:8px;border:2px solid #FF9800;text-align:center;">
          <div style="font-size:28px;margin-bottom:6px;">👋</div>
          <p style="margin:0 0 10px;font-size:15px;font-weight:600;color:#E65100;">가입하면 활동 피드와 라운드를 볼 수 있습니다</p>
          <p style="margin:0 0 14px;font-size:12px;color:#888;">현재는 동호회 기본 정보만 표시됩니다</p>
          <button class="btn btn-primary" style="width:100%;font-size:15px;padding:12px;background:#FF9800;border:none;font-weight:600;" onclick="window._gd.doRequestJoin('${club.id}')">
            ${needsApproval ? '👋 가입 신청하기' : '👋 바로 가입하기'}
          </button>
          ${needsApproval ? '<p style="font-size:11px;color:var(--text-secondary);margin:8px 0 0;">회장 승인 후 가입 완료</p>' : ''}
        </div>
      `}
    </div>

    ${canManage && pendingJoins.length ? `
      <div class="card" style="background:#fff8e1;border:1px solid #FFB300;">
        <h3 style="margin-top:0;font-size:15px;color:#FB8C00;">👑 가입 신청 ${pendingJoins.length}건 대기</h3>
        ${pendingJoins.map(j => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:white;border-radius:8px;margin-bottom:6px;">
            <div>
              <b>${escapeHtml(j.profiles?.name || '익명')}</b>
              <span style="color:var(--text-secondary);font-size:12px;margin-left:6px;">
                ${j.profiles?.location ? '· ' + escapeHtml(j.profiles.location) : ''}
                ${j.profiles?.handicap != null ? ' · 핸디 ' + j.profiles.handicap : ''}
              </span>
            </div>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-primary" style="font-size:11px;padding:6px 10px;background:#43A047;" onclick="window._gd.doApproveJoin('${club.id}', '${j.user_id}')">✓ 승인</button>
              <button class="btn btn-secondary" style="font-size:11px;padding:6px 10px;color:#d32f2f;" onclick="window._gd.doRejectJoin('${club.id}', '${j.user_id}')">거절</button>
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${canViewContents ? `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <h3 style="margin:0;font-size:15px;">📋 활동 피드</h3>
          ${canManage ? `<button class="btn btn-primary" style="font-size:12px;padding:6px 12px;" onclick="window._gd.openActivityForm('${club.id}')">+ 활동</button>` : ''}
        </div>
        ${activities.length === 0 ? '<p style="color:var(--text-secondary);">아직 활동이 없습니다.</p>' : activities.map(a => activityRow(a, canManage, canViewContents)).join('')}
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <h3 style="margin:0;font-size:15px;">👥 멤버 (${members.length})</h3>
          ${canManage ? `<button class="btn btn-primary" style="font-size:12px;padding:6px 12px;background:#7E57C2;border:none;color:white;" onclick="window._gd.openProxyMember('${club.id}')">➕ 대행 가입</button>` : ''}
        </div>
        ${members.slice(0, 30).map(m => memberRow(m, club.leader_id, canManage, canAssignCoLeader, club.id)).join('')}
        ${members.length > 30 ? `<p style="text-align:center;font-size:12px;color:var(--text-secondary);">...외 ${members.length - 30}명</p>` : ''}
      </div>
    ` : ''}

    ${(() => {
    if (!session || !session.user || !club || session.user.id !== club.leader_id) return '';
    const disbandPending = club.disband_requested_at;
    if (disbandPending) {
      return '<div style="margin-top:24px;padding:12px;background:#fff3e0;border:1px solid #ffb74d;border-radius:8px;">' +
        '<div style="font-weight:600;color:#e65100;margin-bottom:6px;">🕐 동호회 폐지 신청 중</div>' +
        '<div style="font-size:13px;color:#5d4037;margin-bottom:8px;">슈퍼관리자 승인 대기 중입니다. 승인 시 동호회와 모든 데이터(멤버·이벤트·시상)가 영구 삭제됩니다.</div>' +
        '<button onclick="window._gd.doCancelDisband(\'' + club.id + '\')" style="background:#888;color:white;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;">폐지 신청 취소</button>' +
        '</div>';
    }
    return '<div style="margin-top:24px;padding:12px;background:#fff3e0;border:1px solid #ffb74d;border-radius:8px;">' +
      '<details style="margin:0;">' +
      '<summary style="cursor:pointer;color:#c62828;font-weight:600;">⚠️ 동호회 폐지 신청</summary>' +
      '<div style="margin-top:8px;font-size:13px;color:#5d4037;">폐지 신청 후 슈퍼관리자가 승인하면 동호회와 모든 데이터(멤버·이벤트·시상·라운드)가 영구 삭제됩니다. 복구 불가.</div>' +
      '<input type="text" id="disband-reason-input" placeholder="폐지 사유 (선택)" style="width:100%;padding:8px;margin:8px 0;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;">' +
      '<button onclick="window._gd.doRequestDisband(\'' + club.id + '\')" style="background:#d32f2f;color:white;border:none;padding:8px 16px;border-radius:4px;font-weight:600;cursor:pointer;">폐지 신청 보내기</button>' +
      '</details>' +
      '</div>';
  })()}
  `;
}

function activityRow(a, canManage, canJoin) {
  const typeIcons = { round: '🏆', flash: '⚡', social: '🍻', notice: '📢' };
  const typeLabels = { round: '정기 라운드', flash: '번개', social: '친목', notice: '공지' };
  const typeIcon = typeIcons[a.type] || '📅';
  const typeLabel = typeLabels[a.type] || a.type;
  const date = a.event_date ? new Date(a.event_date).toLocaleDateString('ko', { month: 'long', day: 'numeric', weekday: 'short' }) : '';
  const isCompleted = a.status === 'completed';
  return `
    <div style="padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;${isCompleted ? 'background:#fafafa;opacity:0.85;' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:start;">
        <div style="flex:1;">
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">
            ${typeIcon} ${typeLabel}${date ? ' · ' + date : ''}${isCompleted ? ' · ✓ 완료' : ''}
          </div>
          <div style="font-weight:600;">${escapeHtml(a.name || '제목 없음')}</div>
          ${a.course ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">${escapeHtml(a.course)}</div>` : ''}
        </div>
        
      </div>
      ${canJoin && a.type === 'round' && !a.results_locked_at ? `<button class="btn" style="font-size:11px;padding:6px 12px;margin-top:8px;background:#1976D2;color:white;border:none;border-radius:4px;" onclick="event.stopPropagation();window._gd.doJoinEvent('${a.id}')">✋ 참가</button>` : ''}
    </div>
  `;
}

function memberRow(m, leaderId, canManage, canAssignCoLeader, clubId) {
  const isLeader = m.user_id === leaderId;
  const isCoLeader = m.role === 'co_leader';
  const roleIcon = isLeader ? '👑 ' : (isCoLeader ? '🛡️ ' : '');
  const canKick = canManage && !isLeader && (!isCoLeader || canAssignCoLeader);
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;">
      <div>
        ${roleIcon}<b>${escapeHtml(m.profiles?.name || '익명')}</b>${m.profiles?.created_by_proxy_uuid ? '<span style="background:#e1bee7;color:#6a1b9a;font-size:9px;padding:1px 5px;border-radius:4px;margin-left:4px;font-weight:600;">🤝 대행</span>' : ''}
        ${m.profiles?.location ? `<span style="color:var(--text-secondary);font-size:12px;"> · ${escapeHtml(m.profiles.location)}</span>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end;">
        ${m.profiles?.handicap != null ? `<span style="font-size:12px;color:var(--text-secondary);">핸디 ${m.profiles.handicap}</span>` : ''}
        ${canAssignCoLeader && !isLeader && !isCoLeader ? `<button class="btn btn-secondary" style="font-size:10px;padding:4px 8px;color:#1565c0;border-color:#bbdefb;" onclick="event.stopPropagation();window._gd.doSetCoLeader('${clubId}', '${m.user_id}')">🛡️ 공동관리자 지정</button>` : ''}
        ${canAssignCoLeader && isCoLeader ? `<button class="btn btn-secondary" style="font-size:10px;padding:4px 8px;color:#ef6c00;border-color:#ffe0b2;" onclick="event.stopPropagation();window._gd.doUnsetCoLeader('${clubId}', '${m.user_id}')">공동관리자 취소</button>` : ''}
        ${canKick ? `<button class="btn btn-secondary" style="font-size:10px;padding:4px 8px;color:#d32f2f;border-color:#ffcdd2;" onclick="event.stopPropagation();window._gd.doKickMember('${clubId}', '${m.user_id}')">강퇴</button>` : ''}
      </div>
    </div>

  `;
}
