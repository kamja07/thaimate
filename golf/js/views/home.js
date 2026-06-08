// views/home.js — Home screen
import { getSession, getProfile, isAdmin } from '../core/auth.js';
import { escapeHtml } from '../core/ui-kit.js';
import { t, getLang } from '../core/i18n.js';
import { sb } from '../core/db.js';
import { isPushSupported, getPushPermission } from '../domain/push.js';
import { loadUnreadCount } from '../domain/chat.js';

export async function homeView() {
  const session = getSession();
  const profile = getProfile();
  const logged = !!session;
  if (!logged) return guestHome();

  // 병렬: 관리자 확인 + 채팅 unread (서로 독립) — 순차 2왕복 → 1
  const [admin, unreadR] = await Promise.all([
    isAdmin(),
    loadUnreadCount().then(r => r, () => ({ count: 0 }))
  ]);
  let chatUnread = (unreadR && unreadR.count) || 0;
  const _u = session && session.user;
  const _isFakeEmail = (_u && _u.email || '').toLowerCase().endsWith('@golfdong.local');
  const canManageCourses = !!admin || (!!_u && !!_u.email_confirmed_at && !_isFakeEmail);

  // 슈퍼관리자: 승인 대기 카운트 (병렬)
  let pendingBizCount = 0;
  let pendingClubCount = 0;
  if (admin) {
    const [bizR, clubR] = await Promise.all([
      sb.from('businesses').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending').then(r => r, () => ({ count: 0 })),
      sb.from('golf_clubs').select('id', { count: 'exact', head: true }).is('approved_at', null).then(r => r, () => ({ count: 0 }))
    ]);
    pendingBizCount = bizR.count || 0;
    pendingClubCount = clubR.count || 0;
  }
  const pushPerm = isPushSupported() ? getPushPermission() : 'unsupported';
  
  const chatBadge = chatUnread > 0 ? ` <span style="background:#d32f2f;color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;margin-left:4px;">${chatUnread}</span>` : '';
  const clubBadge = pendingClubCount > 0 ? ` <span style="background:#d32f2f;color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;margin-left:4px;">${pendingClubCount}</span>` : '';
  const bizBadge = pendingBizCount > 0 ? ` <span style="background:#d32f2f;color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;margin-left:4px;">${pendingBizCount}</span>` : '';
  
  const name = profile?.name || session.user.email?.split('@')[0] || '회원';
  const handicap = profile?.handicap;
  const location = profile?.location;
  const role = admin ? t('role.admin') : t('role.member');
  const pwaInstalled = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  
  return `
    <div class="card" style="background:linear-gradient(135deg,#2E7D32,#4CAF50);color:white;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:13px;opacity:0.85;">${escapeHtml(role)}</div>
          <h2 style="margin:4px 0 0;color:white;">⛳ ${escapeHtml(name)}</h2>
          ${location || handicap != null ? `<div style="font-size:13px;opacity:0.85;margin-top:6px;">${[location, handicap != null ? '핸디 '+handicap : ''].filter(Boolean).map(escapeHtml).join(' · ')}</div>` : ''}
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <button class="btn" style="background:rgba(255,255,255,0.18);color:white;font-size:11px;padding:8px 10px;font-weight:600;" onclick="window._gd.doToggleLang()" title="언어 / Language">🌐 ${getLang() === 'ko' ? 'EN' : 'KO'}</button>
          <button class="btn" style="background:rgba(255,255,255,0.2);color:white;font-size:12px;padding:8px 12px;" onclick="window._gd.goMyPage()">${t('header.my')}</button>
        </div>
      </div>
    </div>
    
    ${!pwaInstalled && isMobile ? `
      <div class="card" style="background:linear-gradient(135deg,#43A047,#66BB6A);color:white;cursor:pointer;border:none;" onclick="window._gd.doInstallPwa()">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="font-size:40px;line-height:1;">📲</div>
          <div style="flex:1;">
            <div style="font-size:16px;font-weight:700;margin-bottom:4px;">${t('pwa.installTitle')}</div>
            <div style="font-size:12px;opacity:0.92;line-height:1.4;">${t('pwa.installSubtitle')}</div>
          </div>
          <div style="font-size:24px;opacity:0.85;">→</div>
        </div>
      </div>
    ` : ''}
    <div class="card">
      <h3 style="margin-top:0;">${t('home.greeting', { name: escapeHtml(name) })}</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;">
        <button class="btn btn-primary" style="font-size:14px;padding:14px;" onclick="window._gd.goClubs()">${t('menu.clubs')}</button>
        <button class="btn btn-primary" style="font-size:14px;padding:14px;" onclick="window._gd.goMatches()">${t('menu.matches')}</button>
        <button class="btn btn-secondary" style="font-size:14px;padding:14px;" onclick="window._gd.goBusinessList()">${t('menu.businesses')}</button>
        <button class="btn btn-secondary" style="font-size:14px;padding:14px;" onclick="window._gd.goMarketList()">${t('menu.market')}</button>
        <button class="btn btn-secondary" style="font-size:14px;padding:14px;grid-column:1 / -1;" onclick="window._gd.goChatList()">${t('menu.chat')}${chatBadge}</button>
      </div>
      ${canManageCourses ? `<div onclick="window._gd.goCoursesAdmin()" style="margin-top:12px;padding:14px 16px;background:linear-gradient(135deg,#1976D2 0%,#0D47A1 100%);color:white;border-radius:10px;cursor:pointer;">
        <div style="font-weight:700;font-size:15px;">📋 골프장 정보 관리</div>
        <div style="font-size:12px;opacity:0.9;margin-top:4px;font-style:italic;">🤝 함께 만들어 가는 골프장 정보</div>
        <div style="font-size:11px;opacity:0.85;margin-top:4px;">골프장 추가 · Par 수정 · 정보 보강</div>
      </div>` : ''}
      ${pushPerm === 'default' ? `
        <div style="background:#fff3e0;border:1px solid #ffb74d;padding:12px;border-radius:8px;margin-top:12px;">
          <div style="font-size:13px;color:#e65100;font-weight:600;margin-bottom:6px;">${t('push.enableTitle')}</div>
          <div style="font-size:12px;color:#666;margin-bottom:10px;">${t('push.enableDesc')}</div>
          <button class="btn btn-primary" style="font-size:13px;padding:10px 16px;" onclick="window._gd.doEnablePush()">${t('push.enableBtn')}</button>
        </div>
      ` : ''}
      ${pushPerm === 'denied' ? `
        <div style="background:#ffebee;border:1px solid #ef9a9a;padding:10px;border-radius:8px;margin-top:12px;font-size:12px;color:#c62828;">${t('push.blocked')}</div>
      ` : ''}
      ${admin ? `
        <div style="background:#fff8e1;border:1px solid #FFB300;padding:12px;border-radius:8px;margin-top:12px;">
          <div style="font-size:13px;font-weight:600;margin-bottom:8px;">${t('admin.tools')}</div>
          <button class="btn btn-secondary" style="width:100%;padding:12px;font-size:14px;text-align:left;" onclick="window._gd.goClubAdmin()">🏌️ 동호회 개설 승인${clubBadge}</button>
          <button onclick="window._gd.doOpenDisbandReview()" style="display:block;width:100%;padding:14px;margin:8px 0;background:#d32f2f;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;text-align:left;">🗑️ 동호회 폐지 승인</button>
          <button onclick="window._gd.goCoursesAdmin()" style="display:block;width:100%;padding:14px;margin:8px 0;background:#1B5E20;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;text-align:left;">⛳ 골프장 관리 (추가/수정/삭제/Par)</button>
          <button onclick="window._gd.goClubsManage()" style="display:block;width:100%;padding:14px;margin:8px 0;background:#c62828;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;text-align:left;">🗑️ 동호회 관리 (직접 삭제)</button>
          <button class="btn btn-secondary" style="width:100%;padding:12px;font-size:14px;text-align:left;margin-top:6px;" onclick="window._gd.goBusinessReview()">${t('admin.bizApproval')}${bizBadge}</button>
          <button class="btn btn-secondary" style="width:100%;padding:12px;font-size:14px;text-align:left;margin-top:6px;" onclick="window._gd.goMemberList()">${t('admin.memberList')}</button>
        </div>
      ` : ''}
    </div>
    
    <div class="card" style="text-align:center;color:var(--text-secondary);font-size:12px;">
      v2 Phase 4 · 시상 워크플로우 사용 가능
    </div>
  `;
}

function guestHome() {
  return `
    <div class="card" style="background:linear-gradient(135deg,#2E7D32,#4CAF50);color:white;text-align:center;">
      <h2 style="margin-top:0;color:white;">⛳ GolfMate</h2>
      <p style="opacity:0.9;margin-bottom:0;">편하고 스마트한 골프 플랫폼 / Smart Golf Platform for Everyone</p>
    </div>
    <div class="card">
      <h3 style="margin-top:0;">👋 둘러보기 모드</h3>
      <p style="color:var(--text-secondary);font-size:14px;line-height:1.6;">
        가입 없이도 동호회·회원사 정보를 둘러볼 수 있습니다.
      </p>
      <div style="display:flex;gap:8px;margin-top:16px;">
        <button class="btn btn-primary" style="flex:1;" onclick="window._gd.goSignIn()">로그인</button>
        <button class="btn btn-secondary" style="flex:1;" onclick="window._gd.goSignUp()">신규 가입</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:24px;">
          <button onclick="window._gd.goClubs()" style="padding:20px 16px;background:#2E7D32;color:white;border:none;border-radius:12px;font-weight:600;font-size:15px;cursor:pointer;">👥 동호회<br>둘러보기</button>
          <button onclick="window._gd.goMatches()" style="padding:20px 16px;background:#1976D2;color:white;border:none;border-radius:12px;font-weight:600;font-size:15px;cursor:pointer;">🏌️ 동반자 모집<br>둘러보기</button>
          <button onclick="window._gd.goMarketList()" style="padding:20px 16px;background:#F57C00;color:white;border:none;border-radius:12px;font-weight:600;font-size:15px;cursor:pointer;">🛒 매물<br>둘러보기</button>
          <button onclick="window._gd.goBusinessList()" style="padding:20px 16px;background:#7B1FA2;color:white;border:none;border-radius:12px;font-weight:600;font-size:15px;cursor:pointer;">🤝 회원사<br>둘러보기</button>
        </div>
    </div>
    <div class="card" style="text-align:center;color:var(--text-secondary);font-size:12px;">v2 Phase 4</div>
  `;
}
