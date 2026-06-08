// views/coursesAdminEdit.js — Super-admin 골프장 신규/수정 폼 (2026-05-29 grid Par)
import { loadCourse, REGION_OPTIONS, HOLES_OPTIONS } from '../domain/courses.js';
import { isAdmin } from '../core/auth.js';
import { sb } from '../core/db.js';
import { escapeHtml } from '../core/ui-kit.js';

function safeKey(name) {
  return String(name || '').replace(/[^a-zA-Z0-9가-힣]/g, '_');
}

// 9홀 그리드 (입력 9개 + OUT/IN/합계)
function render9Grid(prefix, initArr, startHole, sumLabel) {
  let heads = '';
  let inputs = '';
  for (let i = 0; i < 9; i++) {
    const holeNo = startHole + i;
    const v = (Array.isArray(initArr) && initArr[i] != null) ? initArr[i] : '';
    heads += `<th style="padding:4px;border:1px solid #1b5e20;font-size:11px;color:white;">${holeNo}</th>`;
    inputs += `<td style="padding:2px;border:1px solid #ddd;background:#fff;">
      <input type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="1" id="${prefix}_${i}" value="${v}"
        style="width:100%;padding:5px 0;text-align:center;border:none;font-size:14px;font-weight:600;background:transparent;outline:none;"
        oninput="this.value=this.value.replace(/[^0-9]/g,''); window._gd.recalcCoursePar('${prefix}')">
    </td>`;
  }
  const initSum = (Array.isArray(initArr) && initArr.length >= 9)
    ? initArr.slice(0, 9).reduce((a, b) => a + (parseInt(b) || 0), 0)
    : '-';
  return `
    <table style="border-collapse:collapse;width:100%;table-layout:fixed;font-size:12px;margin-bottom:6px;">
      <thead><tr style="background:#2e7d32;color:white;">
        <th style="padding:4px;border:1px solid #1b5e20;font-size:11px;width:42px;">Hole</th>
        ${heads}
        <th style="padding:4px;border:1px solid #1b5e20;background:#1b5e20;font-size:11px;width:42px;">${sumLabel}</th>
      </tr></thead>
      <tbody><tr>
        <td style="padding:5px;border:1px solid #ddd;font-weight:600;font-size:11px;background:#f5f5f5;text-align:center;">Par</td>
        ${inputs}
        <td style="padding:5px 0;border:1px solid #ddd;text-align:center;background:#e8f5e9;font-weight:700;font-size:13px;color:#1B5E20;" id="${prefix}_sum">${initSum}</td>
      </tr></tbody>
    </table>
  `;
}

function render18Grid(initArr18) {
  const front = Array.isArray(initArr18) ? initArr18.slice(0, 9) : [];
  const back = Array.isArray(initArr18) ? initArr18.slice(9, 18) : [];
  const f9 = render9Grid('ca_parF', front, 1, 'OUT');
  const b9 = render9Grid('ca_parB', back, 10, 'IN');
  const totalSum = Array.isArray(initArr18) && initArr18.length === 18
    ? initArr18.reduce((a, b) => a + (parseInt(b) || 0), 0)
    : '-';
  return `
    ${f9}
    ${b9}
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#fff3e0;border:1px solid #ff9800;border-radius:6px;margin-top:6px;">
      <span style="font-weight:700;color:#e65100;font-size:13px;">TOTAL Par</span>
      <span style="font-weight:700;color:#d32f2f;font-size:18px;" id="ca_par_total">${totalSum}</span>
    </div>
  `;
}

export async function coursesAdminEditView(params) {
  const admin = await isAdmin();
  let canEdit = !!admin;
  if (!canEdit) {
    try {
      const { data } = await sb.rpc('is_email_verified_user');
      canEdit = !!data;
    } catch (e) { console.warn('perm check err', e); }
  }
  if (!canEdit) return `<div class="card"><h2>⚠️ 권한 없음</h2><p style="color:#666;font-size:13px;">이메일 인증 회원만 가능합니다.</p><button class="btn btn-secondary" onclick="window._gd.goBack()">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button></div>`;
  // [removed - canEdit covers this]

  const id = params?.id;
  const isEdit = !!id;

  let cur = { name:'', region:'', district:'', holes:18, course_names:[], pars:{} };
  if (isEdit) {
    const { data, error } = await loadCourse(id);
    if (error || !data) return `<div class="card"><button class="btn btn-secondary" onclick="window._gd.goBack()">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button><p style="margin-top:12px;color:#d32f2f;">골프장 없음</p></div>`;
    cur = {
      name: data.name || '',
      region: data.region || '',
      district: data.district || '',
      holes: data.holes || 18,
      course_names: data.course_names || [],
      pars: (data.pars && typeof data.pars === 'object') ? data.pars : {}
    };
  }

  const regionOpts = REGION_OPTIONS.map(r => `<option value="${escapeHtml(r)}" ${cur.region===r?'selected':''}>${escapeHtml(r)}</option>`).join('');
  const holesOpts = HOLES_OPTIONS.map(h => `<option value="${h}" ${cur.holes===h?'selected':''}>${h}홀</option>`).join('');
  const courseNamesStr = (cur.course_names || []).join(', ');
  const showCourseNames = cur.holes >= 27;

  // Par UI
  let parsUI = '';
  if (cur.holes === 18) {
    let arr = [];
    if (Array.isArray(cur.pars.main)) arr = cur.pars.main;
    else if (Array.isArray(cur.pars)) arr = cur.pars;
    else {
      const keys = Object.keys(cur.pars);
      if (keys.length && Array.isArray(cur.pars[keys[0]])) arr = cur.pars[keys[0]];
    }
    parsUI = `
      <div style="margin-top:14px;padding:12px;background:#FFF8E1;border-radius:8px;border:1px solid #FFB300;">
        <div style="font-weight:700;color:#F57F17;font-size:13px;margin-bottom:8px;">⛳ Par 입력 (각 홀 1~9 숫자)</div>
        ${render18Grid(arr)}
      </div>
    `;
  } else {
    if (cur.course_names && cur.course_names.length >= 2) {
      const blocks = cur.course_names.map(cname => {
        const k = safeKey(cname);
        const arr = cur.pars[cname] || [];
        return `
          <div style="margin-bottom:10px;padding:10px;background:#FFF8E1;border-radius:6px;border:1px solid #FFB300;">
            <div style="font-weight:700;color:#F57F17;font-size:12px;margin-bottom:6px;">⛳ ${escapeHtml(cname)}</div>
            ${render9Grid('ca_parC_' + k, arr, 1, 'TOTAL')}
          </div>
        `;
      }).join('');
      parsUI = `
        <div style="margin-top:14px;">
          <p style="font-size:12px;font-weight:600;color:#1B5E20;margin-bottom:8px;">⛳ 코스별 Par 입력 (각 9홀)</p>
          ${blocks}
        </div>
      `;
    } else {
      parsUI = `
        <div style="margin-top:14px;padding:12px;background:#FAFAFA;border-radius:6px;color:#999;font-size:12px;text-align:center;">
          코스명을 입력하고 저장하면 코스별 Par 입력란이 나타납니다.
        </div>
      `;
    }
  }

  return `
    <div class="card">
      <button class="btn btn-secondary" style="font-size:12px;padding:6px 10px;" onclick="window._gd.goBack()">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      <h2 style="margin:12px 0 8px;">${isEdit ? '✏️ 골프장 수정' : '+ 신규 골프장'}</h2>

      <label style="display:block;margin-top:14px;font-weight:600;">이름 *</label>
      <input id="ca_name" class="input" type="text" value="${escapeHtml(cur.name)}" placeholder="예: Alpine Golf & Sports Club">

      <label style="display:block;margin-top:12px;font-weight:600;">권역</label>
      <select id="ca_region" class="input">
        <option value="">— 선택 —</option>
        ${regionOpts}
      </select>

      <label style="display:block;margin-top:12px;font-weight:600;">지역 (district)</label>
      <input id="ca_district" class="input" type="text" value="${escapeHtml(cur.district)}" placeholder="예: 방나, 빠툼타니, 촌부리">

      <label style="display:block;margin-top:12px;font-weight:600;">홀수</label>
      <select id="ca_holes" class="input" onchange="window._gd.onCourseHolesChange()">
        ${holesOpts}
      </select>

      <div id="ca_course_names_block" style="${showCourseNames?'':'display:none;'}margin-top:12px;">
        <label style="display:block;font-weight:600;color:#e65100;">코스명 (27/36홀, 콤마 구분)</label>
        <input id="ca_course_names" class="input" type="text" value="${escapeHtml(courseNamesStr)}" placeholder="예: Augusta, Belfry, Cypress, Dune" style="border:1px solid #ff9800;">
        <p style="font-size:11px;color:#999;margin-top:4px;">코스명 변경 후 한 번 저장하면 코스별 Par 입력란이 갱신됩니다</p>
      </div>

      ${parsUI}

      <button class="btn btn-primary" onclick="${isEdit ? `window._gd.doSaveCourse('${id}')` : 'window._gd.doCreateCourse()'}" style="margin-top:20px;width:100%;">
        ${isEdit ? '💾 수정 저장' : '+ 등록'}
      </button>
    </div>
  `;
}
