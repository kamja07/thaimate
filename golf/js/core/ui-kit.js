// core/ui-kit.js — Reusable UI primitives
// toast, dialog, confirmDialog, loading, escapeHtml

export function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Toast — top of screen, auto-dismiss
export function toast(message, type = 'default', ms = 3100) {
  const el = document.createElement('div');
  el.className = 'toast toast-' + type;
  el.textContent = message;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), ms);
}

export function toastSuccess(m) { toast(m, 'success'); }
export function toastError(m) { toast(m, 'error'); }
export function toastWarn(m) { toast(m, 'warn'); }

let _loadingCount = 0;
let _loadingTimer = null;
const LOADING_DELAY = 350; // 이보다 빨리 끝나는 화면전환/액션은 스피너를 띄우지 않음 (번쩍임 제거)
export function showLoading() {
  _loadingCount++;
  if (_loadingCount === 1 && _loadingTimer === null) {
    _loadingTimer = setTimeout(() => {
      _loadingTimer = null;
      if (_loadingCount > 0) {
        const el = document.getElementById('loading-overlay');
        if (el) el.style.display = 'flex';
      }
    }, LOADING_DELAY);
  }
}
export function hideLoading() {
  _loadingCount = Math.max(0, _loadingCount - 1);
  if (_loadingCount === 0) {
    if (_loadingTimer !== null) { clearTimeout(_loadingTimer); _loadingTimer = null; }
    const el = document.getElementById('loading-overlay');
    if (el) el.style.display = 'none';
  }
}

export function dialog({ title, body, buttons = [{ label: '확인', value: true, primary: true }] }) {
  return new Promise(resolve => {
    const container = document.getElementById('dialog-container');
    const id = 'dlg_' + Date.now();
    const html = `
      <div class="dialog-backdrop" id="${id}">
        <div class="dialog">
          ${title ? `<div class="dialog-title">${escapeHtml(title)}</div>` : ''}
          <div class="dialog-body">${escapeHtml(body || '')}</div>
          <div class="dialog-actions">
            ${buttons.map((b, i) => {
              const cls = b.primary ? 'btn-primary' : b.danger ? 'btn-danger' : 'btn-secondary';
              return `<button class="btn ${cls}" data-idx="${i}">${escapeHtml(b.label)}</button>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    const root = document.getElementById(id);
    const cleanup = () => root.remove();
    root.addEventListener('click', e => {
      if (e.target === root) { cleanup(); resolve(null); return; }
      const btn = e.target.closest('button[data-idx]');
      if (btn) { const idx = +btn.dataset.idx; cleanup(); resolve(buttons[idx].value); }
    });
  });
}

export async function confirmDialog(message, { title = '확인', okLabel = '확인', cancelLabel = '취소', danger = false } = {}) {
  const result = await dialog({
    title,
    body: message,
    buttons: [
      { label: cancelLabel, value: false },
      { label: okLabel, value: true, primary: !danger, danger }
    ]
  });
  return result === true;
}

export function promptDialog({ title, body, placeholder = '', initial = '', okLabel = '확인' } = {}) {
  return new Promise(resolve => {
    const container = document.getElementById('dialog-container');
    const id = 'dlg_' + Date.now();
    const html = `
      <div class="dialog-backdrop" id="${id}">
        <div class="dialog">
          ${title ? `<div class="dialog-title">${escapeHtml(title)}</div>` : ''}
          ${body ? `<div class="dialog-body">${escapeHtml(body)}</div>` : ''}
          <input type="text" id="${id}_input" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(initial)}" style="width:100%;padding:10px;margin-top:12px;border:1px solid var(--border);border-radius:8px;font-size:15px;">
          <div class="dialog-actions">
            <button class="btn btn-secondary" data-act="cancel">취소</button>
            <button class="btn btn-primary" data-act="ok">${escapeHtml(okLabel)}</button>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    const root = document.getElementById(id);
    const input = document.getElementById(id + '_input');
    setTimeout(() => input.focus(), 50);
    const close = (val) => { root.remove(); resolve(val); };
    root.addEventListener('click', e => {
      if (e.target === root) close(null);
      else if (e.target.dataset.act === 'cancel') close(null);
      else if (e.target.dataset.act === 'ok') close(input.value);
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') close(input.value);
      if (e.key === 'Escape') close(null);
    });
  });
}
