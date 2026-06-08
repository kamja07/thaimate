// domain/business.js — 후원사 (사업체)
import { sb, query, mutate } from '../core/db.js';
import { getSession } from '../core/auth.js';
import { resizeImage } from './market.js';

export const BIZ_TYPES = [
  { key: 'golf_course', label: '⛳ 골프장', color: '#2E7D32' },
  { key: 'hotel_resort', label: '🏨 호텔/리조트', color: '#1565c0' },
  { key: 'travel_agency', label: '✈️ 여행사', color: '#7B1FA2' },
  { key: 'transport', label: '🚐 차량·기사', color: '#E65100' },
  { key: 'korean_restaurant', label: '🍚 한식당', color: '#C62828' },
  { key: 'other', label: '🏪 기타', color: '#616161' }
];

export const BIZ_TYPE_LABEL = Object.fromEntries(BIZ_TYPES.map(t => [t.key, t.label]));

export async function loadBusinesses({ type } = {}) {
  const { cached: _cached } = await import('../core/cache-helper.js');
  return _cached('loadBusinesses_' + JSON.stringify([{ type } = {}]), 10000, async () => {
  let q = sb.from('businesses').select('*').eq('verification_status', 'verified').order('applied_at', { ascending: false });
  if (type) q = q.eq('type', type);
  const { data, error } = await q.limit(50);
  return { data: data || [], error };
});
}

export async function loadBusiness(id) {
  return await query(sb.from('businesses').select('*, applicant:profiles!businesses_applied_by_fkey(id,name)').eq('id', id).maybeSingle());
}

export async function loadMyBusinesses() {
  const { cached: _cached } = await import('../core/cache-helper.js');
  return _cached('loadMyBusinesses', 10000, async () => {
  const session = getSession();
  if (!session) return { data: [] };
  const { data } = await sb.from('businesses').select('*').eq('applied_by', session.user.id).order('applied_at', {ascending:false});
  return { data: data || [] };
});
}

export async function loadPendingBusinesses() {
  const { data } = await sb.from('businesses').select('*, applicant:profiles!businesses_applied_by_fkey(id,name)').eq('verification_status', 'pending').order('applied_at');
  return { data: data || [] };
}

export async function applyBusiness({ name, type, location, region, address, description, phone, website, contact_email, photos, logo_url }) {
  const session = getSession();
  if (!session) return { error: new Error('로그인 필요') };
  const { isVerifiedEmail } = await import('../core/email-verify.js');
  if (!isVerifiedEmail(session.user)) {
    return { error: new Error('이메일 인증이 필요합니다 — MY 페이지에서 진짜 이메일을 등록하고 인증해주세요') };
  }
  if (!name?.trim()) return { error: new Error('상호명 필수') };
  if (!type) return { error: new Error('업종 필수') };
  
  const row = {
    type, name: name.trim(),
    location: location?.trim() || null,
    region: region?.trim() || null,
    address: address?.trim() || null,
    description: description?.trim() || null,
    phone: phone?.trim() || null,
    website: website?.trim() || null,
    contact_email: contact_email?.trim() || null,
    photos: Array.isArray(photos) ? photos : [],
    logo_url: logo_url || null,
    applied_by: session.user.id,
    verification_status: 'pending'
  };
  
  const { data, error, rls } = await mutate(
    sb.from('businesses').insert(row).select(),
    { rlsMessage: '사업체 신청 실패' }
  );
  return { data: data?.[0], error, rls };
}

export async function approveBusiness(id) {
  const session = getSession();
  const { error } = await sb.from('businesses').update({
    verification_status: 'verified',
    reviewed_by: session?.user?.id,
    reviewed_at: new Date().toISOString(),
    rejection_reason: null
  }).eq('id', id);
  return { error };
}

export async function rejectBusiness(id, reason) {
  const session = getSession();
  const { error } = await sb.from('businesses').update({
    verification_status: 'rejected',
    reviewed_by: session?.user?.id,
    reviewed_at: new Date().toISOString(),
    rejection_reason: reason || '사유 미기재'
  }).eq('id', id);
  return { error };
}

export async function uploadBusinessPhoto(file) {
  const session = getSession();
  if (!session) return { error: new Error('로그인 필요') };
  let processedFile = file;
  try { processedFile = await resizeImage(file); } catch(_) {}
  const fileName = session.user.id + '/' + Date.now() + '_' + Math.random().toString(36).slice(2,8) + '.jpg';
  const { data, error } = await sb.storage.from('business-photos').upload(fileName, processedFile, {
    cacheControl: '3600', upsert: false
  });
  if (error) return { error };
  const { data: urlData } = sb.storage.from('business-photos').getPublicUrl(data.path);
  return { url: urlData.publicUrl, path: data.path };
}
