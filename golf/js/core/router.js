// core/router.js — Hash-based router with viewStack
// pushView({type, params}) — push new view
// popView() — go back one step
// popTo(type) — go back to specific view type
// onChange(fn) — subscribe to view changes

import { onAuthChange } from './auth.js';

let _stack = [{ type: 'home', params: {} }];
const _listeners = [];

export function onChange(fn) { _listeners.push(fn); return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1); }; }
export function getCurrentView() { return _stack[_stack.length - 1]; }
export function getStack() { return [..._stack]; }

function emit() { _listeners.forEach(fn => { try { fn(getCurrentView()); } catch(e) { console.warn('router listener err', e); } }); }

export function pushView(view) {
  if (!view || !view.type) { console.warn('pushView: invalid view', view); return; }
  _stack.push({ type: view.type, params: view.params || {} });
  history.pushState({ _gd: _stack.length }, '', updateHash(view));
  emit();
}

export function popView() {
  if (_stack.length > 1) {
    _stack.pop();
    history.back();
    emit();
  }
}

export function popViewSafe() {
  if (_stack.length > 1) {
    _stack.pop();
    history.back();
  } else {
    if (_stack[0]?.type !== 'home') {
      _stack = [{ type: 'home', params: {} }];
    }
    history.replaceState({ _gd: 1 }, '', location.pathname);
  }
  emit();
}

export function popTo(type) {
  while (_stack.length > 1 && _stack[_stack.length - 1].type !== type) {
    _stack.pop();
  }
  emit();
}

export function replaceTop(view) {
  _stack[_stack.length - 1] = { type: view.type, params: view.params || {} };
  emit();
}

export function resetTo(view) {
  _stack = [{ type: view.type, params: view.params || {} }];
  emit();
}

function updateHash(view) {
  const map = { clubDetail: 'c', matchDetail: 'm', sponsorDetail: 's', marketItem: 'i', eventDetail: 'e' };
  const prefix = map[view.type];
  const id = view.params?.id || view.params?.clubId || view.params?.matchId || view.params?.sponsorId || view.params?.eventId;
  return prefix && id ? `#${prefix}/${id}` : '';
}

function fromHash() {
  const m = location.hash.match(/^#([a-z])\/([0-9a-f-]+)/i);
  if (!m) return null;
  const reverseMap = { c: 'clubDetail', m: 'matchDetail', s: 'sponsorDetail', i: 'marketItem', e: 'eventDetail' };
  const type = reverseMap[m[1]];
  return type ? { type, params: { id: m[2] } } : null;
}

window.addEventListener('popstate', () => {
  if (_stack.length > 1) {
    _stack.pop();
    emit();
  } else {
    if (_stack[0]?.type !== 'home') {
      _stack = [{ type: 'home', params: {} }];
    }
    history.pushState({ _gd: 1 }, '', location.pathname);
    emit();
  }
});

window.addEventListener('hashchange', () => {
  const v = fromHash();
  if (v) pushView(v);
});

export function start() {
  const v = fromHash();
  if (v) _stack = [{ type: 'home', params: {} }, v];
  history.replaceState({ _gd: _stack.length }, '', location.pathname + location.hash);
  onAuthChange(() => emit());
  emit();
}
