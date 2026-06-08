// views/eventDetail.js — Two-tier award (gross + method) with exclusion logic

import { loadEvent, loadEventAwards, loadEventParticipants } from '../domain/events.js';
import { getMyClubMembership } from '../domain/clubs.js';
import { lockResults, drawPeoriaHoles, setSpecialAwards, publishAwards, unlockResults } from '../domain/awards.js';
import { getSession, isAdmin } from '../core/auth.js';
import { escapeHtml, toastSuccess, toastError, showLoading, hideLoading, confirmDialog } from '../core/ui-kit.js';
import { renderPeoriaHolesCard } from '../core/score-card.js';
import { showError } from '../core/errors.js';

const DEFAULT_PAR = [4,5,4,3,5,4,5,4,3,4,5,4,4,5,4,3,5,4];

function calcPeoria(holes, peoriaHoles, holePars) {
  if (!Array.isArray(holes) || holes.length < 18 || !Array.isArray(peoriaHoles)) return null;
  let s = 0;
  for (const h of peoriaHoles) s += holes[h-1] || 0;
  // 코스의 실제 par 합 사용 (없으면 72 fallback)
  const coursePar = (Array.isArray(holePars) && holePars.length === 18)
    ? holePars.reduce((a, b) => a + (b || 0), 0)
    : 72;
  let hcp = (s * 1.5 - coursePar) * 0.8;
  if (hcp < 0) hcp = 0;
  if (hcp > 36) hcp = 36;
  const gross = holes.reduce((a,b)=>a+b,0);
  return { handicap: Math.round(hcp*10)/10, net: Math.round((gross-hcp)*10)/10 };
}

function calcStableford(holes, parsArr) {
  const P = (Array.isArray(parsArr) && parsArr.length === 18) ? parsArr : DEFAULT_PAR;
  if (!Array.isArray(holes) || holes.length < 18) return null;
  let pts = 0;
  for (let i = 0; i < 18; i++) {
    const par = P[i] || 4;
    const s = holes[i];
    if (par === 3 && s === 1) { pts += 5; continue; }   // 파3 홀인원
    const d = s - par;
    if (d <= -3) pts += 5;
    else if (d === -2) pts += 4;
    else if (d === -1) pts += 3;
    else if (d === 0) pts += 2;
    else if (d === 1) pts += 1;
  }
  return pts;
}

function calcStablefordNet(holes, parsArr, handicap) {
  const P = (Array.isArray(parsArr) && parsArr.length === 18) ? parsArr : DEFAULT_PAR;
  if (!Array.isArray(holes) || holes.length < 18) return null;
  const hcp = (typeof handicap === 'number' && handicap > 0) ? Math.min(36, Math.floor(handicap)) : 0;
  const base = Math.floor(hcp / 18);
  const extra = hcp % 18;
  let pts = 0;
  for (let i = 0; i < 18; i++) {
    const par = P[i] || 4;
    const s = holes[i];
    if (par === 3 && s === 1) { pts += 5; continue; }
    const bonus = base + (i < extra ? 1 : 0);
    const d = (s - bonus) - par;
    if (d <= -3) pts += 5;
    else if (d === -2) pts += 4;
    else if (d === -1) pts += 3;
    else if (d === 0) pts += 2;
    else if (d === 1) pts += 1;
  }
  return pts;
}

function calcNet(gross, hcp) {
  if (gross == null || hcp == null) return null;
  return Math.round((gross - hcp) * 10) / 10;
}


// Count-back tie breakers (golf standard): back 9 → back 6 → back 3 → hole 18
function back9(holes) { return Array.isArray(holes) && holes.length >= 18 ? holes.slice(9, 18).reduce((a,b)=>a+(b||0), 0) : null; }
function back6(holes) { return Array.isArray(holes) && holes.length >= 18 ? holes.slice(12, 18).reduce((a,b)=>a+(b||0), 0) : null; }
function back3(holes) { return Array.isArray(holes) && holes.length >= 18 ? holes.slice(15, 18).reduce((a,b)=>a+(b||0), 0) : null; }
function hole18(holes) { return Array.isArray(holes) && holes.length >= 18 ? (holes[17] || 0) : null; }

function compareWithCountback(aScore, bScore, aHoles, bHoles) {
  const d = (aScore ?? 999) - (bScore ?? 999);
  if (d !== 0) return { diff: d, by: null };
  if (!aHoles || !bHoles) return { diff: 0, by: null };
  const d1 = (back9(aHoles) ?? 999) - (back9(bHoles) ?? 999);
  if (d1 !== 0) return { diff: d1, by: 'back9' };
  const d2 = (back6(aHoles) ?? 999) - (back6(bHoles) ?? 999);
  if (d2 !== 0) return { diff: d2, by: 'back6' };
  const d3 = (back3(aHoles) ?? 999) - (back3(bHoles) ?? 999);
  if (d3 !== 0) return { diff: d3, by: 'back3' };
  const d4 = (hole18(aHoles) ?? 999) - (hole18(bHoles) ?? 999);
  if (d4 !== 0) return { diff: d4, by: 'hole18' };
  return { diff: 0, by: 'tied' };
}

function countbackLabel(by) {
  return { back9: '후반 9홀 카운트백', back6: '후반 6홀 카운트백', back3: '후반 3홀 카운트백', hole18: '18번홀 카운트백', tied: '완전 동점' }[by] || '';
}

function methodLabel(m) {
  return {
    none: '보정 없음',
    peoria: '신페리오',
    stableford: '스테이블포드(그로스)',
    stableford_net: '스테이블포드(넷)',
    gross: '그로스',
    net: '넷 (핸디 적용)'
  }[m] || m;
}

function methodHint(m) {
  return {
    none: '보정 시상 없음. 그로스 시상자만 발표합니다.',
    peoria: '(선정 12홀 합 × 1.5 − 코스 par) × 0.8 = 핸디캡(0~36). 그로스 − 핸디 = 넷. 낮을수록 우승.',
    stableford: '홀당 점수 — 홀인원/알바 5, 이글 4, 버디 3, 파 2, 보기 1, 더블 이상 0. 합이 높을수록 우승.',
    stableford_net: '스테이블포드 점수표 + 핸디캡/18을 각 홀에 보너스 분배. 합이 높을수록 우승 (약자도 시상 가능).',
    gross: '18홀 총 스코어 그대로 비교. 낮을수록 우승.',
    net: '총 스코어 − 핸디캡 = 넷 점수. 낮을수록 우승.'
  }[m] || '';
}

export async function eventDetailView(params) {
  const eventId = params.id;
  if (!eventId) return `<div class="card"><h2>잘못된 이벤트 ID</h2></div>`;
  
  const { data: ev, error } = await loadEvent(eventId);
  if (error || !ev) return `<div class="card"><h2>조회하지 않는 이벤트</h2><button class="btn btn-secondary" onclick="window._gd.goBack()">뒤로</button></div>`;
  
  const { data: awards } = await loadEventAwards(eventId);
  const { data: participants } = await loadEventParticipants(eventId);
  const session = getSession();
  const admin = session ? await isAdmin() : false;
  const isLeader = session && ev.club?.leader_id === session.user.id;
  const myMembership = session ? (await getMyClubMembership(ev.club_id, session.user.id)).data : null;
  const isCoLeader = myMembership?.role === 'co_leader' && myMembership?.status === 'approved';
  const canManage = isLeader || isCoLeader || admin;
  const isMember = myMembership?.status === 'approved';
  const myUserId = session?.user?.id;
  const alreadyParticipant = participants?.some(p => p.user_id === myUserId);
  const locked = !!awards?.locked_at;
  const isRound = ev.type === 'round';
  const canJoin = session && isMember && isRound && !locked && !alreadyParticipant;
  const date = ev.event_date ? new Date(ev.event_date).toLocaleDateString('ko', { month: 'long', day: 'numeric', weekday: 'short' }) : '';
  
  return `
    <div class="card">
      <button class="btn btn-secondary" style="font-size:12px;padding:6px 10px;" onclick="window._gd.goBack()">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      ${canManage ? `<button class="btn" onclick="window._gd.openActivityEdit('${ev.club_id}','${params.id}')" style="margin-bottom:12px;margin-left:8px;background:#fff8e1;border:1px solid #fbc02d;">✏️ 활동 정보 수정</button>` : ''}
      ${session ? (locked ? `<span style="display:inline-block;margin-bottom:12px;margin-left:8px;padding:6px 10px;background:#fafafa;color:#999;border:1px solid #ddd;border-radius:6px;font-size:13px;">🔒 시상 잠금 — 스코어 수정 불가</span>` : `<button class="btn" onclick="window._gd.goEventScore('${params.id}')" style="margin-bottom:12px;margin-left:8px;background:#E8F5E9;border:1px solid #2E7D32;color:#2E7D32;">🎯 내 스코어 입력</button>`) : ''}

      <div style="margin-top:12px;">
        <div style="font-size:12px;color:var(--text-secondary);">${escapeHtml(ev.club?.name || '')} · ${escapeHtml(ev.type || '활동')}</div>
        <h2 style="margin:4px 0;">${escapeHtml(ev.name || '제목 없음')}</h2>
        <div style="font-size:13px;color:var(--text-secondary);">${date}${ev.course ? ` · ${escapeHtml(ev.course)}` : ''}${locked ? ' · 🔒 잠금' : ''}</div>
      </div>
    </div>
    
    ${isRound ? renderParticipants(participants, awards, canManage, params.id, locked, ev.hole_pars, myUserId) : ''}
    
    ${canManage && isRound ? renderWizard(ev, awards, participants) : ''}
  `;
}

function renderParticipants(parts, awards, canManage, eventId, locked, holePars, myUserId) {
  if (!parts || !parts.length) return `<div class="card"><p style="color:var(--text-secondary);">참가자가 없습니다.</p></div>`;
  
  const method = awards?.award_method;
  const peoriaHoles = awards?.peoria_holes;
  const grossRanks = awards?.gross_ranks ?? 0;
  const methodRanks = awards?.award_ranks ?? 0;
  const finalized = !!awards?.awarded_at;
  
  // Compute per-participant: gross + adjusted (by method)
  const enhanced = parts.map(p => {
    const e = { ...p, gross: p.total ?? null, adjusted: null, adjLabel: '' };
    if (method === 'peoria' && peoriaHoles && p.holes) {
      const r = calcPeoria(p.holes, peoriaHoles, holePars);
      if (r) { e.adjusted = r.net; e.adjLabel = `넷 ${r.net} (핸디 ${r.handicap})`; }
    } else if (method === 'stableford' && p.holes) {
      const pts = calcStableford(p.holes, holePars);
      if (pts != null) { e.adjusted = -pts; e.adjLabel = `${pts}점 (그로스)`; }
    } else if (method === 'stableford_net' && p.holes) {
      const pts = calcStablefordNet(p.holes, holePars, p.handicap);
      if (pts != null) { e.adjusted = -pts; e.adjLabel = `${pts}점 (넷, 핸디 ${p.handicap != null ? p.handicap : 0})`; }
    } else if (method === 'net' && p.total != null && p.handicap != null) {
      const n = calcNet(p.total, p.handicap);
      e.adjusted = n; e.adjLabel = `넷 ${n} (핸디 ${p.handicap})`;
    }
    return e;
  });
  
  // Helper sorts
  // Sort by gross with count-back tie-breaking; record what tiebreaker was needed
  const byGross = [...enhanced].sort((a, b) => {
    const r = compareWithCountback(a.gross, b.gross, a.holes, b.holes);
    return r.diff;
  });
  // Annotate count-back rationale for adjacent winners
  for (let i = 1; i < byGross.length; i++) {
    if (byGross[i].gross === byGross[i-1].gross) {
      const r = compareWithCountback(byGross[i-1].gross, byGross[i].gross, byGross[i-1].holes, byGross[i].holes);
      if (r.by && r.by !== 'tied') byGross[i].grossCountback = r.by;
    }
  }
  const grossWinnerIds = finalized && grossRanks > 0 ? new Set(byGross.slice(0, grossRanks).map(p => p.user_id)) : new Set();
  
  let methodWinnerIds = new Set();
  if (finalized && method && method !== 'gross' && method !== 'none' && methodRanks > 0) {
    const eligible = enhanced.filter(p => !grossWinnerIds.has(p.user_id) && p.adjusted != null);
    eligible.sort((a, b) => {
      const r = compareWithCountback(a.adjusted, b.adjusted, a.holes, b.holes);
      return r.diff;
    });
    for (let i = 1; i < eligible.length; i++) {
      if (eligible[i].adjusted === eligible[i-1].adjusted) {
        const r = compareWithCountback(eligible[i-1].adjusted, eligible[i].adjusted, eligible[i-1].holes, eligible[i].holes);
        if (r.by && r.by !== 'tied') eligible[i].methodCountback = r.by;
      }
    }
    methodWinnerIds = new Set(eligible.slice(0, methodRanks).map(p => p.user_id));
  } else if (finalized && method === 'gross') {
    // If method is gross, only one tier — grossWinnerIds already covers it
  }
  
  // Display sort: depends on stage
  let displayList;
  if (!finalized) {
    // Always sort by gross before finalization
    displayList = byGross;
  } else {
    // After finalization: gross winners first (by gross), then method winners (by adjusted), then rest
    const grossWins = byGross.filter(p => grossWinnerIds.has(p.user_id));
    const methodSorted = enhanced
      .filter(p => methodWinnerIds.has(p.user_id))
      .sort((a, b) => (a.adjusted ?? 999) - (b.adjusted ?? 999));
    const restSorted = byGross.filter(p => !grossWinnerIds.has(p.user_id) && !methodWinnerIds.has(p.user_id));
    displayList = [...grossWins, ...methodSorted, ...restSorted];
  }
  
  const stageLabel = !awards?.locked_at ? ' — 점수 입력 단계 (그로스 순)'
    : !method ? ' — 잠금됨 · 시상 방식 선택 대기'
    : !finalized ? ` — 시상 진행 중 (${methodLabel(method)})`
    : ` — 최종 결과 · 그로스 ${grossRanks}명 + ${methodLabel(method)} ${methodRanks}명`;
  
  function grossTitle(i) { return ['🥇 금메달리스트','🥈 은메달리스트','🥉 동메달리스트'][i] || ''; }
  function methodTitle(i) { return ['🏆 우승','🥈 준우승','3등','4등'][i] || ''; }
  
  let grossIdx = 0, methodIdx = 0;
  
  return `
    <div class="card">
      <h3 style="margin-top:0;font-size:15px;">📊 참가자 (${parts.length}명)${stageLabel}</h3>
      <div style="max-height:520px;overflow-y:auto;">
        ${displayList.map((p) => {
          const isGW = grossWinnerIds.has(p.user_id);
          const isMW = methodWinnerIds.has(p.user_id);
          let prefix = '';
          let bg = '';
          let nameColor = '';
          if (isGW) {
            prefix = `<span style="background:#FFB300;color:white;font-size:11px;padding:2px 6px;border-radius:8px;margin-right:6px;">그로스 ${grossTitle(grossIdx)}</span>`;
            bg = 'background:#fff8e1;';
            nameColor = '#FB8C00';
            grossIdx++;
          } else if (isMW) {
            prefix = `<span style="background:#7E57C2;color:white;font-size:11px;padding:2px 6px;border-radius:8px;margin-right:6px;">${methodLabel(method)} ${methodTitle(methodIdx)}</span>`;
            bg = 'background:#f3e5f5;';
            nameColor = '#5E35B1';
            methodIdx++;
          }
          return `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 8px;border-bottom:1px solid var(--border);font-size:13px;${bg}">
              <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;">
                ${prefix}
                <b style="${nameColor ? `color:${nameColor};` : ''}">${escapeHtml(p.name)}</b>${p.grossCountback || p.methodCountback ? ` <span style="font-size:10px;background:#fff3e0;color:#E65100;padding:1px 5px;border-radius:6px;margin-left:4px;" title="${countbackLabel(p.grossCountback || p.methodCountback)}로 순위 결정">⚖️ ${countbackLabel(p.grossCountback || p.methodCountback)}</span>` : ''}
                ${((Array.isArray(awards?.longest_drive_user_ids) && awards.longest_drive_user_ids.includes(p.user_id)) || awards?.longest_drive_user_id === p.user_id) ? '<span title="롱기스트"> 🏆</span>' : ''}
                ${((Array.isArray(awards?.nearest_pin_user_ids) && awards.nearest_pin_user_ids.includes(p.user_id)) || awards?.nearest_pin_user_id === p.user_id) ? '<span title="니어리스트"> ⛳</span>' : ''}
              </div>
              <div style="font-size:12px;color:var(--text-secondary);text-align:right;">
                ${p.adjLabel && finalized ? `<div style="font-weight:600;color:${isMW ? '#5E35B1' : 'var(--text-primary)'};">${p.adjLabel}</div>` : ''}
                <div>${p.gross != null ? `그로스 ${p.gross}` : '점수 없음'}${p.handicap != null && !p.adjLabel ? ` · 핸디 ${p.handicap}` : ''}</div>
                ${!locked && eventId ? `${canManage ? `<button onclick="event.stopPropagation();window._gd.goEventScoreFor('${eventId}','${p.user_id}')" style="margin-top:4px;font-size:10px;padding:3px 8px;background:#7E57C2;color:white;border:none;border-radius:4px;cursor:pointer;">✏️ 입력</button>` : ''}${(canManage || p.user_id === myUserId) ? `<button onclick="event.stopPropagation();window._gd.doKickEventParticipant('${eventId}','${p.user_id}','${(p.name || '').replace(/'/g, "\\'")}', ${p.user_id === myUserId})" style="margin-top:4px;margin-left:4px;font-size:10px;padding:3px 8px;background:${p.user_id === myUserId ? '#388E3C' : '#d32f2f'};color:white;border:none;border-radius:4px;cursor:pointer;">${p.user_id === myUserId ? '👋 나가기' : '❌ 강퇴'}</button>` : ''}` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      ${method ? `<p style="font-size:11px;color:#555;margin:8px 0 0;text-align:center;background:#f5f5f5;padding:6px 10px;border-radius:4px;line-height:1.5;">💡 <b>${methodLabel(method)}</b><br><span style="color:#888;font-style:italic;">${methodHint(method)}</span></p>` : ''}
      ${finalized ? `<p style="font-size:11px;color:var(--text-secondary);margin:8px 0 0;text-align:center;">총 시상자 ${grossWinnerIds.size + methodWinnerIds.size}명 (그로스 ${grossWinnerIds.size} + ${methodLabel(method)} ${methodWinnerIds.size}) · 그로스 시상자는 ${methodLabel(method)} 시상 대상에서 제외됩니다</p>` : ''}
      ${canManage && !locked && eventId ? `<div style="text-align:center;margin-top:12px;padding-top:12px;border-top:1px dashed #e0e0e0;"><button onclick="window._gd.openAddMemberToEvent('${eventId}')" style="background:#1976D2;color:white;border:none;padding:10px 18px;border-radius:6px;font-size:13px;cursor:pointer;font-weight:600;">➕ 동호회 멤버를 참가시키기</button></div>` : ''}
    </div>
    ${(() => {
      if (!finalized) return '';
      const longArr = (Array.isArray(awards?.longest_drive_user_ids) && awards.longest_drive_user_ids.length) ? awards.longest_drive_user_ids : (awards?.longest_drive_user_id ? [awards.longest_drive_user_id] : []);
      const nearArr = (Array.isArray(awards?.nearest_pin_user_ids) && awards.nearest_pin_user_ids.length) ? awards.nearest_pin_user_ids : (awards?.nearest_pin_user_id ? [awards.nearest_pin_user_id] : []);
      const longNames = longArr.map(uid => parts.find(p => p.user_id === uid)?.name || '익명');
      const nearNames = nearArr.map(uid => parts.find(p => p.user_id === uid)?.name || '익명');
      if (!longNames.length && !nearNames.length) return '';
      const chip = n => '<span style="background:#fff;color:#6a1b9a;padding:4px 10px;border-radius:12px;font-size:13px;font-weight:600;border:1px solid #ce93d8;margin:2px;display:inline-block;">' + escapeHtml(n) + '</span>';
      return '<div class="card" style="background:#f3e5f5;border:1px solid #ce93d8;">' +
        '<h3 style="margin-top:0;font-size:15px;color:#6a1b9a;">🏅 특별 시상</h3>' +
        (longNames.length ? '<div style="padding:10px 0;' + (nearNames.length ? 'border-bottom:1px solid #e1bee7;' : '') + '"><div style="font-size:13px;color:#6a1b9a;font-weight:600;margin-bottom:6px;">🏆 롱기스트 드라이브</div><div style="display:flex;flex-wrap:wrap;gap:4px;">' + longNames.map(chip).join('') + '</div></div>' : '') +
        (nearNames.length ? '<div style="padding:10px 0;"><div style="font-size:13px;color:#6a1b9a;font-weight:600;margin-bottom:6px;">⛳ 니어리스트 핀</div><div style="display:flex;flex-wrap:wrap;gap:4px;">' + nearNames.map(chip).join('') + '</div></div>' : '') +
        '</div>';
    })()}
  `;
}

function renderWizard(ev, awards, parts) {
  const locked = !!awards?.locked_at;
  const hasMethod = !!(awards?.award_method && awards?.award_ranks);
  const isPeoria = awards?.award_method === 'peoria';
  const hasPeoriaHoles = !!awards?.peoria_holes;
  const needsPeoria = hasMethod && isPeoria && !hasPeoriaHoles;
  const awarded = !!awards?.awarded_at;
  
  let stage;
  if (!locked) stage = 1;
  else if (!hasMethod) stage = 2;
  else if (needsPeoria) stage = 3;
  else if (!awarded) stage = 4;
  else stage = 5;
  
  return `
    <div class="card" style="background:#fffbf0;border:2px solid #FFB300;">
      <h3 style="margin-top:0;color:#FB8C00;">⚙️ 회장 시상 메뉴 (${stage}/5)</h3>
      
      ${stage === 1 ? `
        <div style="padding:12px;background:white;border-radius:8px;margin-bottom:8px;">
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">1단계 — 참가자 점수 입력 완료 후 시상 잠금</div>
          <button class="btn btn-primary" style="background:#FB8C00;width:100%;font-size:15px;" onclick="window._gd.lockResults('${ev.id}')">🔒 시상 잠금 (참가자 점수 수정 불가)</button>
        </div>
      ` : ''}
      
      ${stage >= 2 ? `
        <div style="padding:8px 12px;background:#e8f5e9;color:#2e7d32;font-size:12px;border-radius:6px;margin-bottom:8px;">
          ✅ 1단계 잠금됨 (${new Date(awards.locked_at).toLocaleTimeString('ko')})
        </div>
      ` : ''}
      
      ${stage === 2 ? renderStage2(ev) : ''}
      
      ${stage >= 3 ? `
        <div style="padding:8px 12px;background:#e8f5e9;color:#2e7d32;font-size:12px;border-radius:6px;margin-bottom:8px;">
          ✅ 2단계 시상 구성 — 그로스 ${awards.gross_ranks ?? 0}명 + ${methodLabel(awards.award_method)} ${awards.award_ranks}명
        </div>
      ` : ''}
      
      ${stage === 3 ? `
        <div style="padding:12px;background:white;border-radius:8px;margin-bottom:8px;">
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">3단계 — 신페리오 12홀 무작위 추첨</div>
          <button class="btn btn-primary" style="background:#FB8C00;width:100%;font-size:15px;" onclick="window._gd.drawPeoria('${ev.id}')">🎰 신페리오 12홀 추첨</button>
        </div>
      ` : ''}
      
      ${hasPeoriaHoles ? `
        <div style="padding:8px 12px;background:#e8f5e9;color:#2e7d32;font-size:12px;border-radius:6px;margin-bottom:8px;">
          ✅ 신페리오 12홀 추첨 완료
        </div>
        ${renderPeoriaHolesCard(ev.hole_pars, awards.peoria_holes)}
      ` : ''}
      
      ${stage === 4 ? renderStage4(ev, awards, parts) : ''}
      
      ${stage === 5 ? renderStage5(ev, awards) : ''}
      
      ${locked ? `
        <div style="margin-top:12px;text-align:center;">
          <button class="btn btn-secondary" style="font-size:12px;color:#d32f2f;border-color:#ffcdd2;" onclick="window._gd.unlockResults('${ev.id}')">↶ 시상 잠금 해제 (모든 데이터 초기화)</button>
        </div>
      ` : ''}
      
      <p style="font-size:11px;color:var(--text-secondary);margin:12px 0 0;text-align:center;">회장 / 공동관리자 / 슈퍼관리자에게만 보입니다</p>
    </div>
  `;
}


function renderStage5(ev, awards) {
  const done = !!awards?.raffle_completed_at;
  const winners = awards?.raffle_winners || [];
  if (done && winners.length) {
    return `
      <div style="padding:8px 12px;background:#e8f5e9;color:#2e7d32;font-size:12px;border-radius:6px;margin-bottom:8px;">
        ✅ 정규 시상 발표 완료
      </div>
      <div style="padding:16px;background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:10px;text-align:center;color:white;">
        <div style="font-size:24px;margin-bottom:8px;">🎁🎉🎁</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:10px;">럭키 드로우 당첨자 ${winners.length}명</div>
        ${winners.map((w, i) => `
          <div style="display:inline-block;background:linear-gradient(135deg,#FFB300,#FF6F00);color:#1a1a2e;padding:8px 14px;border-radius:20px;margin:4px;font-weight:700;font-size:14px;">
            ${['🥇','🥈','🥉','🏅','🏅','🎉','🎉','🎉','🎉','🎉'][i] || '🎉'} ${escapeHtml(w.name || '')}
          </div>
        `).join('')}
        <div style="margin-top:12px;">
          <button class="btn btn-secondary" style="background:rgba(255,255,255,0.15);color:white;border-color:rgba(255,255,255,0.3);font-size:12px;" onclick="window._gd.startRaffle('${ev.id}')">🎰 추첨 시작</button>
        </div>
      </div>
    `;
  }
  return `
    <div style="padding:8px 12px;background:#e8f5e9;color:#2e7d32;font-size:12px;border-radius:6px;margin-bottom:8px;">
      ✅ 정규 시상 발표 완료
    </div>
    <div style="padding:16px;background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:10px;text-align:center;color:white;">
      <div style="font-size:30px;margin-bottom:6px;">🎰</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-bottom:12px;">5단계 — 럭키 드로우</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:12px;">정규 시상자 제외 · 카지노 룰렛 추첨</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.55);margin-bottom:8px;">남은 인원 전체가 대상 · 매번 1명씩 추첨 · 도중에 종료 가능</div>
      <label style="display:flex;align-items:center;gap:8px;color:rgba(255,255,255,0.9);font-size:13px;margin-bottom:12px;cursor:pointer;justify-content:center;">
        <input id="awChkRaffleAll_${ev.id}" type="checkbox" ${awards?.raffle_include_winners ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">
        정규 시상자(그로스/보정/롱기/니어)도 포함
      </label>
      <button class="btn btn-primary" style="background:linear-gradient(135deg,#FFB300,#FF6F00);color:#1a1a2e;border:none;width:100%;font-size:16px;font-weight:700;padding:14px;" onclick="window._gd.startRaffle('${ev.id}')">🎰 럭키 드로우 시작</button>
    </div>
  `;
}

function renderStage2(ev) {
  return `
    <div style="padding:12px;background:white;border-radius:8px;margin-bottom:8px;">
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">2단계 — 시상 구성 (그로스 + 보정 방식 별도 입력)</div>
      
      <div style="margin-bottom:12px;">
        <label style="display:block;font-size:12px;margin-bottom:4px;">🏆 그로스 시상 인원</label>
        <select id="awSelGrossRanks_${ev.id}" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;">
          <option value="0">시상 안 함</option>
          <option value="1" selected>🥇 금메달리스트 (1명)</option>
          <option value="2">🥇 금 + 🥈 은 (2명)</option>
          <option value="3">🥇 금 + 🥈 은 + 🥉 동 (3명)</option>
        </select>
      </div>
      
      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <div style="flex:1;">
          <label style="display:block;font-size:12px;margin-bottom:4px;">🎖️ 보정 시상 방식</label>
          <select id="awSelMethod_${ev.id}" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;">
            <option value="none">보정 없음 (그로스만 시상)</option>
            <option value="peoria" selected>신페리오 (핸디 보정)</option>
            <option value="stableford">스테이블포드 (그로스)</option>
            <option value="stableford_net">스테이블포드 (넷)</option>
            <option value="net">넷 (핸디 적용)</option>
          </select>
        </div>
        <div style="flex:1;">
          <label style="display:block;font-size:12px;margin-bottom:4px;">보정 시상 인원</label>
          <select id="awSelRanks_${ev.id}" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;">
            <option value="0">시상 안 함</option>
            <option value="1">🏆 우승 (1명)</option>
            <option value="2">우승 + 준우승 (2명)</option>
            <option value="3" selected>우승~3등 (3명)</option>
            <option value="4">우승~4등 (4명)</option>
          </select>
        </div>
      </div>
      
      <p style="font-size:11px;color:var(--text-secondary);margin:8px 0 12px;">💡 그로스 시상자(최대 3명)는 보정 시상(최대 4명) 대상에서 자동 제외됩니다</p>
      
      <button class="btn btn-primary" style="background:#FB8C00;width:100%;font-size:15px;" onclick="window._gd.saveMethodAndRanks('${ev.id}')">✓ 시상 구성 저장</button>
    </div>
  `;
}

function renderStage4(ev, awards, parts) {
  const currentLong = Array.isArray(awards?.longest_drive_user_ids) && awards.longest_drive_user_ids.length 
    ? awards.longest_drive_user_ids 
    : (awards?.longest_drive_user_id ? [awards.longest_drive_user_id] : []);
  const currentNear = Array.isArray(awards?.nearest_pin_user_ids) && awards.nearest_pin_user_ids.length 
    ? awards.nearest_pin_user_ids 
    : (awards?.nearest_pin_user_id ? [awards.nearest_pin_user_id] : []);
  
  function buildSelect(idPrefix, slot, selectedId) {
    const opts = parts.map(p => `<option value="${p.user_id}" ${selectedId === p.user_id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('');
    return `<select id="${idPrefix}_${slot}_${ev.id}" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:13px;">
      <option value="">— ${slot+1}번째 (선택) —</option>
      ${opts}
    </select>`;
  }
  
  let longHtml = '';
  for (let i = 0; i < 4; i++) longHtml += '<div style="margin-bottom:4px;">' + buildSelect('awSelLong', i, currentLong[i]) + '</div>';
  let nearHtml = '';
  for (let i = 0; i < 4; i++) nearHtml += '<div style="margin-bottom:4px;">' + buildSelect('awSelNear', i, currentNear[i]) + '</div>';
  
  return `
    <div style="padding:12px;background:white;border-radius:8px;margin-bottom:8px;">
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">4단계 — 롱기/니어 선택 (각 최대 4명) + 시상 발표</div>
      <div style="display:flex;gap:12px;margin-bottom:12px;">
        <div style="flex:1;">
          <label style="display:block;font-size:12px;margin-bottom:6px;font-weight:600;">🏆 롱기스트 드라이브</label>
          ${longHtml}
        </div>
        <div style="flex:1;">
          <label style="display:block;font-size:12px;margin-bottom:6px;font-weight:600;">⛳ 니어리스트 핀</label>
          ${nearHtml}
        </div>
      </div>
      <button class="btn btn-secondary" style="width:100%;margin-bottom:16px;" onclick="window._gd.saveLongNear('${ev.id}')">롱기/니어 저장</button>
      
      <button class="btn btn-primary" style="background:#FB8C00;width:100%;font-size:15px;" onclick="window._gd.publishAwards('${ev.id}')">🏆 정규 시상 발표</button>
    </div>
  `;
}


// ─────── 회장용 Par 직접 입력 버튼 트리거 (Par fix 2026-05-28) ───────
(function () {
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-leader-par-open]');
    if (!btn) return;
    e.preventDefault();
    const eventId = btn.dataset.leaderParOpen;
    if (typeof window._gd?.doOpenLeaderParEditor === 'function') {
      window._gd.doOpenLeaderParEditor(eventId);
    }
  });
})();


// ─────── 활동 참가자 강퇴/나가기 핸들러 v2 ───────
(function () {
  function attach() {
    if (!window._gd) { setTimeout(attach, 300); return; }
    window._gd.doKickEventParticipant = async function(eventId, userId, name, isSelf) {
      const msg = isSelf
        ? "이 활동에서 나가시겠습니까?\n\n본인의 점수 등이 함께 삭제됩니다."
        : "\"" + name + "\"님을 활동에서 강퇴하시겠습니까?\n\n이 동작은 되돌릴 수 없습니다.";
      if (!confirm(msg)) return;
      try {
        const { sb } = await import("../core/db.js");
        const { error, data } = await sb.from("event_participants").delete().eq("event_id", eventId).eq("user_id", userId).select();
        if (error) { alert((isSelf ? "나가기" : "강퇴") + " 실패: " + error.message); return; }
        if (!data || data.length === 0) { alert("처리되지 않음 — RLS 권한 정책이 누락된 듯합니다. (kick_participant_rls.sql 실행 필요)"); return; }
        if (window._gd && window._gd.reload) window._gd.reload();
        else location.reload();
      } catch (e) { alert("오류: " + (e && e.message || e)); }
    };
  }
  attach();
})();
