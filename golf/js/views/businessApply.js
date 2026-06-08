// views/businessApply.js — 회원사 신청
import { BIZ_TYPES, applyBusiness, uploadBusinessPhoto } from '../domain/business.js';
import { escapeHtml } from '../core/ui-kit.js';

export async function businessApplyView() {
  window.__bizPhotos = [];
  
  const typeOpts = BIZ_TYPES.map(t => `<option value="${t.key}">${t.label}</option>`).join('');
  const regionOpts = ['방콕','파타야','후아힌','치앙마이','푸켓','기타'].map(r => `<option>${r}</option>`).join('');
  
  return `
    <div class="card">
      <button class="btn" onclick="window._gd.goBack()" style="margin-bottom:12px;">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      <h2>🤝 회원사 신청</h2>
      <p style="color:#666;font-size:13px;">슈퍼관리자 승인 후 회원사 탭에 노출됩니다</p>
      
      <label style="display:block;margin-top:16px;font-weight:600;">업종 *</label>
      <select id="bz_type" class="input">
        <option value="">— 선택 —</option>
        ${typeOpts}
      </select>
      
      <label style="display:block;margin-top:16px;font-weight:600;">상호명 *</label>
      <input id="bz_name" class="input" type="text" placeholder="예: 골프존 방나점">
      
      <label style="display:block;margin-top:16px;font-weight:600;">지역</label>
      <select id="bz_region" class="input">${regionOpts}</select>
      
      <label style="display:block;margin-top:16px;font-weight:600;">위치 (간단)</label>
      <input id="bz_location" class="input" type="text" placeholder="예: 방나, 수쿰빗">
      
      <label style="display:block;margin-top:16px;font-weight:600;">주소</label>
      <input id="bz_address" class="input" type="text" placeholder="예: 99 Moo 4 Soi 12, Bangkok 10110">
      
      <label style="display:block;margin-top:16px;font-weight:600;">소개</label>
      <textarea id="bz_description" class="input" rows="3" placeholder="간단한 소개, 가격대, 한인 직원 유무, 특별 혜택 등"></textarea>
      
      <label style="display:block;margin-top:16px;font-weight:600;">📸 사진 (최대 5장)</label>
      <div style="display:flex;gap:8px;margin-top:4px;">
        <label for="bz_photoCamera" class="btn" style="flex:1;text-align:center;cursor:pointer;background:#E3F2FD;color:#1565c0;border:1px solid #1565c0;">📷 카메라</label>
        <input id="bz_photoCamera" type="file" accept="image/*" capture="environment" onchange="window._gd.doUploadBizPhotos(this)" style="display:none;">
        <label for="bz_photoFile" class="btn" style="flex:1;text-align:center;cursor:pointer;background:#E8F5E9;color:#2E7D32;border:1px solid #2E7D32;">📁 갤러리</label>
        <input id="bz_photoFile" type="file" accept="image/*" multiple onchange="window._gd.doUploadBizPhotos(this)" style="display:none;">
      </div>
      <div id="bz_photosPreview" style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;"></div>
      
      <label style="display:block;margin-top:16px;font-weight:600;">전화번호</label>
      <input id="bz_phone" class="input" type="text" placeholder="+66 ...">
      
      <label style="display:block;margin-top:16px;font-weight:600;">홈페이지</label>
      <input id="bz_website" class="input" type="url" placeholder="https://">
      
      <label style="display:block;margin-top:16px;font-weight:600;">연락 이메일</label>
      <input id="bz_contact_email" class="input" type="email" placeholder="contact@">
      
      <button class="btn btn-primary" onclick="window._gd.doApplyBusiness()" style="margin-top:20px;width:100%;">신청서 제출</button>
    </div>
  `;
}
