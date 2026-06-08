// views/marketCreate.js — 나눔 등록/수정 (5개 대분류 + 골프 소분류)
import { MARKET_CATEGORIES, GOLF_SUBCATEGORIES, createMarketItem, uploadMarketPhoto, loadMarketItem } from '../domain/market.js';
import { escapeHtml } from '../core/ui-kit.js';

export async function marketCreateView(params) {
  const itemId = params?.id;
  const isEdit = !!itemId;

  let cur = { title:'', category:'', subCategory:'', price:'', condition:'B급', location:'', description:'', images:[] };
  if (isEdit) {
    const r = await loadMarketItem(itemId);
    if (!r.data) return `<div class="card"><button class="btn" onclick="window._gd.goBack()">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button><p style="color:#d32f2f;margin-top:12px;">매물 없음</p></div>`;
    cur = {
      title: r.data.title || '',
      category: r.data.category || '',
      subCategory: r.data.sub_category || '',
      price: r.data.price ?? '',
      condition: r.data.condition || 'B급',
      location: r.data.location || '',
      description: r.data.description || '',
      images: r.data.images || []
    };
  }

  window.__marketPhotos = [...cur.images];

  const catOpts = MARKET_CATEGORIES.map(c => `<option value="${c}" ${cur.category===c?'selected':''}>${c}</option>`).join('');
  const subOpts = GOLF_SUBCATEGORIES.map(s => `<option value="${s}" ${cur.subCategory===s?'selected':''}>${s}</option>`).join('');
  const condOpts = ['신품급','A급','B급','C급'].map(c => `<option value="${c}" ${cur.condition===c?'selected':''}>${c}</option>`).join('');

  const photosPreviewHtml = cur.images.map((url, i) => 
    `<div style="position:relative;"><img src="${url}" style="width:70px;height:70px;object-fit:cover;border-radius:6px;border:1px solid #ddd;"><button onclick="window._gd.removeMarketPhoto(${i})" style="position:absolute;top:-6px;right:-6px;background:#d32f2f;color:white;border:none;border-radius:50%;width:20px;height:20px;font-size:12px;cursor:pointer;">×</button></div>`
  ).join('');

  const showSub = cur.category === '골프용품';

  return `
    <div class="card">
      <button class="btn" onclick="window._gd.goBack()" style="margin-bottom:12px;">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      <h2>${isEdit ? '✏️ 나눔 수정' : '+ 나눔 등록'}</h2>

      <label style="display:block;margin-top:16px;font-weight:600;">제목 *</label>
      <input id="mk_title" class="input" type="text" value="${escapeHtml(cur.title)}" placeholder="예: 캘러웨이 로그 드라이버 (10.5도)">

      <label style="display:block;margin-top:16px;font-weight:600;">카테고리 *</label>
      <select id="mk_category" class="input" onchange="window._gd.onMarketCategoryChange()">
        <option value="">— 선택 —</option>
        ${catOpts}
      </select>

      <div id="mk_subcategory_block" style="${showSub?'':'display:none;'}margin-top:12px;">
        <label style="display:block;font-weight:600;color:#e65100;">⛳ 골프용품 세부 *</label>
        <select id="mk_subcategory" class="input" style="border:1px solid #ff9800;">
          <option value="">— 선택 —</option>
          ${subOpts}
        </select>
      </div>

      <label style="display:block;margin-top:16px;font-weight:600;">가격 (฿) *</label>
      <input id="mk_price" class="input" type="number" value="${cur.price}" placeholder="예: 8000 (나눔이면 0)" min="0">

      <label style="display:block;margin-top:16px;font-weight:600;">상태</label>
      <select id="mk_condition" class="input">
        ${condOpts}
      </select>

      <label style="display:block;margin-top:16px;font-weight:600;">지역 (선택)</label>
      <input id="mk_location" class="input" type="text" value="${escapeHtml(cur.location)}" placeholder="예: 방콕 방나점 직거래 가능">

      <label style="display:block;margin-top:16px;font-weight:600;">📸 사진 (최대 5장)</label>
      <div style="display:flex;gap:8px;margin-top:4px;">
        <label for="mk_photoCamera" class="btn" style="flex:1;text-align:center;cursor:pointer;background:#E3F2FD;color:#1565c0;border:1px solid #1565c0;">📷 카메라</label>
        <input id="mk_photoCamera" type="file" accept="image/*" capture="environment" onchange="window._gd.doUploadMarketPhotos(this)" style="display:none;">
        <label for="mk_photoFile" class="btn" style="flex:1;text-align:center;cursor:pointer;background:#E8F5E9;color:#2E7D32;border:1px solid #2E7D32;">📁 갤러리</label>
        <input id="mk_photoFile" type="file" accept="image/*" multiple onchange="window._gd.doUploadMarketPhotos(this)" style="display:none;">
      </div>
      <div id="mk_photosPreview" style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">${photosPreviewHtml}</div>
      <p style="font-size:11px;color:#999;margin-top:4px;">자동 리사이즈됨 (1920px / JPEG)</p>

      <label style="display:block;margin-top:16px;font-weight:600;">설명</label>
      <textarea id="mk_description" class="input" rows="4" placeholder="사용 기간, 흠집 여부, 직거래/택배, 등등">${escapeHtml(cur.description)}</textarea>

      <button class="btn btn-primary" onclick="${isEdit ? `window._gd.doSaveMarketItem('${itemId}')` : 'window._gd.doCreateMarketItem()'}" style="margin-top:20px;width:100%;">
        ${isEdit ? '💾 수정 저장' : '+ 등록'}
      </button>
    </div>
  `;
}
