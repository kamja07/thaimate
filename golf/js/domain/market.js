// domain/market.js — 나눔터 (구 장터) 매물
import { sb, query, mutate } from '../core/db.js';
import { getSession } from '../core/auth.js';

export const MARKET_CATEGORIES = ['골프용품','생활용품','차량','숙소','기타'];
export const GOLF_SUBCATEGORIES = ['드라이버','우드','아이언세트','웨지','퍼터','풀세트','골프백','의류','신발','기타'];

export async function loadMarketItems({ category } = {}) {
  const { cached: _cached } = await import('../core/cache-helper.js');
  return _cached('loadMarketItems_' + JSON.stringify([{ category }]), 10000, async () => {
    let q = sb.from('market_items')
      .select('id, seller_id, title, category, sub_category, price, condition, icon, description, status, images, location, created_at, profiles!market_items_seller_id_fkey(id, name)')
      .order('created_at', { ascending: false });
    if (category) q = q.eq('category', category);
    const { data, error } = await q.limit(50);
    return { data: data || [], error };
  });
}

export async function loadMarketItem(id) {
  return await query(sb.from('market_items')
    .select('*, profiles!market_items_seller_id_fkey(id, name, location, handicap)')
    .eq('id', id).maybeSingle());
}

export async function createMarketItem({ title, category, subCategory, price, condition, description, location, images }) {
  const session = getSession();
  if (!session) return { error: new Error('로그인 필요') };
  const { isVerifiedEmail } = await import('../core/email-verify.js');
  if (!isVerifiedEmail(session.user)) {
    return { error: new Error('이메일 인증이 필요합니다 — MY 페이지에서 진짜 이메일을 등록하고 인증해주세요') };
  }
  if (!title?.trim()) return { error: new Error('제목 필수') };
  if (!category) return { error: new Error('카테고리 필수') };
  if (category === '골프용품' && !subCategory) return { error: new Error('골프용품 세부 카테고리 필수') };
  if (price == null || price === '') return { error: new Error('가격 필수') };

  const row = {
    seller_id: session.user.id,
    title: title.trim(),
    category,
    sub_category: subCategory || null,
    price: parseInt(price),
    condition: condition || '중고',
    description: description?.trim() || null,
    location: location?.trim() || null,
    images: Array.isArray(images) ? images : [],
    status: '판매중',
    icon: '🤝'
  };

  const { data, error, rls } = await mutate(
    sb.from('market_items').insert(row).select(),
    { rlsMessage: '나눔 등록 실패' }
  );
  return { data: data?.[0], error, rls };
}

export async function updateMarketItem(id, fields) {
  const updates = {};
  if (fields.title != null) updates.title = fields.title.trim();
  if (fields.category) updates.category = fields.category;
  if (fields.subCategory !== undefined) updates.sub_category = fields.subCategory || null;
  if (fields.price != null) updates.price = parseInt(fields.price);
  if (fields.condition != null) updates.condition = fields.condition;
  if (fields.description !== undefined) updates.description = fields.description?.trim() || null;
  if (fields.location !== undefined) updates.location = fields.location?.trim() || null;
  if (fields.images !== undefined) updates.images = fields.images;
  if (fields.status) updates.status = fields.status;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await sb.from('market_items').update(updates).eq('id', id).select();
  return { data: data?.[0], error };
}

export async function completeAndDeleteItem(id) {
  const { data: item } = await sb.from('market_items').select('images').eq('id', id).maybeSingle();
  if (item?.images && item.images.length) {
    const paths = item.images.map(url => {
      const m = url.match(/\/market-photos\/(.+?)(\?|$)/);
      return m ? m[1] : null;
    }).filter(Boolean);
    if (paths.length) {
      await sb.storage.from('market-photos').remove(paths);
    }
  }
  const { error } = await sb.from('market_items').delete().eq('id', id);
  return { error };
}

export async function resizeImage(file, maxWidth = 1920, quality = 0.85) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth || height > maxWidth) {
            const scale = maxWidth / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('blob 생성 실패'));
            const fname = (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
            resolve(new File([blob], fname, { type: 'image/jpeg' }));
          }, 'image/jpeg', quality);
        };
        img.onerror = () => reject(new Error('이미지 로드 실패'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('파일 읽기 실패'));
      reader.readAsDataURL(file);
    } catch(e) { reject(e); }
  });
}

export async function uploadMarketPhoto(file) {
  const session = getSession();
  if (!session) return { error: new Error('로그인 필요') };
  let processedFile = file;
  try {
    processedFile = await resizeImage(file);
  } catch (e) { console.warn('[uploadMarketPhoto] resize fail, using original', e); }
  const ext = 'jpg';
  const fileName = session.user.id + '/' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;

  const { data, error } = await sb.storage.from('market-photos').upload(fileName, processedFile, {
    cacheControl: '3600',
    upsert: false
  });
  if (error) return { error };

  const { data: urlData } = sb.storage.from('market-photos').getPublicUrl(data.path);
  return { url: urlData.publicUrl, path: data.path };
}
