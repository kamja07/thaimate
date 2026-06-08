// core/render.js — Render engine (stale-while-revalidate)
// renderApp() reads current route + asks views[type] for HTML, applies to #app
// Perf: on navigation, instantly paints last cached HTML (or skeleton), then
//       revalidates in the background and swaps in fresh HTML when ready.
//       Same-view refresh (e.g. after a mutation) skips the stale paint.
// Preserves scroll position via _scrollMemory.

import { getCurrentView, getStack } from './router.js';

let _views = {};
const _scrollMemory = new Map(); // viewKey → scrollY
const _htmlCache = new Map();    // viewKey → last rendered HTML (instant repaint)
let _lastKey = null;

export function registerViews(viewMap) {
  Object.assign(_views, viewMap);
}

// Clear cached HTML (call on login/logout, or after a big mutation).
// prefix: clear only keys starting with it (e.g. 'clubDetail'); empty = clear all.
export function invalidateView(prefix) {
  if (!prefix) { _htmlCache.clear(); return; }
  for (const k of _htmlCache.keys()) if (k.startsWith(prefix)) _htmlCache.delete(k);
}

function viewKey(v) { return v.type + ':' + JSON.stringify(v.params || {}); }

function restoreScroll(view) {
  const savedY = _scrollMemory.get(viewKey(view));
  requestAnimationFrame(() => window.scrollTo(0, savedY || 0));
}

const SKELETON = `<div class="card" style="text-align:center;padding:46px 0;color:#9aa0a6;font-size:14px">불러오는 중…</div>`;

export async function renderApp() {
  const view = getCurrentView();
  if (!view) return;

  // Save current scroll for the OUTGOING view
  const stack = getStack();
  if (stack.length >= 2) {
    const prev = stack[stack.length - 2];
    _scrollMemory.set(viewKey(prev), window.scrollY);
  }

  const app = document.getElementById('app');
  const handler = _views[view.type];
  if (!handler) {
    app.innerHTML = `<div class="card"><h2>알 수 없는 화면</h2><p>${view.type}</p></div>`;
    _lastKey = null;
    return;
  }

  const key = viewKey(view);
  const isNav = (key !== _lastKey);   // true = moved to a different screen
  _lastKey = key;

  // 1) Instant paint on navigation (stale HTML if we have it, else skeleton).
  //    On a same-view refresh we keep current DOM and just revalidate (no stale flash).
  if (isNav) {
    app.innerHTML = _htmlCache.has(key) ? _htmlCache.get(key) : SKELETON;
    if (_htmlCache.has(key)) restoreScroll(view);
  }

  // 2) Revalidate: run the view, then swap in fresh HTML (only if still on this view).
  try {
    const html = await handler(view.params);
    _htmlCache.set(key, html);
    const cur = getCurrentView();
    if (cur && viewKey(cur) === key) {
      app.innerHTML = html;
      restoreScroll(view);
    }
  } catch (e) {
    console.error('[render] view error', view.type, e);
    const cur = getCurrentView();
    if (cur && viewKey(cur) === key) {
      app.innerHTML = `<div class="card"><h2>오류 발생</h2><p>${e.message}</p><button class="btn btn-primary" onclick="location.reload()">새로고침</button></div>`;
    }
  }
}
