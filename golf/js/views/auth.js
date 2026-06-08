// views/auth.js — Sign in + Sign up screens
import { escapeHtml } from '../core/ui-kit.js';

export function signInView() {
  return `
    <div class="card" style="max-width:380px;margin:30px auto;">
      <h2 style="text-align:center;margin-top:0;">⛳ GolfMate</h2>
      <p style="text-align:center;color:var(--text-secondary);font-size:14px;margin-bottom:24px;">편하고 스마트한 골프 플랫폼 / Smart Golf Platform for Everyone</p>
      <form id="signInForm" onsubmit="event.preventDefault();window._gd.doSignIn();">
        <label style="display:block;margin-bottom:8px;font-size:13px;color:var(--text-secondary);">닉네임 / Nickname</label>
        <input id="auth_nickname" type="text" required placeholder="예: Danny" autocomplete="username" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:8px;font-size:16px;margin-bottom:16px;">
        <label style="display:block;margin-bottom:8px;font-size:13px;color:var(--text-secondary);">비밀번호 / Password</label>
        <input id="auth_password" type="password" required placeholder="비밀번호" autocomplete="current-password" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:8px;font-size:16px;margin-bottom:20px;">
        <button type="submit" class="btn btn-primary" style="width:100%;font-size:16px;padding:14px;">로그인 / Sign In</button>
      </form>
      <div style="text-align:center;margin-top:16px;">
        <button class="btn btn-secondary" style="font-size:13px;" onclick="window._gd.goSignUp()">신규 가입 / Sign Up</button>
        <button class="btn btn-secondary" style="font-size:13px;" onclick="window._gd.goGuest()">둘러보기 / Browse</button>
      </div>
      <p style="font-size:11px;color:#999;margin-top:20px;text-align:center;">
        테스트: <code>Danny</code> / <code>danny1~20</code> · 비번 <code>684807</code>
      </p>
    </div>
  `;
}

export function signUpView() {
  const required = '<span style="color:#d32f2f;font-weight:600;">*</span>';
  const labelStyle = 'display:block;margin-bottom:8px;font-size:13px;color:var(--text-secondary);';
  const inputStyle = 'width:100%;padding:12px;border:1px solid var(--border);border-radius:8px;font-size:16px;margin-bottom:16px;';
  return `
    <div class="card" style="max-width:380px;margin:30px auto;">
      <h2 style="text-align:center;margin-top:0;">⛳ GolfMate 가입</h2>
      <p style="text-align:center;color:var(--text-secondary);font-size:12px;margin-bottom:20px;">
        ${required} 필수 항목
      </p>
      
      <form id="signUpForm" onsubmit="event.preventDefault();window._gd.doSignUp();">
        <h3 style="font-size:14px;margin:0 0 12px;color:var(--primary);">📌 필수 정보</h3>
        
        <label style="${labelStyle}">닉네임 (2자 이상) ${required}</label>
        <input id="su_nickname" type="text" required minlength="2" placeholder="한글/영문 자유롭게" style="${inputStyle}">
        
        <label style="${labelStyle}">비밀번호 (4자 이상) ${required}</label>
        <input id="su_password" type="password" required minlength="4" placeholder="비밀번호" style="${inputStyle}">
        
        <label style="${labelStyle}">활동 지역 ${required}</label>
        <select id="su_location" required style="${inputStyle}">
          <option value="">— 선택해주세요 —</option>
          <option value="방콕">방콕</option>
          <option value="파타야">파타야</option>
          <option value="치앙마이">치앙마이</option>
          <option value="푸켓">푸켓</option>
          <option value="한국">한국</option>
          <option value="기타">기타</option>
        </select>
        
        <label style="${labelStyle}">핸디캡 (0~36) ${required}</label>
        <input id="su_handicap" type="number" required min="0" max="36" placeholder="예: 18" style="${inputStyle}">
        
        <h3 style="font-size:14px;margin:20px 0 12px;color:var(--text-secondary);">💡 선택 정보 (사용 권한·연락 용도)</h3>
        
        <label style="display:block;margin-top:12px;font-weight:600;">본명 <span style="color:#999;font-weight:400;">(선택)</span></label>
      <input id="su_realName" class="input" type="text" placeholder="동문회·실명 모임용 (선택)" style="margin-bottom:4px;">
      <p style="font-size:11px;color:#999;margin-bottom:8px;">💡 동호회마다 본명 vs 닉네임 표시 선택 가능</p>
      <label style="${labelStyle}">이메일</label>
        <input id="su_email" type="email" placeholder="you@example.com" style="${inputStyle}">
      <p style="font-size:11px;color:#2E7D32;margin-top:4px;margin-bottom:8px;">📧 가입 후 이메일로 인증 링크가 자동 발송됩니다</p>
        
        <label style="${labelStyle}">전화번호</label>
        <input id="su_phone" type="tel" placeholder="예: +82-10-1234-5678 또는 +66-8x-xxx-xxxx" style="${inputStyle}">
        
        <button type="submit" class="btn btn-primary" style="width:100%;font-size:16px;padding:14px;margin-top:8px;">가입하기</button>
      </form>
      
      <div style="text-align:center;margin-top:16px;">
        <button class="btn btn-secondary" style="font-size:13px;" onclick="window._gd.goSignIn()">로그인으로 돌아가기</button>
      </div>
      
      <p style="font-size:11px;color:#999;margin-top:16px;line-height:1.6;">
        선택 정보(이메일·전화)는 후원사 권한·중요 알림·라운드 안내에 사용됩니다. 입력해두시면 향후 편리합니다.
      </p>
    </div>
  `;
}
