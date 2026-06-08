// v2/js/core/email-verify.js
// 이메일 인증 게이트 헬퍼
// 가입 시 자동 부여되는 가짜 도메인은 인증된 것으로 간주하지 않음
const FAKE_DOMAINS = ['@golfdong.local'];

export function isVerifiedEmail(user) {
  if (!user || !user.email_confirmed_at) return false;
  const email = (user.email || '').toLowerCase();
  return !FAKE_DOMAINS.some(d => email.endsWith(d));
}

export function isFakeEmail(user) {
  const email = (user?.email || '').toLowerCase();
  return FAKE_DOMAINS.some(d => email.endsWith(d));
}

export function realEmailOrNull(user) {
  if (!user || !user.email) return null;
  const e = user.email.toLowerCase();
  return FAKE_DOMAINS.some(d => e.endsWith(d)) ? null : user.email;
}
