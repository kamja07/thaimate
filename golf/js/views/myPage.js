// views/myPage.js — 내 정보 + (슈퍼관리자) 회원 명부 진입
import { loadMyProfile } from '../domain/users.js';
import { loadUnreadCount } from '../domain/chat.js';
import { getSession, isAdmin } from '../core/auth.js';
import { escapeHtml } from '../core/ui-kit.js';
import { t, getLang } from '../core/i18n.js';

export async function myPageView() {
  const session = getSession();
  if (!session) return `    <div class="card"><h2>로그인 필요</h2><button class="btn btn-primary" onclick="window._gd.goSignIn()">로그인</button></div>`;
  const EMBED = !!window.__embed;   // ThaiMate 임베드: 개인정보를 타이메이트 프로필과 일치

  const admin = await isAdmin();
  const { count: unreadCount } = await loadUnreadCount();
  const { data: profile, error } = await loadMyProfile();
  if (error || !profile) return `    <div class="card" style="background:#fff3e0;border:2px solid #FB8C00;">
      <h2 style="color:#E65100;margin-top:0;">⚠️ 프로필 조회 실패</h2>
      <p style="color:#666;font-size:13px;margin:8px 0;">${escapeHtml(error?.message || '계정 정보를 찾을 수 없습니다.')}</p>
      <p style="color:#888;font-size:12px;margin:0 0 16px;">관리자에 의해 계정이 삭제되었거나 세션이 만료되었을 수 있습니다. 강제 로그아웃 후 다시 로그인해주세요.</p>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary" style="flex:1;" onclick="window._gd.goBack()">뒤로</button>
        <button class="btn btn-primary" style="flex:2;background:#d32f2f;color:white;border:none;font-weight:700;" onclick="if(confirm('정말 로그아웃하시겠습니까?')){try{localStorage.clear();sessionStorage.clear();}catch(e){}location.href='/';}">🚪 강제 로그아웃</button>
      </div>
    </div>`;
  
  return `
    <div class="card" style="background:#f0f4ff;border:1px solid #c5cae9;">
      <div style="font-size:13px;font-weight:600;margin-bottom:10px;">${t('lang.label')}</div>
      <div style="display:flex;gap:8px;">
        <button class="btn ${getLang() === 'ko' ? 'btn-primary' : 'btn-secondary'}" style="flex:1;" onclick="window._gd.doSetLang('ko')">${t('lang.korean')}</button>
        <button class="btn ${getLang() === 'en' ? 'btn-primary' : 'btn-secondary'}" style="flex:1;" onclick="window._gd.doSetLang('en')">${t('lang.english')}</button>
      </div>
    </div>
    <div class="card">
      <button class="btn btn-secondary" style="font-size:12px;padding:6px 10px;" onclick="window._gd.goBack()">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      <h2 style="margin:12px 0 4px;">👤 MY 페이지</h2>
      <p style="color:var(--text-secondary);font-size:13px;margin:0 0 16px;">내 정보 ${admin ? '· 👑 슈퍼관리자' : ''}</p>
    </div>
    
    <div class="card">
      <h3 style="margin-top:0;font-size:15px;">내 정보 (수정 가능)</h3>
      
      <label style="display:block;font-size:12px;color:var(--text-secondary);margin-bottom:2px;">닉네임 (변경 불가)</label>
      <input type="text" value="${escapeHtml(profile.nickname || profile.name || profile.username || '')}" disabled style="width:100%;padding:10px;border:1px solid var(--border);border-radius:6px;margin-bottom:12px;background:#f5f5f5;font-size:14px;">
      
      <label style="display:block;font-size:12px;color:var(--text-secondary);margin-bottom:2px;">실명 (선택)</label>
      <input id="mp_realName" type="text" value="${escapeHtml(profile.real_name || '')}" placeholder="예: 김철수" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:6px;margin-bottom:12px;font-size:14px;">
      
      <label style="display:block;font-size:12px;color:var(--text-secondary);margin-bottom:2px;">활동 지역</label>
      <input id="mp_location" type="text" value="${escapeHtml(profile.location || '')}" placeholder="예: 방콕 / 파타야 / 한국" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:6px;margin-bottom:12px;font-size:14px;">
      
      <label style="display:block;font-size:12px;color:var(--text-secondary);margin-bottom:2px;">핸디캡 (0~36)</label>
      <input id="mp_handicap" type="number" min="0" max="36" step="0.1" value="${profile.handicap ?? ''}" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:6px;margin-bottom:12px;font-size:14px;">
      
      <label style="display:block;font-size:12px;color:var(--text-secondary);margin-bottom:2px;">${EMBED ? '이메일 (타이메이트 인증 이메일)' : '이메일 (선택, 입력 시 자동 인증 메일 발송)'}</label>
      <input id="mp_email" type="email" ${EMBED ? 'disabled' : ''} value="${EMBED ? escapeHtml(profile.email || '') : (() => { const u = session.user; const em = (u.email || ''); const isFake = em.toLowerCase().endsWith('@golfdong.local'); return isFake ? escapeHtml(profile.contact_email || '') : escapeHtml(em); })()}" placeholder="예: you@example.com" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:6px;margin-bottom:4px;font-size:14px;${EMBED ? 'background:#f5f5f5;' : ''}">
      <div id="email-verify-area" style="font-size:11px;color:var(--text-secondary);margin:0 0 12px;">${EMBED ? (() => {
          if (profile.email_verified) {
            return `<span style="color:#2E7D32;font-weight:600;">✓ 타이메이트 인증 이메일</span>`;
          }
          if (profile.email) {
            return `<span style="color:#e65100;font-weight:600;">⚠️ 미인증 — 타이메이트 내정보에서 이메일 인증을 완료하세요</span>`;
          }
          return `<span style="color:#888;">타이메이트 내정보에서 이메일을 인증하면 여기에 표시됩니다.</span>`;
        })() : (() => {
          const u = session.user;
          const _em = (u.email || '').toLowerCase();
          const _isFake = _em.endsWith('@golfdong.local');
          const _verified = u.email_confirmed_at && !_isFake;
          if (_verified) {
            return `<span style="color:#2E7D32;font-weight:600;">✓ 인증된 이메일</span>`;
          }
          if (!_isFake) {
            return `<div style="background:#fff3e0;border:1px solid #ffb74d;border-radius:6px;padding:8px 10px;margin-top:4px;">
              <div style="font-weight:600;color:#e65100;font-size:12px;">⚠️ 인증 대기 — 메일함의 인증 링크 클릭 필요</div>
              <button onclick="window._gd.doSendVerificationEmail()" style="margin-top:6px;background:#1976d2;color:white;border:none;padding:6px 12px;border-radius:4px;font-size:12px;font-weight:600;cursor:pointer;">📧 인증 메일 재발송</button>
            </div>`;
          }
          return `<span style="color:#888;">이메일 미등록 — 위 칸에 입력하고 [저장]을 누르면 인증 메일이 발송됩니다.</span>`;
        })()}</div>
      
      <label style="display:block;font-size:12px;color:var(--text-secondary);margin-bottom:2px;">전화번호 (선택)</label>
      <input id="mp_phone" type="tel" value="${escapeHtml(profile.phone || '')}" placeholder="예: 0812345678" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:6px;margin-bottom:16px;font-size:14px;">
      
      <button class="btn btn-primary" style="width:100%;font-size:14px;padding:12px;" onclick="window._gd.doUpdateMyProfile()">💾 저장</button>
    </div>
    
    <div class="card">
      <h3 style="margin-top:0;font-size:14px;color:var(--text-secondary);">계정</h3>
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">매너 점수: ${profile.manner_score ?? 100}/100 · 가입일: ${new Date(profile.created_at).toLocaleDateString('ko')}</div>
      <div class="card" onclick="window._gd.goChatList()" style="cursor:pointer;background:linear-gradient(135deg,#1565c0 0%,#0D47A1 100%);color:white;position:relative;">
        <div style="font-weight:700;font-size:16px;">💬 채팅${unreadCount > 0 ? ` <span style="background:#d32f2f;color:white;padding:2px 10px;border-radius:12px;font-size:13px;font-weight:700;margin-left:8px;">안 읽음 ${unreadCount}건</span>` : ''}</div>
        <div style="font-size:12px;opacity:0.9;margin-top:4px;">동반자 모집/장터에서 시작한 1:1 대화</div>
      </div>
      <div class="card" onclick="window._gd.goMyRounds()" style="cursor:pointer;background:linear-gradient(135deg,#2E7D32 0%,#1B5E20 100%);color:white;">
        <div style="font-weight:700;font-size:16px;">⛳ 내 라운드 기록</div>
        <div style="font-size:12px;opacity:0.9;margin-top:4px;">개인 라운드 + 동호회 라운드 통계</div>
      </div>
      <button class="btn btn-secondary" style="font-size:13px;color:#d32f2f;border-color:#ffcdd2;" onclick="window._gd.doSignOut()">로그아웃</button>
    </div>
    
    ${admin ? `
      <div class="card" style="background:#fff8e1;border:1px solid #FFB300;">
        <h3 style="margin-top:0;color:#FB8C00;">👑 슈퍼관리자 메뉴</h3>
        <button class="btn btn-primary" style="background:#FB8C00;width:100%;font-size:14px;padding:12px;margin-bottom:8px;" onclick="window._gd.goMemberList()">📋 전체 회원 명부</button>
        <button class="btn btn-secondary" style="width:100%;font-size:13px;padding:10px;" onclick="window._gd.goClubAdmin()">👥 동호회 개설 신청 관리</button>
      </div>
    ` : ''}
  `;
}
