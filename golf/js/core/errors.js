// core/errors.js — Standardized error messages

import { toastError } from './ui-kit.js';

const CODE_MESSAGES = {
  'PGRST116': '권한이 없습니다',
  'PGRST301': '데이터를 찾을 수 없습니다',
  '23505': '이미 존재합니다 (중복)',
  '23503': '연결된 데이터가 없습니다',
  '42501': '권한이 없습니다 (RLS)',
};

export function standardMessage(error) {
  if (!error) return '알 수 없는 오류';
  if (typeof error === 'string') return error;
  // Supabase error
  if (error.code && CODE_MESSAGES[error.code]) return CODE_MESSAGES[error.code];
  // Network
  if (error.message && /failed to fetch|networkerror/i.test(error.message)) return '네트워크 오류 — 인터넷 연결을 확인하세요';
  // Generic
  return error.message || String(error);
}

export function showError(error, prefix = '') {
  const msg = standardMessage(error);
  toastError(prefix ? `${prefix}: ${msg}` : msg);
  console.error('[error]', error);
}

// Wrapper for async operations — auto-shows toast on error
export async function withErrorToast(promise, prefix) {
  try {
    return await promise;
  } catch (e) {
    showError(e, prefix);
    throw e;
  }
}
