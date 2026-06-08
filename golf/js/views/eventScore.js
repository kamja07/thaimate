import { sb } from '../core/db.js';
import { getSession, isClubManager } from '../core/auth.js';
import { escapeHtml } from '../core/ui-kit.js';
import { renderScorecard, getCoursePar } from '../core/score-card.js';

export async function eventScoreView(params) {
  const eventId = params?.eventId || params?.id;
  const targetUserId = params?.targetUserId || null;
  if (!eventId) return '<div class="card"><p>eventId 필수</p></div>';
  const session = getSession();
  if (!session?.user) return '<div class="card"><p>로그인 후 이용</p></div>';

  const effectiveUid = targetUserId || session.user.id;
  const isProxy = !!targetUserId && targetUserId !== session.user.id;

  // 대행 모드면 대상자 이름 조회
  let targetName = '';
  if (isProxy) {
    const { data: prof } = await sb.from('profiles').select('name').eq('id', targetUserId).maybeSingle();
    targetName = prof?.name || '회원';
  }

  const { data: ev, error } = await sb.from('events')
    .select('id, name, course, course_id, course_key, hole_pars, results_locked_at, club_id')
    .eq('id', eventId).maybeSingle();
  if (error || !ev) return '<div class="card"><p>이벤트 없음</p></div>';

  const { data: round } = await sb.from('rounds')
    .select('holes, total')
    .eq('event_id', eventId)
    .eq('user_id', effectiveUid)
    .maybeSingle();

  const myHoles = Array.isArray(round?.holes) ? round.holes : [];
  let pars = Array.isArray(ev.hole_pars) ? ev.hole_pars : null;
  let parsFromMaster = false;

  if (!pars && ev.course_id) {
    try {
      pars = await getCoursePar(ev.course_id, ev.course_key);
      if (pars) parsFromMaster = true;
    } catch (e) { console.warn('master par fetch failed', e); }
  }

  // 실제 잠금은 event_awards.locked_at (eventDetail에서 확인). 여기는 단순 표시용.
  let locked = false;
  try {
    const { data: aw } = await sb.from('event_awards').select('locked_at').eq('event_id', eventId).maybeSingle();
    locked = !!aw?.locked_at;
  } catch (e) {}

  let canEditPar = false;
  if (!locked) {
    if (!pars) {
      canEditPar = true;
    } else {
      try {
        canEditPar = await isClubManager(ev.club_id);
      } catch (e) { console.warn('perm check err', e); }
    }
  }

  const parNotice = (!locked && canEditPar)
    ? (pars
        ? '<div style="background:#fff3e0;border-left:3px solid #ff9800;padding:8px 12px;border-radius:4px;margin-bottom:12px;font-size:13px;">💡 회장/관리자: Par 행도 수정 가능 — 저장 시 골프장 마스터 동기화 옵션 제공</div>'
        : '<div style="background:#e3f2fd;border-left:3px solid #2196f3;padding:8px 12px;border-radius:4px;margin-bottom:12px;font-size:13px;">💡 Par 미등록 골프장 — 라운드 도신 코스의 Par를 입력해주시면 마스터에 등록됩니다</div>')
    : (!locked && !pars ? '<div style="margin-bottom:12px;font-size:12px;color:#888;">💡 Par 정보가 없습니다. 회장/슈퍼관리자에게 등록을 요청하거나 시상 잠금 전에 입력 가능합니다.</div>' : '');

  const masterBadge = (pars && parsFromMaster) ? '<span style="background:#c8e6c9;color:#1b5e20;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;margin-left:6px;">🌐 마스터</span>' : '';

  const headerTitle = isProxy
    ? `✏️ ${escapeHtml(targetName)} 스코어 대행 입력`
    : '🎯 내 스코어 입력';
  const proxyBanner = isProxy
    ? `<div style="background:#f3e5f5;border-left:3px solid #7E57C2;padding:10px 12px;border-radius:6px;margin-bottom:12px;font-size:13px;color:#6a1b9a;font-weight:600;">🤝 <b>${escapeHtml(targetName)}</b> 회원 대신 입력 중 (회장/관리자 권한)</div>`
    : '';
  const saveOnclick = isProxy
    ? `window._gd.doSaveMyScoreCard('${eventId}','${targetUserId}')`
    : `window._gd.doSaveMyScoreCard('${eventId}')`;
  const saveLabel = isProxy
    ? `💾 ${escapeHtml(targetName)} 스코어 저장`
    : '💾 저장';

  return `
    <div class="card">
      <button class="btn btn-secondary" onclick="window.history.back()">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      <h2 style="margin-top:12px;">${headerTitle}</h2>
      <div style="color:#666;margin-bottom:8px;">${escapeHtml(ev.name || '')} · ${escapeHtml(ev.course || '')} ${masterBadge}</div>
    </div>

    <div class="card">
      ${proxyBanner}
      ${locked ? '<div style="background:#ffe0b2;padding:10px;border-radius:6px;margin-bottom:12px;">⚠️ 시상 잠금됨 — 수정 불가</div>' : ''}
      ${parNotice}
      ${renderScorecard({ pars, scores: myHoles, prefix: 'mscore', readonly: locked, holes: 18, editablePar: canEditPar })}
      ${locked ? '' : `
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn btn-primary" style="flex:1;padding:14px;background:${isProxy ? '#7E57C2' : '#2e7d32'};color:white;border:none;border-radius:6px;font-weight:600;cursor:pointer;" onclick="${saveOnclick}">${saveLabel}</button>
        </div>
      `}
    </div>
  `;
}