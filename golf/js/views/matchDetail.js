// views/matchDetail.js — 매치 상세 (호스트 승인 + 신청자 명단)
import { loadMatch, loadMatchApplications, getMyMatchApplication } from '../domain/matches.js';
import { getSession } from '../core/auth.js';
import { escapeHtml } from '../core/ui-kit.js';

export async function matchDetailView(params) {
  const matchId = params?.id;
  if (!matchId) return '<div class="card">매치 ID 누락</div>';
  
  const { data: match } = await loadMatch(matchId);
  if (!match) return `<div class="card"><button class="btn" onclick="window._gd.goBack()">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button><p style="color:#d32f2f;margin-top:12px;">매치를 찾을 수 없습니다.</p></div>`;
  
  const session = getSession();
  const userId = session?.user?.id;
  const isHost = userId && userId === match.host_id;
  
  // 호스트면 pending + approved 모두, 일반은 본인 신청만
  let pendingApps = [], approvedApps = [];
  if (isHost) {
    const { data: pending } = await loadMatchApplications(matchId, 'pending');
    const { data: approved } = await loadMatchApplications(matchId, 'approved');
    pendingApps = pending;
    approvedApps = approved;
  }
  
  // 본인 신청 상태
  let myApp = null;
  if (userId && !isHost) {
    const { data } = await getMyMatchApplication(matchId, userId);
    myApp = data;
  }
  
  const dateStr = match.match_date ? new Date(match.match_date).toLocaleDateString('ko-KR', {year:'numeric', month:'long', day:'numeric', weekday:'short'}) : '';
  const timeStr = match.tee_time ? match.tee_time.substring(0,5) : '';
  const remain = (match.spots_total||0) - (match.spots_taken||0);
  
  // 호스트 액션 버튼
  let hostBlock = '';
  if (isHost && pendingApps.length > 0) {
    hostBlock = `
      <div class="card" style="background:#fff8e1;border:1px solid #fbc02d;">
        <div style="font-weight:700;color:#e65100;">⚠️ 신청 ${pendingApps.length}건 대기</div>
        ${pendingApps.map(a => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #ffe0b2;">
            <div>
              <div style="font-weight:600;">${escapeHtml(a.profiles?.name||'익명')}</div>
              <div style="font-size:12px;color:#666;">핸디 ${a.profiles?.handicap??'-'} · ${escapeHtml(a.profiles?.location||'')}</div>
            </div>
            <div>
              <button class="btn" onclick="window._gd.startMatchChat('${matchId}','${a.user_id}','${escapeHtml(match.course||'')}')" style="margin-right:4px;font-size:12px;padding:6px 10px;color:#1565c0;border:1px solid #1565c0;">💬</button>
              <button class="btn" onclick="window._gd.rejectMatchApp('${matchId}','${a.user_id}')" style="margin-right:4px;font-size:12px;padding:6px 10px;color:#d32f2f;border:1px solid #d32f2f;">거절</button>
              <button class="btn btn-primary" onclick="window._gd.approveMatchApp('${matchId}','${a.user_id}')" style="font-size:12px;padding:6px 10px;">승인</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  // 회원 신청 버튼
  let applyBlock = '';
  if (!session) {
    applyBlock = `<div class="card" style="background:#f5f5f5;"><p style="text-align:center;color:#666;">로그인 후 신청 가능</p></div>`;
  } else if (isHost) {
    applyBlock = `<div class="card" style="background:#E8F5E9;"><p style="text-align:center;color:#2E7D32;font-weight:600;">👑 내가 만든 매치</p></div>`;
  } else if (myApp?.status === 'approved') {
    applyBlock = `<div class="card" style="background:#E8F5E9;"><p style="text-align:center;color:#2E7D32;font-weight:700;">✓ 확정! 호스트가 승인했습니다</p><button class="btn" onclick="window._gd.cancelMyMatchApp('${matchId}')" style="width:100%;margin-top:8px;color:#d32f2f;">참가 취소</button></div>`;
  } else if (myApp?.status === 'pending') {
    applyBlock = `<div class="card" style="background:#FFF3E0;"><p style="text-align:center;color:#e65100;font-weight:600;">⏳ 신청 완료 — 호스트 승인 대기</p><button class="btn" onclick="window._gd.cancelMyMatchApp('${matchId}')" style="width:100%;margin-top:8px;color:#d32f2f;">신청 취소</button></div>`;
  } else if (remain <= 0) {
    applyBlock = `<div class="card" style="background:#f5f5f5;"><p style="text-align:center;color:#999;font-weight:600;">😢 마감</p></div>`;
  } else {
    applyBlock = `<button class="btn btn-primary" onclick="window._gd.applyMatch('${matchId}')" style="width:100%;padding:16px;font-size:16px;">⛳ 참가 신청</button>`;
  }
  
  return `
    <div class="card">
      <button class="btn" onclick="window._gd.goBack()" style="margin-bottom:12px;">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      <h2 style="margin:0;">⛳ ${escapeHtml(match.course||'미정')}</h2>
      <div style="color:#666;font-size:14px;margin-top:8px;">📅 ${dateStr} ${timeStr ? '· ' + timeStr : ''}</div>
      <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap;">
        <div style="background:#E8F5E9;color:#2E7D32;padding:6px 12px;border-radius:6px;font-weight:600;">${remain>0?`${remain}자리 남음`:'마감'}</div>
        
        ${(match.hcp_min!=null||match.hcp_max!=null) ? `<div style="background:#E3F2FD;color:#1565c0;padding:6px 12px;border-radius:6px;">핸디 ${match.hcp_min??'-'}~${match.hcp_max??'-'}</div>` : ''}
      </div>
      ${match.note ? `<div style="margin-top:12px;padding:12px;background:#fafafa;border-radius:6px;font-size:13px;">${escapeHtml(match.note)}</div>` : ''}
    </div>
    
    <div class="card">
      <div style="font-weight:600;margin-bottom:8px;">👤 호스트</div>
      <div style="font-size:14px;">${escapeHtml(match.host?.name||'익명')}</div>
      <div style="font-size:12px;color:#666;margin-top:2px;">핸디 ${match.host?.handicap??'-'} · ${escapeHtml(match.host?.location||'')}</div>
      ${session && !isHost ? `<button class="btn btn-primary" onclick="window._gd.startMatchChat('${matchId}','${match.host_id}','${escapeHtml(match.course||'')}')" style="margin-top:12px;width:100%;">💬 호스트와 채팅</button>` : ''}
    </div>
    
    ${applyBlock}
    
    ${hostBlock}
    
    ${isHost && approvedApps.length > 0 ? `
      <div class="card">
        <div style="font-weight:600;margin-bottom:8px;">✓ 확정 멤버 (${approvedApps.length})</div>
        ${approvedApps.map(a => `
          <div style="padding:8px 0;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-weight:600;font-size:14px;">${escapeHtml(a.profiles?.name||'익명')}</div>
              <div style="font-size:12px;color:#666;">핸디 ${a.profiles?.handicap??'-'} · ${escapeHtml(a.profiles?.location||'')}</div>
            </div>
            <button class="btn" onclick="window._gd.startMatchChat('${matchId}','${a.user_id}','${escapeHtml(match.course||'')}')" style="font-size:12px;padding:6px 10px;color:#1565c0;border:1px solid #1565c0;">💬 채팅</button>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
}
