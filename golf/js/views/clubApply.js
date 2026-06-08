// views/clubApply.js — 동호회 개설 신청 폼
import { getSession } from '../core/auth.js';
import { escapeHtml } from '../core/ui-kit.js';

export async function clubApplyView() {
  const session = getSession();
  if (!session) return `<div class="card"><h2>로그인이 필요합니다</h2><button class="btn btn-primary" onclick="window._gd.goSignIn()">로그인</button></div>`;
  return `
    <div class="card">
      <button class="btn btn-secondary" style="font-size:12px;padding:6px 10px;" onclick="window._gd.goBack()">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      <h2 style="margin:12px 0 4px;">👥 동호회 개설 신청</h2>
      <p style="color:var(--text-secondary);font-size:13px;margin:0 0 16px;">슈퍼관리자 승인 후 정식 동호회로 등록됩니다.</p>
      
      <label style="display:block;font-size:13px;margin-bottom:4px;">동호회 이름 <span style="color:#d32f2f;">*</span></label>
      <input id="ca_name" type="text" placeholder="예: 방콕 주말 골퍼" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:6px;margin-bottom:12px;font-size:14px;">
      
      <label style="display:block;font-size:13px;margin-bottom:4px;">활동 지역 <span style="color:#d32f2f;">*</span></label>
      <input id="ca_location" type="text" placeholder="예: 방콕 / 파타야 / 치앙마이 / 한국" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:6px;margin-bottom:12px;font-size:14px;">
      
      <label style="display:block;font-size:13px;margin-bottom:4px;">동호회 소개 (선택)</label>
      <textarea id="ca_description" placeholder="동호회 성격, 주 활동 시간대, 핸디 범위 등" rows="4" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:6px;margin-bottom:12px;font-size:14px;font-family:inherit;"></textarea>
      
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:16px;cursor:pointer;">
        <input id="ca_approval" type="checkbox" checked style="width:18px;height:18px;">
        가입 시 회장 승인 받기 (체크 해제하면 자동 승인)
      </label>
      
      <button class="btn btn-primary" style="width:100%;font-size:15px;padding:12px;" onclick="window._gd.doApplyForClub()">📨 개설 신청</button>
      <p style="font-size:11px;color:var(--text-secondary);text-align:center;margin:12px 0 0;">신청 후 슈퍼관리자가 검토하여 승인합니다.</p>
    </div>
  `;
}
