// v2/js/core/score-card.js
// 종이 스코어카드 UI helper
// 2026-05-29: renderPeoriaHolesCard 추가 — 신페리오 12홀 시각화

import { sb } from './db.js';

export async function getCoursePar(courseId, courseKey) {
  if (!courseId) return null;
  const { data } = await sb.from('golf_courses').select('pars').eq('id', courseId).maybeSingle();
  if (!data || !data.pars) return null;
  // 27/36홀 두 코스 조합: "Lagoon+Palm" → 9 + 9 = 18개
  if (courseKey && courseKey.includes('+')) {
    const parts = courseKey.split('+').map(s => s.trim()).filter(Boolean);
    if (parts.length === 2) {
      const a = data.pars[parts[0]];
      const b = data.pars[parts[1]];
      if (Array.isArray(a) && Array.isArray(b) && a.length === 9 && b.length === 9) {
        return [...a, ...b];
      }
    }
  }
  if (data.pars[courseKey]) return data.pars[courseKey];
  if (data.pars.main) return data.pars.main;
  const keys = Object.keys(data.pars);
  if (keys.length > 0) return data.pars[keys[0]];
  return null;
}

function _parSum(arr) {
  return arr.filter(p => typeof p === 'number' && p > 0).reduce((a, b) => a + b, 0);
}
function _scoreSum(arr) {
  let sum = 0, any = false;
  for (const s of arr) {
    if (s === null || s === undefined || s === '') continue;
    const n = parseInt(s);
    if (!isNaN(n)) { sum += n; any = true; }
  }
  return any ? sum : '';
}

function _scoreCell(s, holeNo, prefix, readonly) {
  if (readonly === true) {
    return '<td style="padding:5px 0;border:1px solid #ddd;text-align:center;font-weight:600;font-size:13px;">' + (s == null ? '' : s) + '</td>';
  }
  const val = (s == null ? '' : s);
  const id = prefix + '-' + holeNo;
  return '<td style="padding:2px;border:1px solid #ddd;"><input type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="2" id="' + id + '" value="' + val + '" style="width:100%;padding:5px 0;text-align:center;border:1px solid #ccc;border-radius:3px;font-size:14px;font-weight:600;" oninput="this.value=this.value.replace(/[^0-9]/g,\'\'); window._gd && window._gd.recalcScoreCard && window._gd.recalcScoreCard(\'' + prefix + '\')"></td>';
}

function _make9(holeNums, parsArr, scoresArr, startIdx, sumLabel, sumPar, sumScoreId, sumScoreVal, prefix, readonly) {
  let holesRow = '';
  for (const n of holeNums) holesRow += '<th style="padding:5px 0;border:1px solid #1b5e20;font-size:11px;">' + n + '</th>';
  let parsCells = '';
  for (const p of parsArr) parsCells += '<td style="padding:5px 0;border:1px solid #ddd;text-align:center;color:#555;font-size:12px;">' + (p == null ? '' : p) + '</td>';
  let scoresCells = '';
  for (let i = 0; i < scoresArr.length; i++) {
    scoresCells += _scoreCell(scoresArr[i], startIdx + i, prefix, readonly);
  }
  return '<table style="border-collapse:collapse;width:100%;table-layout:fixed;font-size:12px;margin-bottom:6px;">' +
    '<thead><tr style="background:#2e7d32;color:white;">' +
    '<th style="padding:5px;border:1px solid #1b5e20;font-size:11px;width:42px;">Hole</th>' +
    holesRow +
    '<th style="padding:5px;border:1px solid #1b5e20;background:#1b5e20;font-size:11px;width:36px;">' + sumLabel + '</th>' +
    '</tr></thead><tbody>' +
    '<tr style="background:#f5f5f5;">' +
    '<td style="padding:5px;border:1px solid #ddd;font-weight:600;font-size:11px;">Par</td>' +
    parsCells +
    '<td style="padding:5px 0;border:1px solid #ddd;text-align:center;background:#e8f5e9;font-weight:600;font-size:12px;">' + (sumPar || '') + '</td>' +
    '</tr>' +
    '<tr>' +
    '<td style="padding:5px;border:1px solid #ddd;font-weight:600;font-size:11px;">Score</td>' +
    scoresCells +
    '<td style="padding:5px 0;border:1px solid #ddd;text-align:center;background:#fff3e0;font-weight:600;font-size:13px;" id="' + sumScoreId + '">' + (sumScoreVal || '') + '</td>' +
    '</tr></tbody></table>';
}

function _render18(pars, scores, prefix, readonly) {
  const f9p = pars.slice(0, 9), b9p = pars.slice(9, 18);
  const f9s = scores.slice(0, 9), b9s = scores.slice(9, 18);
  const fps = _parSum(f9p), bps = _parSum(b9p);
  const fss = _scoreSum(f9s), bss = _scoreSum(b9s);
  const tps = (fps && bps) ? fps + bps : (fps || bps || '');
  const tss = (typeof fss === 'number' && typeof bss === 'number') ? fss + bss : (fss || bss || '');
  const front = _make9([1,2,3,4,5,6,7,8,9], f9p, f9s, 1, 'OUT', fps, prefix + '-sc-out', fss, prefix, readonly);
  const back = _make9([10,11,12,13,14,15,16,17,18], b9p, b9s, 10, 'IN', bps, prefix + '-sc-in', bss, prefix, readonly);
  const totalBox = '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#fff3e0;border:1px solid #ff9800;border-radius:6px;margin-top:8px;">' +
    '<span style="font-weight:700;color:#e65100;">TOTAL</span>' +
    '<span style="font-size:14px;">Par <span id="' + prefix + '-par-total" style="font-weight:600;">' + (tps || '-') + '</span>  ·  Score <span id="' + prefix + '-sc-total" style="color:#d32f2f;font-weight:700;font-size:18px;">' + (tss || '-') + '</span></span>' +
    '</div>';
  return '<div>' + front + back + totalBox + '</div>';
}

function _render9(pars, scores, prefix, readonly) {
  const ps = _parSum(pars);
  const ss = _scoreSum(scores);
  return _make9([1,2,3,4,5,6,7,8,9], pars, scores, 1, 'TOTAL', ps, prefix + '-sc-total', ss, prefix, readonly);
}

export function renderScorecard(opts) {
  const opt = opts || {};
  const holes = opt.holes || 18;
  const prefix = opt.prefix || 'hole';
  const readonly = opt.readonly === true;
  const safePars = (opt.pars && opt.pars.length === holes) ? opt.pars : new Array(holes).fill(null);
  const safeScores = new Array(holes).fill(null);
  if (Array.isArray(opt.scores)) {
    for (let i = 0; i < Math.min(opt.scores.length, holes); i++) {
      if (opt.scores[i] !== null && opt.scores[i] !== undefined) safeScores[i] = opt.scores[i];
    }
  }
  if (holes === 18) return _render18(safePars, safeScores, prefix, readonly);
  return _render9(safePars, safeScores, prefix, readonly);
}

// ── 신페리오 12홀 시각화 (빈 스코어카드 + 선정홀 노란 배경) ──
function _make9PeoriaView(holeNums, parsArr, startIdx, peoriaSet) {
  let holesRow = '';
  let parsCells = '';
  for (let i = 0; i < holeNums.length; i++) {
    const n = holeNums[i];
    const isPeoria = peoriaSet.has(n);
    const headerBg = isPeoria ? 'background:#f9a825;color:#1a1a1a;' : '';
    holesRow += '<th style="padding:5px 0;border:1px solid #1b5e20;font-size:11px;' + headerBg + '">' + n + '</th>';
    const cellBg = isPeoria
      ? 'background:#fff59d;font-weight:700;color:#e65100;border:2px solid #fbc02d;'
      : 'color:#999;background:#fafafa;';
    parsCells += '<td style="padding:6px 0;text-align:center;font-size:13px;' + cellBg + '">' + (parsArr[i] == null ? '-' : parsArr[i]) + '</td>';
  }
  return '<table style="border-collapse:collapse;width:100%;table-layout:fixed;font-size:12px;margin-bottom:6px;">' +
    '<thead><tr style="background:#2e7d32;color:white;">' +
    '<th style="padding:5px;border:1px solid #1b5e20;font-size:11px;width:42px;">Hole</th>' +
    holesRow +
    '</tr></thead><tbody>' +
    '<tr>' +
    '<td style="padding:5px;border:1px solid #ddd;font-weight:600;font-size:11px;background:#f5f5f5;">Par</td>' +
    parsCells +
    '</tr></tbody></table>';
}

export function renderPeoriaHolesCard(pars, peoriaHoles) {
  const safePars = (Array.isArray(pars) && pars.length === 18) ? pars : new Array(18).fill(null);
  const peoriaList = Array.isArray(peoriaHoles)
    ? peoriaHoles.map(h => parseInt(h)).filter(h => !isNaN(h) && h >= 1 && h <= 18)
    : [];
  const peoriaSet = new Set(peoriaList);
  const sortedPeoria = Array.from(peoriaSet).sort((a, b) => a - b);
  const f9p = safePars.slice(0, 9);
  const b9p = safePars.slice(9, 18);
  const front = _make9PeoriaView([1,2,3,4,5,6,7,8,9], f9p, 1, peoriaSet);
  const back = _make9PeoriaView([10,11,12,13,14,15,16,17,18], b9p, 10, peoriaSet);
  return '<div style="margin-top:6px;">' +
    '<div style="padding:10px 12px;background:linear-gradient(135deg,#fff59d,#f9a825);border-radius:6px;margin-bottom:10px;font-size:13px;color:#1a1a1a;font-weight:700;text-align:center;">' +
    '🎯 신페리오 선정 12홀 (노란 칸)' +
    '</div>' +
    front + back +
    '<div style="font-size:11px;color:#666;margin-top:6px;text-align:center;">선정홀: ' + sortedPeoria.join(', ') + '</div>' +
    '</div>';
}
