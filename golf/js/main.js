// main.js — Entry point (Phase 4 + club management)

import { sb } from './core/db.js';
import { loadSession, signIn, signOut, getSession } from './core/auth.js';
import { signInByNickname, signUp, updateMyProfile, grantAdmin, revokeAdmin } from './domain/users.js';
import { loadEventParticipants, loadEventAwards, createActivity, updateActivity } from './domain/events.js';
import { lockResults, drawPeoriaHoles, setSpecialAwards, setMethodAndRanks, publishAwards, unlockResults, saveRaffleWinners, setRaffleIncludeWinners } from './domain/awards.js';
import { applyForClub, approveClub, rejectClub, requestJoinClub, approveJoinRequest, rejectJoinRequest, removeClubMember, updateClub, leaveClub, loadClub , setCoLeader, unsetCoLeader } from './domain/clubs.js';
import { start as startRouter, onChange as onRouteChange, pushView, resetTo, replaceTop, popViewSafe } from './core/router.js';
import { registerViews, renderApp, invalidateView } from './core/render.js';
import { toast, toastSuccess, toastError, showLoading, hideLoading, confirmDialog, promptDialog } from './core/ui-kit.js';
import { showError } from './core/errors.js';
import { signInView, signUpView } from './views/auth.js';
import { homeView } from './views/home.js';
import { clubsListView } from './views/clubsList.js';
import { clubDetailView } from './views/clubDetail.js';
import { eventDetailView } from './views/eventDetail.js';
import { matchesListView } from './views/matchesList.js';
import { matchCreateView } from './views/matchCreate.js';
import { matchDetailView } from './views/matchDetail.js';
import { eventScoreView } from './views/eventScore.js';
import { chatListView } from './views/chatList.js';
import { chatRoomView } from './views/chatRoom.js';
import { subscribeAllChatForUser, loadUnreadCount, closeChatRoom } from './domain/chat.js';
import { subscribeToPush, checkAndAutoSubscribe, getPushPermission, isPushSupported } from './domain/push.js';
import { marketListView } from './views/marketList.js';
import { marketCreateView } from './views/marketCreate.js';
import { marketDetailView } from './views/marketDetail.js';
import { businessListView } from './views/businessList.js';
import { businessApplyView } from './views/businessApply.js';
import { businessDetailView } from './views/businessDetail.js';
import { businessReviewView } from './views/businessReview.js';
import { applyBusiness, uploadBusinessPhoto, approveBusiness, rejectBusiness } from './domain/business.js';
import { createMarketItem, uploadMarketPhoto, completeAndDeleteItem, updateMarketItem } from './domain/market.js';
import { findOrCreate1on1, sendMessage } from './domain/chat.js';
import { saveMyEventRound } from './domain/events.js';
import { myRoundsView } from './views/myRounds.js';
import { roundAddView } from './views/roundAdd.js';
import { addPersonalRound, deleteRound } from './domain/rounds.js';
import { createMatch, applyMatch, approveMatchApply, rejectMatchApply, cancelMyMatchApply } from './domain/matches.js';
import { runRaffle } from './views/raffle.js';
import { clubApplyView } from './views/clubApply.js';
import { clubAdminView } from './views/clubAdmin.js';
import { activityFormView } from './views/activityForm.js';
import { myPageView } from './views/myPage.js';
import { memberListView } from './views/memberList.js';
import { clubsManageView } from './views/clubsManage.js';
import { coursesAdminView } from './views/coursesAdmin.js';
import { coursesAdminEditView } from './views/coursesAdminEdit.js';

window._gd = {
  goBack() { popViewSafe(); },

  // ── Match navigation ──
  goMatches() { pushView({ type: 'matchesList' }); },
  goMatchCreate() { pushView({ type: 'matchCreate' }); },
  openMatch(id) { pushView({ type: 'matchDetail',
  goMyRounds() { pushView({ type: 'myRounds' }); },
  goRoundAdd() { pushView({ type: 'roundAdd' }); },
  onRoundCourseRegionChange() {
    const reg = document.getElementById('ra_courseRegion')?.value || '';
    const sel = document.getElementById('ra_course');
    if (!sel) return;
    const all = window.__roundCoursesByRegion || {};
    const list = reg ? (all[reg] || []) : Object.values(all).flat();
    sel.innerHTML = '<option value="">— 골프장 선택 —</option>' +
      list.map(c => {
        const sub = c.district ? ' (' + c.district + ')' : '';
        const safe = c.name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        return '<option value="' + safe + '">' + safe + sub + '</option>';
      }).join('');
  },
  calcRoundTotal() {
    let sum = 0;
    for (let i = 1; i <= 18; i++) {
      const v = parseInt(document.getElementById('ra_h' + i)?.value);
      if (isNaN(v)) { toast('18홀 모두 입력해야 자동합산'); return; }
      sum += v;
    }
    const t = document.getElementById('ra_total');
    if (t) t.value = sum;
    toast('합계 ' + sum + ' 자동 입력');
  },
  async doAddRound() {
    const cs = document.getElementById('ra_course')?.value;
    const cm = document.getElementById('ra_courseManual')?.value?.trim();
    const course = cs || cm;
    const playedAt = document.getElementById('ra_date')?.value;
    const total = document.getElementById('ra_total')?.value;
    const holes = [];
    let af = true;
    for (let i = 1; i <= 18; i++) {
      const v = parseInt(document.getElementById('ra_h' + i)?.value);
      if (isNaN(v)) { af = false; break; }
      holes.push(v);
    }
    if (!course) { toastError('골프장 선택'); return; }
    if (!playedAt) { toastError('날짜 선택'); return; }
    if (!total) { toastError('총 스코어 입력'); return; }
    showLoading();
    const r = await addPersonalRound({ course, playedAt, total, holes: af ? holes : null });
    hideLoading();
    if (r.error) { showError(r.error, '라운드 등록'); return; }
    toastSuccess('라운드 등록!');
    popViewSafe();
  },
  async deleteMyRound(roundId) {
    if (!await confirmDialog('이 라운드를 삭제하시겠어요?', { title: '삭제', danger: true, okLabel: '삭제' })) return;
    showLoading();
    const r = await deleteRound(roundId);
    hideLoading();
    if (r.error) { showError(r.error, '삭제'); return; }
    toastSuccess('삭제됨');
    renderApp();
  }, params: { id } }); },
  
  setMatchRegion(r) {
    // matchesList.js의 _filter 변경 + 재렌더
    import('./views/matchesList.js').then(mod => {
      // 모듈의 _filter는 모듈 내부 — 다른 방법: window.__matchFilter 사용
      window.__matchRegion = r;
      // 간단히: location.hash 그대로 두고 renderApp
      renderApp();
    });
  },
  setMatchSort(s) {
    window.__matchSort = s;
    renderApp();
  },
  
  // Match actions
  async doCreateMatch() {
    let course = document.getElementById('mc_course')?.value;
    const _k1 = document.getElementById('mc_courseKey1')?.value;
    const _k2 = document.getElementById('mc_courseKey2')?.value;
    if (_k1 && _k2) course = course + ' (' + _k1 + '+' + _k2 + ')';
    const matchDate = document.getElementById('mc_date')?.value;
    const teeTime = document.getElementById('mc_time')?.value;
    const spotsTotal = document.getElementById('mc_spots')?.value;
    const hcpMin = document.getElementById('mc_hcpMin')?.value;
    const hcpMax = document.getElementById('mc_hcpMax')?.value;
    const fee = null;
    const note = document.getElementById('mc_note')?.value;
    if (!course) { toastError('골프장을 선택하세요'); return; }
    if (!matchDate) { toastError('날짜를 선택하세요'); return; }
    showLoading();
    const r = await createMatch({ course, matchDate, teeTime, spotsTotal, hcpMin, hcpMax, fee, note });
    hideLoading();
    if (r.error) { showError(r.error, '매치 등록'); return; }
    toastSuccess('매치 등록 완료!');
    pushView({ type: 'matchDetail', params: { id: r.data.id } });
  },
  
  onMatchCourseSelectChange() {
    const sel = document.getElementById('mc_course');
    if (!sel) return;
    const reg = document.getElementById('mc_courseRegion')?.value || '';
    const all = window.__matchCoursesByRegion || {};
    const list = reg ? (all[reg] || []) : Object.values(all).flat();
    const found = list.find(c => c.name === sel.value);
    const dual = document.getElementById('mc_dualCourseBlock');
    if (!dual) return;
    if (found && Array.isArray(found.course_names) && found.course_names.length >= 2) {
      dual.style.display = 'block';
      const opts1 = '<option value="">— 1st 9 —</option>' + found.course_names.map(k => '<option value="' + k + '">' + k + '</option>').join('');
      const opts2 = '<option value="">— 2nd 9 —</option>' + found.course_names.map(k => '<option value="' + k + '">' + k + '</option>').join('');
      document.getElementById('mc_courseKey1').innerHTML = opts1;
      document.getElementById('mc_courseKey2').innerHTML = opts2;
    } else {
      dual.style.display = 'none';
    }
  },
  onMatchCourseRegionChange() {
    const reg = document.getElementById('mc_courseRegion')?.value || '';
    const sel = document.getElementById('mc_course');
    if (!sel) return;
    const all = window.__matchCoursesByRegion || {};
    const list = reg ? (all[reg] || []) : Object.values(all).flat();
    sel.innerHTML = '<option value="">— 골프장 선택 —</option>' +
      list.map(c => {
        const sub = c.district ? ' (' + c.district + ')' : '';
        const safe = c.name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        return '<option value="' + safe + '">' + safe + sub + '</option>';
      }).join('');
  },
  
  async applyMatch(matchId) {
    if (!await confirmDialog('이 매치에 참가 신청하시겠어요?\n호스트가 승인하면 확정됩니다.', { title: '참가 신청' })) return;
    showLoading();
    const r = await applyMatch(matchId);
    hideLoading();
    if (r.error) { showError(r.error, '신청'); return; }
    toastSuccess('신청 완료! 호스트 승인 대기 중');
    renderApp();
  },
  
  async approveMatchApp(matchId, userId) {
    showLoading();
    const r = await approveMatchApply(matchId, userId);
    hideLoading();
    if (r.error) { showError(r.error, '승인'); return; }
    toastSuccess('승인 완료');
    renderApp();
  },
  
  async rejectMatchApp(matchId, userId) {
    if (!await confirmDialog('신청을 거절하시겠어요?', { title: '신청 거절', danger: true, okLabel: '거절' })) return;
    showLoading();
    const r = await rejectMatchApply(matchId, userId);
    hideLoading();
    if (r.error) { showError(r.error, '거절'); return; }
    toastSuccess('거절됨');
    renderApp();
  },
  
  async cancelMyMatchApp(matchId) {
    if (!await confirmDialog('참가 신청을 취소하시겠어요?', { title: '취소', danger: true, okLabel: '취소' })) return;
    showLoading();
    const r = await cancelMyMatchApply(matchId);
    hideLoading();
    if (r.error) { showError(r.error, '취소'); return; }
    toastSuccess('취소됨');
    renderApp();
  },
  goHome() { resetTo({ type: 'home' }); },
  // ── Auth ──
  async doSignIn() {
    const nick = document.getElementById('auth_nickname')?.value?.trim();
    const pw = document.getElementById('auth_password')?.value;
    if (!nick || !pw) { toastError('닉네임/비번 모두 입력'); return; }
    showLoading();
    const r = await signInByNickname(nick, pw);
    hideLoading();
    if (r.error) { showError(r.error, '로그인 실패'); return; }
    toastSuccess(`환영합니다 ${nick}님`);
    invalidateView();
    resetTo({ type: 'home' });
  },
  async doSignUp() {
    const nick = document.getElementById('su_nickname')?.value?.trim();
    const pw = document.getElementById('su_password')?.value;
    const loc = document.getElementById('su_location')?.value;
    const hcRaw = document.getElementById('su_handicap')?.value;
    const hc = hcRaw === '' || hcRaw == null ? null : parseFloat(hcRaw);
    const ce = document.getElementById('su_email')?.value?.trim();
    const ph = document.getElementById('su_phone')?.value?.trim();
    const rn = document.getElementById('su_realName')?.value?.trim();
    showLoading();
    const r = await signUp({ nickname: nick, password: pw, location: loc, handicap: hc, realName: rn, contactEmail: ce, phone: ph });
    hideLoading();
    if (r.error) { showError(r.error, '가입 실패'); return; }
    toastSuccess(`가입 완료! 환영합니다 ${nick}님`);
    if (ce) { setTimeout(() => toast(`📧 ${ce}로 인증 링크 발송 — 메일 확인 후 클릭하세요`), 1500); }
    invalidateView();
    resetTo({ type: 'home' });
  },
  async doSignOut() { await signOut(); invalidateView(); toast('로그아웃됨'); resetTo({ type: 'home' }); },
  goSignIn() { pushView({ type: 'signIn' }); },
  goSignUp() { pushView({ type: 'signUp' }); },
  goGuest() { resetTo({ type: 'home' }); },
  goClubs() { pushView({ type: 'clubsList' }); },
  goClubApply() { pushView({ type: 'clubApply' }); },
  goClubAdmin() { pushView({ type: 'clubAdmin' }); },
  goClubsManage() { pushView({ type: 'clubsManage' }); },
  goCoursesAdmin() { pushView({ type: 'coursesAdmin' }); },
  goNewCourse() { pushView({ type: 'coursesAdminEdit' }); },
  goEditCourse(id) { pushView({ type: 'coursesAdminEdit', params: { id } }); },
  onCourseHolesChange() {
    const h = parseInt(document.getElementById('ca_holes')?.value || '18');
    const block = document.getElementById('ca_course_names_block');
    if (block) block.style.display = h >= 27 ? '' : 'none';
  },
  recalcCoursePar(prefix) {
    let sum = 0, count = 0;
    for (let i = 0; i < 9; i++) {
      const el = document.getElementById(prefix + '_' + i);
      const v = el ? parseInt(el.value) : NaN;
      if (!isNaN(v) && v > 0) { sum += v; count++; }
    }
    const sumEl = document.getElementById(prefix + '_sum');
    if (sumEl) sumEl.textContent = count === 0 ? '-' : sum;
    // 18홀이면 TOTAL도 갱신 (F9 + B9)
    const totalEl = document.getElementById('ca_par_total');
    if (totalEl) {
      let total = 0, anyCount = 0;
      for (const p of ['ca_parF', 'ca_parB']) {
        for (let i = 0; i < 9; i++) {
          const el = document.getElementById(p + '_' + i);
          const v = el ? parseInt(el.value) : NaN;
          if (!isNaN(v) && v > 0) { total += v; anyCount++; }
        }
      }
      totalEl.textContent = anyCount === 0 ? '-' : total;
    }
  },
  _collectCourseForm() {
    const name = document.getElementById('ca_name')?.value?.trim() || '';
    const region = document.getElementById('ca_region')?.value || '';
    const district = document.getElementById('ca_district')?.value?.trim() || '';
    const holes = parseInt(document.getElementById('ca_holes')?.value || '18');
    const cnStr = document.getElementById('ca_course_names')?.value?.trim() || '';
    const courseNames = cnStr ? cnStr.split(',').map(s => s.trim()).filter(Boolean) : [];
    let pars = null;
    const safeKey = (s) => String(s || '').replace(/[^a-zA-Z0-9가-힣]/g, '_');
    const collect9 = (prefix) => {
      const arr = [];
      for (let i = 0; i < 9; i++) {
        const el = document.getElementById(prefix + '_' + i);
        const v = el ? parseInt(el.value) : NaN;
        if (!isNaN(v) && v > 0) arr.push(v);
      }
      return arr.length === 9 ? arr : null;
    };
    if (holes === 18) {
      const f = collect9('ca_parF');
      const b = collect9('ca_parB');
      if (f && b) pars = { main: [...f, ...b] };
    } else {
      pars = {};
      for (const cn of courseNames) {
        const a = collect9('ca_parC_' + safeKey(cn));
        if (a) pars[cn] = a;
      }
      if (Object.keys(pars).length === 0) pars = null;
    }
    return { name, region, district, holes, courseNames, pars };
  },
  async doCreateCourse() {
    const f = this._collectCourseForm();
    if (!f.name) { toastError('이름 필수'); return; }
    const { createCourse } = await import('./domain/courses.js');
    showLoading();
    const r = await createCourse(f);
    hideLoading();
    if (r.error) { showError(r.error, '골프장 등록'); return; }
    toastSuccess('✓ 골프장 등록 완료');
    resetTo({ type: 'coursesAdmin' });
  },
  async doSaveCourse(id) {
    const f = this._collectCourseForm();
    if (!f.name) { toastError('이름 필수'); return; }
    const { updateCourse } = await import('./domain/courses.js');
    showLoading();
    const r = await updateCourse({ id, ...f });
    hideLoading();
    if (r.error) { showError(r.error, '골프장 수정'); return; }
    toastSuccess('✓ 수정 완료');
    resetTo({ type: 'coursesAdmin' });
  },
  async doDeleteCourse(id, name) {
    if (!await confirmDialog('정말로 "' + name + '" 골프장을 삭제하시겠습니까?\n\n관련 활동/라운드의 course_id는 NULL로 정리됩니다 (활동/라운드 row 자체는 보존).', { title: '골프장 삭제', okLabel: '삭제', danger: true })) return;
    const { deleteCourse } = await import('./domain/courses.js');
    showLoading();
    const r = await deleteCourse(id);
    hideLoading();
    if (r.error) { showError(r.error, '골프장 삭제'); return; }
    toastSuccess('✓ 삭제 완료 (활동 ' + (r.data?.events_affected || 0) + '건 정리)');
    renderApp();
  },
  async doAdminDeleteClub(clubId, clubName) {
    if (!await confirmDialog('정말로 "' + clubName + '" 동호회를 삭제하시겠습니까?\n\n관련 활동/참가/스코어/멤버 모두 삭제됩니다 (복구 불가).', { title: '동호회 삭제', okLabel: '삭제', danger: true })) return;
    const { adminDeleteClub } = await import('./domain/clubs.js');
    showLoading();
    const { data, error } = await adminDeleteClub(clubId);
    hideLoading();
    if (error) { showError(error, '동호회 삭제'); return; }
    toastSuccess('✓ 삭제 완료 (활동 ' + (data?.events_deleted || 0) + '개, 멤버 ' + (data?.members_deleted || 0) + '명)');
    renderApp();
  },
  goMyPage() { pushView({ type: 'myPage' }); },
  goMemberList() { pushView({ type: 'memberList' }); },
  
  async doUpdateMyProfile() {
    const realName = document.getElementById('mp_realName')?.value;
    const location = document.getElementById('mp_location')?.value;
    const handicap = document.getElementById('mp_handicap')?.value;
    const contactEmail = (document.getElementById('mp_email')?.value || '').trim();
    const phone = document.getElementById('mp_phone')?.value;
    showLoading();
    const r = await updateMyProfile({ realName, location, handicap, contactEmail, phone });
    if (r.error) { hideLoading(); showError(r.error, '프로필 저장'); return; }

    // 이메일 입력 + auth.users.email이 placeholder이거나 다른 이메일이면 자동 인증 메일 발송
    let emailMsg = '';
    if (contactEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      try {
        const { sb: sbDb } = await import('./core/db.js');
        const { getSession: getSes2 } = await import('./core/auth.js');
        const sess = getSes2();
        const currentEmail = (sess?.user?.email || '').toLowerCase();
        const isPlaceholder = currentEmail.endsWith('@golfdong.local');
        const isDifferent = currentEmail !== contactEmail.toLowerCase();
        if (isPlaceholder || isDifferent) {
          const { error: emailErr } = await sbDb.auth.updateUser({ email: contactEmail });
          if (emailErr) {
            emailMsg = ' (인증 메일 발송 실패: ' + (emailErr.message || '') + ')';
          } else {
            emailMsg = ' · ✉️ 인증 메일 발송됨 - 메일함 확인';
          }
        }
      } catch (e) {
        console.warn('email auto-update failed', e);
      }
    }

    hideLoading();
    toastSuccess('💾 저장 완료' + emailMsg);
    const { loadSession } = await import('./core/auth.js');
    await loadSession();
    renderApp();
  },
  
  async doGrantAdmin(userId, name) {
    if (!await confirmDialog(`"${name}" 회원에게 슈퍼관리자 권한을 부여하시겠어요?`, { title: '관리자 지정', okLabel: '지정' })) return;
    showLoading();
    const r = await grantAdmin(userId);
    hideLoading();
    if (r.error) { showError(r.error, '관리자 지정'); return; }
    toastSuccess('👑 관리자 지정 완료');
    renderApp();
  },
  
  async doRevokeAdmin(userId, name) {
    if (!await confirmDialog(`"${name}" 회원의 슈퍼관리자 권한을 해제하시겠어요?`, { title: '관리자 해제', okLabel: '해제', danger: true })) return;
    showLoading();
    const r = await revokeAdmin(userId);
    hideLoading();
    if (r.error) { showError(r.error, '관리자 해제'); return; }
    toastSuccess('관리자 해제 완료');
    renderApp();
  },

  async doAdminDeleteUser(userId, name) {
    if (!await confirmDialog('정말로 "' + name + '" 회원을 강퇴(완전 삭제)하시겠습니까?\n\n계정 + 라운드 + 멤버십 + 채팅 + 매물 등 모두 cascade 삭제됩니다 (복구 불가).', { title: '회원 강퇴', okLabel: '강퇴', danger: true })) return;
    const { adminDeleteUser } = await import('./domain/users.js');
    showLoading();
    const { error } = await adminDeleteUser(userId);
    hideLoading();
    if (error) { showError(error, '회원 강퇴'); return; }
    toastSuccess('✓ 강퇴 완료');
    renderApp();
  },
  
  filterMembers() {
    const q = document.getElementById('ml_search')?.value?.toLowerCase().trim() || '';
    const rows = document.querySelectorAll('.ml-row');
    rows.forEach(row => {
      const data = (row.getAttribute('data-search') || '').toLowerCase();
      row.style.display = (!q || data.includes(q)) ? '' : 'none';
    });
  },
  openClub(id) { pushView({ type: 'clubDetail', params: { id } }); },
  openEvent(id) { pushView({ type: 'eventDetail', params: { id } }); },
  openActivityForm(clubId) { pushView({ type: 'activityForm', params: { clubId } }); },

  openActivityEdit(clubId, eventId) { pushView({ type: 'activityForm', params: { clubId, eventId } }); },

  async doUpdateActivity(eventId) {
    const name = document.getElementById('af_name')?.value?.trim();
    const eventDate = document.getElementById('af_date')?.value;
    const eventTime = document.getElementById('af_time')?.value;
    const courseSel = document.getElementById('af_course');
    const courseOpt = courseSel && courseSel.options[courseSel.selectedIndex];
    const courseId = courseSel?.value || '';
    const course = (courseOpt && courseOpt.dataset && courseOpt.dataset.name) || '';
    let courseKey = '';
    if (courseId && courseOpt) {
      let cn = [];
      try { cn = JSON.parse(courseOpt.dataset.courseNames || '[]'); } catch(e) {}
      const isMulti = Array.isArray(cn) && cn.length >= 2;
      if (isMulti) {
        const k1 = document.getElementById('af_courseKey1')?.value || '';
        const k2 = document.getElementById('af_courseKey2')?.value || '';
        if (!k1 || !k2) { toast('27/36홀 골프장은 1st 9와 2nd 9 모두 선택해주세요'); return; }
        if (k1 === k2) { toast('1st 9와 2nd 9는 다른 코스를 선택해주세요'); return; }
        courseKey = k1 + '+' + k2;
      }
    }
    const placeNote = (document.getElementById('af_type')?.value === 'social') ? (document.getElementById('af_place')?.value || '').trim() : '';
    const scoringMethod = document.getElementById('af_scoring')?.value || '';
    let body = document.getElementById('af_body')?.value || '';
    {
      const ptype = document.getElementById('af_type')?.value;
      const place = (ptype === 'social') ? (document.getElementById('af_place')?.value || '').trim() : '';
      if (place) body = '📍 장소: ' + place + (body ? '\n' + body : '');
    }
    if (!name) { toastError('이름은 필수입니다'); return; }
    showLoading();
    const r = await updateActivity(eventId, { name, eventDate, eventTime, course, courseId, courseKey, scoringMethod, body });
    hideLoading();
    if (r.error) { showError(r.error, '활동 수정'); return; }
    toastSuccess('활동 정보 수정 완료');
    popViewSafe();
  },
  
  // ── Club open/apply ──
  async doApplyForClub() {
    const name = document.getElementById('ca_name')?.value;
    const location = document.getElementById('ca_location')?.value;
    const description = document.getElementById('ca_description')?.value;
    const requiresApproval = document.getElementById('ca_approval')?.checked;
    showLoading();
    const r = await applyForClub({ name, location, description, requiresApproval });
    hideLoading();
    if (r.error) { showError(r.error, '동호회 개설 신청'); return; }
    toastSuccess('🎉 동호회 개설 신청 완료 — 슈퍼관리자 승인 대기');
    resetTo({ type: 'clubsList' });
  },
  async doApproveClub(clubId) {
    if (!await confirmDialog('이 동호회를 승인하시겠어요?', { title: '동호회 승인', okLabel: '승인' })) return;
    showLoading();
    const r = await approveClub(clubId);
    hideLoading();
    if (r.error) { showError(r.error, '동호회 승인'); return; }
    toastSuccess('승인 완료');
    renderApp();
  },  async doRequestDisband(clubId) {
    const input = document.getElementById('disband-reason-input');
    const reason = input ? (input.value || '').trim() : '';
    if (!confirm('동호회 폐지 신청을 보내시겠습니까?\n슈퍼관리자 승인 시 모든 데이터(멤버·이벤트·시상)가 영구 삭제됩니다.')) return;
    showLoading();
    const { requestDisband } = await import('./domain/clubs.js');
    const { error } = await requestDisband(clubId, reason);
    hideLoading();
    if (error) { showError(error, '폐지 신청'); return; }
    toastSuccess('📨 폐지 신청 발송 — 슈퍼관리자 승인 대기 중');
    setTimeout(() => location.reload(), 500);
  },
  async doCancelDisband(clubId) {
    if (!confirm('폐지 신청을 취소하시겠습니까?')) return;
    showLoading();
    const { cancelDisband } = await import('./domain/clubs.js');
    const { error } = await cancelDisband(clubId);
    hideLoading();
    if (error) { showError(error, '폐지 신청 취소'); return; }
    toastSuccess('취소되었습니다');
    setTimeout(() => location.reload(), 500);
  },
  async doApproveDisband(clubId) {
    if (!confirm('⚠️ 이 동호회를 영구 삭제하시겠습니까?\n멤버·이벤트·시상·라운드 기록 모두 삭제됩니다.\n복구 불가합니다.')) return;
    showLoading();
    const { approveDisband } = await import('./domain/clubs.js');
    const { error } = await approveDisband(clubId);
    hideLoading();
    if (error) { showError(error, '폐지 승인'); return; }
    toastSuccess('✅ 동호회 영구 삭제됨');
    const modal = document.getElementById('disband-review-modal');
    if (modal) modal.remove();
    setTimeout(() => location.reload(), 500);
  },
  async doRejectDisband(clubId) {
    if (!confirm('폐지 신청을 거절하시겠습니까?\n(동호회는 유지됩니다)')) return;
    showLoading();
    const { rejectDisband } = await import('./domain/clubs.js');
    const { error } = await rejectDisband(clubId);
    hideLoading();
    if (error) { showError(error, '폐지 거절'); return; }
    toastSuccess('거절됨 — 동호회 유지');
    const modal = document.getElementById('disband-review-modal');
    if (modal) modal.remove();
    setTimeout(() => location.reload(), 500);
  },
  async doOpenDisbandReview() {
    showLoading();
    const { loadDisbandPending } = await import('./domain/clubs.js');
    const { data, error } = await loadDisbandPending();
    hideLoading();
    if (error) { showError(error, '폐지 신청 리스트'); return; }
    const list = data || [];
    const esc = s => (s == null ? '' : String(s).replace(/[<>&"]/g, ch => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[ch])));
    const existing = document.getElementById('disband-review-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'disband-review-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    const items = list.length === 0
      ? '<div style="color:#666;text-align:center;padding:24px;">폐지 신청된 동호회가 없습니다</div>'
      : list.map(c => '<div style="border:1px solid #ddd;padding:12px;margin:8px 0;border-radius:6px;"><div style="font-weight:600;font-size:16px;">' + esc(c.name) + '</div><div style="color:#666;font-size:13px;margin-top:4px;">' + esc(c.location) + ' · 멤버 ' + (c.member_count || 0) + '명</div><div style="color:#999;font-size:12px;margin-top:2px;">신청일: ' + new Date(c.disband_requested_at).toLocaleString('ko-KR') + '</div>' + (c.disband_reason ? '<div style="margin-top:6px;font-size:13px;background:#fff3e0;padding:8px;border-radius:4px;">사유: ' + esc(c.disband_reason) + '</div>' : '') + '<div style="margin-top:10px;display:flex;gap:8px;"><button onclick="window._gd.doApproveDisband(\'' + c.id + '\')" style="background:#d32f2f;color:white;border:none;padding:8px 16px;border-radius:4px;font-weight:600;cursor:pointer;flex:1;">⚠️ 영구 삭제 승인</button><button onclick="window._gd.doRejectDisband(\'' + c.id + '\')" style="background:#888;color:white;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;flex:1;">거절</button></div></div>').join('');
    modal.innerHTML = '<div style="background:white;border-radius:12px;max-width:600px;width:100%;max-height:90vh;overflow:auto;padding:24px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><h2 style="margin:0;color:#c62828;">🗑️ 동호회 폐지 신청 (' + list.length + '건)</h2><button onclick="document.getElementById(\'disband-review-modal\').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;">×</button></div>' + items + '</div>';
    document.body.appendChild(modal);
  },

  async doOpenGolfParEditor() {
    showLoading();
    const { loadAllGolfCourses, calcParProgress } = await import('./domain/golf-courses.js');
    const { data, error } = await loadAllGolfCourses();
    hideLoading();
    if (error) { showError(error, '골프장 로드'); return; }
    const courses = data;
    const progress = calcParProgress(courses);
    const esc = s => (s == null ? '' : String(s).replace(/[<>&"]/g, ch => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[ch])));
    const regions = {};
    for (const c of courses) {
      const r = c.region || '(미지정)';
      if (!regions[r]) regions[r] = [];
      regions[r].push(c);
    }
    for (const r in regions) {
      regions[r].sort((a, b) => {
        const af = a.pars && Object.keys(a.pars).length > 0;
        const bf = b.pars && Object.keys(b.pars).length > 0;
        if (af === bf) return a.name.localeCompare(b.name);
        return af ? 1 : -1;
      });
    }
    const regionsHtml = Object.entries(regions).map(([reg, list]) => {
      const filled = list.filter(c => c.pars && Object.keys(c.pars).length > 0).length;
      return '<details style="margin-bottom:12px;border:1px solid #ddd;border-radius:8px;padding:8px;"><summary style="cursor:pointer;font-weight:600;">' + esc(reg) + ' (' + filled + '/' + list.length + ')</summary><div style="margin-top:8px;">' + list.map(c => {
        const fl = c.pars && Object.keys(c.pars).length > 0;
        return '<div style="border-bottom:1px solid #eee;padding:8px 0;display:flex;justify-content:space-between;align-items:center;"><div><div style="font-weight:500;">' + esc(c.name) + ' ' + (fl ? '✓' : '<span style=\'color:#d32f2f;\'>●</span>') + '</div><div style="font-size:12px;color:#666;">' + esc(c.district || '') + ' · ' + c.holes + '홀' + (c.course_names && c.course_names.length ? ' (' + c.course_names.join(', ') + ')' : '') + '</div></div><button onclick="window._gd.doEditGolfPars(\'' + c.id + '\')" style="background:' + (fl ? '#666' : '#1976d2') + ';color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:12px;">' + (fl ? '수정' : '입력') + '</button></div>';
      }).join('') + '</div></details>';
    }).join('');
    const existing = document.getElementById('golf-par-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'golf-par-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto;';
    modal.innerHTML = '<div style="background:white;border-radius:12px;max-width:700px;width:100%;padding:24px;margin-top:20px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><h2 style="margin:0;">🎯 골프장 Par 입력 (' + progress.filled + '/' + progress.total + ' · ' + progress.percent + '%)</h2><button onclick="document.getElementById(\'golf-par-modal\').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;">×</button></div><div style="background:#e3f2fd;padding:12px;border-radius:8px;margin-bottom:12px;font-size:13px;">📋 <strong>자주 가는 골프장부터 입력하세요.</strong><br>● 미입력 / ✓ 입력 완료</div>' + regionsHtml + '</div>';
    document.body.appendChild(modal);
  },
  async doEditGolfPars(courseId) {
    showLoading();
    const { sb } = await import('./core/db.js');
    const { data: course, error } = await sb.from('golf_courses').select('*').eq('id', courseId).single();
    hideLoading();
    if (error || !course) { showError(error || new Error('not found'), '골프장 로드'); return; }
    const esc = s => (s == null ? '' : String(s).replace(/[<>&"]/g, ch => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[ch])));
    const courseKeys = (course.course_names && course.course_names.length > 0) ? course.course_names : ['main'];
    const isMulti = courseKeys.length > 1;
    const defaultPars9 = [4,4,3,5,4,4,3,4,5];
    const formsHtml = courseKeys.map(k => {
      const existing = course.pars && course.pars[k] ? course.pars[k] : [];
      const holes = isMulti ? 9 : 18;
      const pars = existing.length > 0 ? existing : (isMulti ? defaultPars9 : [...defaultPars9, ...defaultPars9]);
      let inputs = '';
      for (let i = 0; i < holes; i++) {
        inputs += '<div style="text-align:center;"><div style="font-size:11px;color:#888;">' + (i+1) + '</div><input type="number" min="3" max="6" value="' + (pars[i] || 4) + '" data-course="' + esc(k) + '" data-hole="' + i + '" style="width:100%;padding:4px;text-align:center;border:1px solid #ccc;border-radius:4px;font-size:13px;" oninput="window._gd.recalcParSum(\'' + esc(k) + '\')"></div>';
      }
      const sumLine = holes === 18
        ? '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px;font-size:13px;"><div>전반: <span id="par-sum-' + esc(k) + '-front">36</span></div><div>후반: <span id="par-sum-' + esc(k) + '-back">36</span></div><div>총합: <span id="par-sum-' + esc(k) + '-total">72</span></div></div>'
        : '<div style="margin-top:8px;font-size:13px;">합계: <span id="par-sum-' + esc(k) + '-total">36</span></div>';
      return '<div style="border:1px solid #ddd;border-radius:8px;padding:12px;margin-bottom:12px;"><div style="font-weight:600;margin-bottom:8px;">' + (isMulti ? '코스 ' + esc(k) : course.holes + '홀 (전체)') + '</div><div style="display:grid;grid-template-columns:repeat(9, 1fr);gap:4px;">' + inputs + '</div>' + sumLine + '</div>';
    }).join('');
    const existing = document.getElementById('golf-par-edit-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'golf-par-edit-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto;';
    modal.innerHTML = '<div style="background:white;border-radius:12px;max-width:600px;width:100%;padding:20px;margin-top:20px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h3 style="margin:0;">⛳ ' + esc(course.name) + '</h3><button onclick="document.getElementById(\'golf-par-edit-modal\').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;">×</button></div><div style="font-size:13px;color:#666;margin-bottom:12px;">' + esc(course.region) + ' · ' + esc(course.district || '') + ' · ' + course.holes + '홀</div>' + formsHtml + '<div style="display:flex;gap:8px;margin-top:12px;"><button onclick="window._gd.doSaveGolfPars(\'' + course.id + '\')" style="flex:1;background:#2e7d32;color:white;border:none;padding:12px;border-radius:6px;font-weight:600;cursor:pointer;">💾 저장</button><button onclick="document.getElementById(\'golf-par-edit-modal\').remove()" style="background:#888;color:white;border:none;padding:12px 24px;border-radius:6px;cursor:pointer;">취소</button></div></div>';
    document.body.appendChild(modal);
    for (const k of courseKeys) this.recalcParSum(k);
  },
  recalcParSum(courseKey) {
    const modal = document.getElementById('golf-par-edit-modal');
    if (!modal) return;
    const inputs = modal.querySelectorAll('input[data-course="' + courseKey + '"]');
    const pars = Array.from(inputs).map(i => parseInt(i.value) || 0);
    const total = pars.reduce((a, b) => a + b, 0);
    const totalEl = document.getElementById('par-sum-' + courseKey + '-total');
    if (totalEl) totalEl.textContent = total;
    if (pars.length === 18) {
      const front = pars.slice(0, 9).reduce((a, b) => a + b, 0);
      const back = pars.slice(9).reduce((a, b) => a + b, 0);
      const fe = document.getElementById('par-sum-' + courseKey + '-front');
      const be = document.getElementById('par-sum-' + courseKey + '-back');
      if (fe) fe.textContent = front;
      if (be) be.textContent = back;
    }
  },

  recalcScoreCard(prefix) {
    const sumRange = (start, end) => {
      let sum = 0, any = false;
      for (let i = start; i <= end; i++) {
        const el = document.getElementById(prefix + '-' + i);
        if (el && el.value !== '') {
          const n = parseInt(el.value);
          if (!isNaN(n)) { sum += n; any = true; }
        }
      }
      return any ? sum : '';
    };
    // 18-hole or 9-hole
    const has10 = !!document.getElementById(prefix + '-10');
    const out = sumRange(1, 9);
    const inSum = has10 ? sumRange(10, 18) : null;
    const total = (typeof out === 'number' && (inSum === null || typeof inSum === 'number'))
      ? (out + (inSum || 0))
      : (out || inSum || '');
    const outEl = document.getElementById(prefix + '-sc-out');
    const inEl = document.getElementById(prefix + '-sc-in');
    const totalEl = document.getElementById(prefix + '-sc-total');
    if (outEl) outEl.textContent = out;
    if (inEl && inSum !== null) inEl.textContent = inSum;
    if (totalEl) totalEl.textContent = total;
  },

  async doShowAllScorecards(eventId) {
    if (!eventId) return;
    showLoading();
    const { sb } = await import('./core/db.js');
    const { data: rounds, error } = await sb.from('rounds').select('user_id, holes, total').eq('event_id', eventId);
    if (error) { hideLoading(); showError(error, '스코어카드 로드'); return; }
    const list = rounds || [];
    const userIds = [...new Set(list.map(r => r.user_id))];
    let profiles = {};
    if (userIds.length > 0) {
      const { data: ps } = await sb.from('profiles').select('id, name, real_name').in('id', userIds);
      for (const p of (ps || [])) profiles[p.id] = p;
    }
    // 이벤트의 course/par 정보 (club_events 또는 events 테이블)
    let coursePars = null;
    try {
      const { data: ev } = await sb.from('events').select('course_id, course_key').eq('id', eventId).maybeSingle();
      if (ev && ev.course_id) {
        const { getCoursePar } = await import('./core/score-card.js');
        coursePars = await getCoursePar(ev.course_id, ev.course_key);
      }
    } catch (e) {}
    hideLoading();
    const { renderScorecard } = await import('./core/score-card.js');
    const esc = s => (s == null ? '' : String(s).replace(/[<>&"]/g, ch => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[ch])));
    const parSum = (coursePars || []).filter(p => typeof p === 'number').reduce((a, b) => a + b, 0);
    list.sort((a, b) => (a.total || 999) - (b.total || 999));
    const cards = list.map((r, idx) => {
      const p = profiles[r.user_id] || { name: (r.user_id || '').slice(0,8) };
      const holes = Array.isArray(r.holes) ? r.holes : [];
      const total = r.total || holes.reduce((a, b) => a + (parseInt(b) || 0), 0);
      const vsPar = (parSum && total) ? (total - parSum) : null;
      const vsParLabel = vsPar === null ? '' : (vsPar > 0 ? '+' + vsPar : '' + vsPar);
      return '<div style="border:1px solid #ddd;border-radius:8px;padding:12px;margin-bottom:12px;background:white;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
        '<strong>' + (idx+1) + '. ' + esc(p.name || p.real_name || '익명') + '</strong>' +
        '<span style="color:#d32f2f;font-weight:700;">' + total + (vsParLabel ? ' (' + vsParLabel + ')' : '') + '</span>' +
        '</div>' +
        renderScorecard({ pars: coursePars, scores: holes, prefix: 'sc' + idx, readonly: true, holes: 18 }) +
        '</div>';
    }).join('');
    const existing = document.getElementById('all-scorecards-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'all-scorecards-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:10001;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto;';
    modal.innerHTML = '<div style="background:#f5f5f5;border-radius:12px;max-width:900px;width:100%;padding:20px;margin-top:20px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
      '<h2 style="margin:0;font-size:18px;">📋 전체 참가자 스코어카드 (' + list.length + '명)</h2>' +
      '<button onclick="document.getElementById(\'all-scorecards-modal\').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;">×</button>' +
      '</div>' +
      '<div style="background:#fff3e0;padding:10px;border-radius:6px;margin-bottom:12px;font-size:13px;">📋 종이 스코어카드와 대조하세요. 검토 완료 후 닫고 시상 발표로 진행.</div>' +
      cards +
      '<div style="margin-top:12px;"><button onclick="document.getElementById(\'all-scorecards-modal\').remove()" style="width:100%;background:#2e7d32;color:white;border:none;padding:12px;border-radius:6px;font-weight:600;cursor:pointer;">✓ 검토 완료</button></div>' +
      '</div>';
    document.body.appendChild(modal);
  },

  async doSaveMyScoreCard(eventId, targetUserId) {
    if (!eventId) return;
    const sInputs = document.querySelectorAll('input[id^="mscore-"]');
    const holes = Array(18).fill(null);
    let anyScore = false;
    for (const inp of sInputs) {
      const m = inp.id.match(/^mscore-(\d+)$/);
      if (!m) continue;
      const h = parseInt(m[1]);
      if (h >= 1 && h <= 18 && inp.value !== '') {
        const v = parseInt(inp.value);
        if (!isNaN(v)) { holes[h-1] = v; anyScore = true; }
      }
    }
    const parsArr = Array(18).fill(null);
    let parComplete = true, anyPar = false;
    for (let h = 1; h <= 18; h++) {
      const inp = document.getElementById('mscore-par-' + h);
      if (!inp) { parComplete = false; continue; }
      const v = parseInt(inp.value);
      if (!isNaN(v) && v >= 3 && v <= 6) { parsArr[h-1] = v; anyPar = true; }
      else parComplete = false;
    }
    if (!anyScore && !anyPar) { toast('스코어 또는 Par를 입력하세요'); return; }
    showLoading();
    const { sb } = await import('./core/db.js');
    const { getSession } = await import('./core/auth.js');
    const session = await getSession();
    if (!session?.user) { hideLoading(); toast('로그인이 필요합니다'); return; }
    const { data: evRow } = await sb.from('events').select('course, course_id, course_key, hole_pars').eq('id', eventId).maybeSingle();
    let scoreMsg = '';
    if (anyScore) {
      const total = holes.reduce((a, b) => a + (b || 0), 0);
      let err;
      const isProxy = !!targetUserId && targetUserId !== session.user.id;
      if (isProxy) {
        // 대행 모드 — RPC 호출 (회장 권한)
        const { error } = await sb.rpc('save_round_for_member', {
          p_event_id: eventId,
          p_user_id: targetUserId,
          p_holes: holes,
          p_total: total
        });
        err = error;
      } else {
        // 본인 모드 — 기존 흐름
        const { data: existing } = await sb.from('rounds').select('id').eq('event_id', eventId).eq('user_id', session.user.id).maybeSingle();
        if (existing && existing.id) {
          const r = await sb.from('rounds').update({ holes, total }).eq('id', existing.id);
          err = r.error;
        } else {
          const r = await sb.from('rounds').insert({ event_id: eventId, user_id: session.user.id, course: (evRow && evRow.course) || 'Unknown', holes, total, played_at: new Date().toISOString() });
          err = r.error;
        }
      }
      if (err) { hideLoading(); showError(err, '스코어 저장'); return; }
      scoreMsg = (isProxy ? '대행 ' : '') + '스코어 저장 (총 ' + total + '타)';
    }
    let parMsg = '';
    if (parComplete && (!evRow.hole_pars || !Array.isArray(evRow.hole_pars) || evRow.hole_pars.length !== 18)) {
      const { error: parErr } = await sb.from('events').update({ hole_pars: parsArr }).eq('id', eventId);
      if (parErr) console.warn('events.hole_pars update failed', parErr);
      else parMsg = ' + Par 등록';
      if (!parErr && evRow.course_id) {
        const { data: gc } = await sb.from('golf_courses').select('pars').eq('id', evRow.course_id).maybeSingle();
        const courseKey = evRow.course_key || 'main';
        const existingPar = gc && gc.pars && gc.pars[courseKey];
        if (!existingPar) {
          if (confirm('이 Par 정보를 골프장 마스터에도 등록하시겠습니까?\n(다른 회원도 이 정보를 사용)')) {
            const newPars = Object.assign({}, (gc && gc.pars) || {});
            newPars[courseKey] = parsArr;
            const { error: gcErr } = await sb.from('golf_courses').update({ pars: newPars }).eq('id', evRow.course_id);
            if (!gcErr) parMsg += ' + 마스터 동기화';
            else console.warn('golf_courses sync failed', gcErr);
          }
        }
      }
    }
    hideLoading();
    toastSuccess('✓ ' + (scoreMsg + parMsg || '저장됨'));
  },

  recalcParRow(prefix) {
    let outSum = 0, inSum = 0;
    for (let h = 1; h <= 9; h++) {
      const v = parseInt((document.getElementById(prefix + '-par-' + h) || {}).value);
      if (!isNaN(v) && v > 0) outSum += v;
    }
    for (let h = 10; h <= 18; h++) {
      const v = parseInt((document.getElementById(prefix + '-par-' + h) || {}).value);
      if (!isNaN(v) && v > 0) inSum += v;
    }
    const outEl = document.getElementById(prefix + '-par-out');
    const inEl = document.getElementById(prefix + '-par-in');
    const totEl = document.getElementById(prefix + '-par-total');
    if (outEl) outEl.textContent = outSum || '';
    if (inEl) inEl.textContent = inSum || '';
    if (totEl) totEl.textContent = (outSum + inSum) || '-';
  },

  onRaRegionChange() {
    const reg = document.getElementById('ra_courseRegion')?.value || '';
    const sel = document.getElementById('ra-course-select');
    if (!sel) return;
    const all = window.__raCoursesByRegion || {};
    const list = reg ? (all[reg] || []) : Object.values(all).flat();
    sel.innerHTML = '<option value="">— 골프장 선택 —</option>' +
      list.map(c => {
        const cn = JSON.stringify(c.course_names || []);
        const ps = JSON.stringify(c.pars || {});
        const safe = (c.name||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        return '<option value="' + c.id + '" data-name="' + safe + '" data-holes="' + (c.holes||18) + '" data-course-names=\'' + cn.replace(/'/g,'&#39;') + '\' data-pars=\'' + ps.replace(/'/g,'&#39;') + '\'>' + safe + '</option>';
      }).join('');
    const dual = document.getElementById('ra-course-key-section');
    if (dual) dual.style.display = 'none';
  },
  async doRoundCourseChange() {
    const sel = document.getElementById('ra-course-select');
    const keySection = document.getElementById('ra-course-key-section');
    const key1 = document.getElementById('ra-course-key1');
    const key2 = document.getElementById('ra-course-key2');
    const container = document.getElementById('ra-scorecard-container');
    if (!sel || !container) return;
    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) {
      if (keySection) keySection.style.display = 'none';
      const { renderScorecard } = await import('./core/score-card.js');
      container.innerHTML = renderScorecard({ pars: null, scores: [], prefix: 'ra', readonly: false, holes: 18 });
      return;
    }
    let courseNames = [];
    let pars = {};
    try { courseNames = JSON.parse(opt.dataset.courseNames || '[]'); } catch(e) {}
    try { pars = JSON.parse(opt.dataset.pars || '{}'); } catch(e) {}
    const holes = parseInt(opt.dataset.holes) || 18;
    let parArr = null;
    if (holes > 18 && courseNames.length >= 2 && keySection && key1 && key2) {
      keySection.style.display = 'block';
      if (key1.dataset.courseId !== opt.value) {
        key1.dataset.courseId = opt.value;
        const opts1 = '<option value="">— 1st 9 —</option>' + courseNames.map(n => '<option value="' + n + '">' + n + '</option>').join('');
        const opts2 = '<option value="">— 2nd 9 —</option>' + courseNames.map(n => '<option value="' + n + '">' + n + '</option>').join('');
        key1.innerHTML = opts1;
        key2.innerHTML = opts2;
      }
      const k1 = key1.value, k2 = key2.value;
      if (k1 && k2 && pars[k1] && pars[k2]) parArr = [...pars[k1], ...pars[k2]];
    } else {
      if (keySection) keySection.style.display = 'none';
      if (pars.main) parArr = pars.main;
      else { const ks = Object.keys(pars); if (ks.length) parArr = pars[ks[0]]; }
    }
    const { renderScorecard } = await import('./core/score-card.js');
    container.innerHTML = renderScorecard({ pars: parArr, scores: [], prefix: 'ra', readonly: false, holes: 18 });
  },
  async doAddPersonalRound() {
    const sel = document.getElementById('ra-course-select');
    const txt = document.getElementById('ra-course-text');
    const opt = sel && sel.options[sel.selectedIndex];
    let course = (txt && txt.value || '').trim();
    let courseId = '';
    let courseKey = '';
    if (opt && opt.value) {
      courseId = opt.value;
      if (!course && opt.dataset && opt.dataset.name) course = opt.dataset.name;
      const keySel = document.getElementById('ra-course-key');
      if (keySel && keySel.value) courseKey = keySel.value;
    }
    if (!course) { toast('골프장을 선택하거나 직접 입력하세요'); return; }
    const playedAt = document.getElementById('ra-date') && document.getElementById('ra-date').value;
    if (!playedAt) { toast('날짜를 입력하세요'); return; }
    const holes = new Array(18).fill(null);
    let any = false;
    for (let i = 1; i <= 18; i++) {
      const inp = document.getElementById('ra-' + i);
      if (inp && inp.value !== '') {
        const v = parseInt(inp.value);
        if (!isNaN(v)) { holes[i-1] = v; any = true; }
      }
    }
    if (!any) { toast('최소 1개 홀 이상 입력하세요'); return; }
    const total = holes.reduce((a, b) => a + (b || 0), 0);
    showLoading();
    const { addPersonalRound } = await import('./domain/rounds.js');
    const { error } = await addPersonalRound({ course, courseId, courseKey, playedAt, total, holes });
    hideLoading();
    if (error) { showError(error, '라운드 추가'); return; }
    toastSuccess('✓ 라운드 추가됨 (총 ' + total + '타)');
    setTimeout(() => window.history.back(), 600);
  },
  async doSaveGolfPars(courseId) {
    const modal = document.getElementById('golf-par-edit-modal');
    if (!modal) return;
    const inputs = modal.querySelectorAll('input[data-course]');
    const parsByCourse = {};
    for (const inp of inputs) {
      const k = inp.dataset.course;
      const h = parseInt(inp.dataset.hole);
      const v = parseInt(inp.value) || 4;
      if (!parsByCourse[k]) parsByCourse[k] = [];
      parsByCourse[k][h] = v;
    }
    showLoading();
    const { updateGolfCourse } = await import('./domain/golf-courses.js');
    const { error } = await updateGolfCourse(courseId, { pars: parsByCourse });
    hideLoading();
    if (error) { showError(error, 'Par 저장'); return; }
    toastSuccess('✓ 저장됨');
    modal.remove();
    setTimeout(() => this.doOpenGolfParEditor(), 200);
  },
  async doRejectClub(clubId, name) {
    if (!await confirmDialog(`"${name}" 동호회 신청을 거절하시겠어요?\n신청 데이터는 삭제됩니다.`, { title: '동호회 거절', okLabel: '거절', danger: true })) return;
    showLoading();
    const r = await rejectClub(clubId);
    hideLoading();
    if (r.error) { showError(r.error, '동호회 거절'); return; }
    toastSuccess('거절 처리됨');
    renderApp();
  },
  
  // ── Club join/leave/manage ──
  async doRequestJoin(clubId) {
    showLoading();
    const r = await requestJoinClub(clubId);
    hideLoading();
    if (r.error) { showError(r.error, '가입 신청'); return; }
    toastSuccess(r.status === 'approved' ? '✓ 가입 완료' : '⏳ 가입 신청 — 회장 승인 대기');
    renderApp();
  },
  async doApproveJoin(clubId, userId) {
    showLoading();
    const r = await approveJoinRequest(clubId, userId);
    hideLoading();
    if (r.error) { showError(r.error, '가입 승인'); return; }
    toastSuccess('가입 승인 완료');
    renderApp();
  },
  async doRejectJoin(clubId, userId) {
    if (!await confirmDialog('이 가입 신청을 거절하시겠어요?', { title: '가입 거절', okLabel: '거절', danger: true })) return;
    showLoading();
    const r = await rejectJoinRequest(clubId, userId);
    hideLoading();
    if (r.error) { showError(r.error, '가입 거절'); return; }
    toastSuccess('거절 처리됨');
    renderApp();
  },
  async doKickMember(clubId, userId, name) {
    if (!await confirmDialog(`"${name}" 회원을 동호회에서 강퇴하시겠어요?`, { title: '강퇴', okLabel: '강퇴', danger: true })) return;
    showLoading();
    const r = await removeClubMember(clubId, userId);
    hideLoading();
    if (r.error) { showError(r.error, '강퇴'); return; }
    toastSuccess('강퇴 완료');
    renderApp();
  },
  async doSetCoLeader(clubId, userId) {
    if (!await confirmDialog('이 회원을 공동관리자로 지정하시겠어요?\n\n공동관리자는 회장과 동일한 권한을 가지며, 활동 등록·수정·멤버 승인·강퇴 등을 할 수 있습니다.\n\n단, 공동관리자 지정/취소는 회장(또는 슈퍼관리자)만 가능합니다.', { title: '공동관리자 지정', okLabel: '지정' })) return;
    showLoading();
    const r = await setCoLeader(clubId, userId);
    hideLoading();
    if (r.error) { showError(r.error, '공동관리자 지정 실패'); return; }
    toastSuccess('🛡️ 공동관리자로 지정했습니다');
    pushView({ type: 'clubDetail', params: { id: clubId } });
  },
  async doUnsetCoLeader(clubId, userId) {
    if (!await confirmDialog('공동관리자 권한을 취소하시겠어요?\n\n일반 회원으로 돌아갑니다.', { title: '공동관리자 취소', danger: true, okLabel: '취소' })) return;
    showLoading();
    const r = await unsetCoLeader(clubId, userId);
    hideLoading();
    if (r.error) { showError(r.error, '공동관리자 취소 실패'); return; }
    toastSuccess('공동관리자 권한을 취소했습니다');
    pushView({ type: 'clubDetail', params: { id: clubId } });
  },
  async doLeaveClub(clubId, name) {
    if (!await confirmDialog(`"${name}" 동호회에서 탈퇴하시겠어요?`, { title: '탈퇴', okLabel: '탈퇴', danger: true })) return;
    showLoading();
    const r = await leaveClub(clubId);
    hideLoading();
    if (r.error) { showError(r.error, '탈퇴'); return; }
    toastSuccess('탈퇴 완료');
    resetTo({ type: 'clubsList' });
  },
  async openClubEdit(clubId) {
    const { data: club } = await loadClub(clubId);
    if (!club) return;
    const newName = await promptDialog('동호회 이름', { defaultValue: club.name, title: '이름 변경 (취소 시 무변경)' });
    if (newName === null) return;
    const newLocation = await promptDialog('활동 지역', { defaultValue: club.location || '', title: '지역 변경 (취소 시 무변경)' });
    if (newLocation === null) return;
    const newDesc = await promptDialog('소개 (선택)', { defaultValue: club.description || '', title: '소개 변경 (취소 시 무변경)' });
    if (newDesc === null) return;
    showLoading();
    const r = await updateClub(clubId, { name: newName, location: newLocation, description: newDesc });
    hideLoading();
    if (r.error) { showError(r.error, '정보 수정'); return; }
    toastSuccess('동호회 정보 수정 완료');
    renderApp();
  },
  
  // ── Activity creation ──
  onActivityTypeChange() {
    const t = document.getElementById('af_type')?.value;
    const courseBlk = document.getElementById('af_courseBlock');
    const placeBlk = document.getElementById('af_placeBlock');
    const dateBlk = document.getElementById('af_dateBlock');
    const scoringBlk = document.getElementById('af_scoringBlock');
    const hint = document.getElementById('af_courseHint');
    if (courseBlk) courseBlk.style.display = (t === 'notice') ? 'none' : '';
    if (placeBlk) placeBlk.style.display = (t === 'social') ? '' : 'none';
    if (dateBlk) dateBlk.style.display = '';
    if (scoringBlk) scoringBlk.style.display = (t === 'round') ? '' : 'none';
    if (hint) hint.textContent = (t === 'social' ? '친목 모임도 보통 라운드 후 모이니까 골프장 함께 기록' : '권역 선택 후 골프장') + ' — 빠진 곳 있으면 알려주세요.';
  },

  onCourseRegionChange() {
    const reg = document.getElementById('af_courseRegion')?.value || '';
    const sel = document.getElementById('af_course');
    if (!sel) return;
    const all = window.__coursesByRegion || {};
    const list = reg ? (all[reg] || []) : Object.values(all).flat();
    const escAttr = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    sel.innerHTML = '<option value="">— 골프장 선택 —</option>' +
      list.map(c => {
        const sub = c.district ? ' (' + c.district + ')' : '';
        return '<option value="' + c.id + '"' +
          ' data-name="' + escAttr(c.name) + '"' +
          ' data-holes="' + (c.holes || 18) + '"' +
          ' data-course-names=\'' + escAttr(JSON.stringify(c.course_names || [])) + '\'' +
          '>' + escAttr(c.name) + sub + '</option>';
      }).join('');
    // 골프장 select 초기화 시 course key block 숨김
    const kb = document.getElementById('af_courseKeyBlock');
    if (kb) kb.style.display = 'none';
    const ksel1 = document.getElementById('af_courseKey1');
    const ksel2 = document.getElementById('af_courseKey2');
    if (ksel1) ksel1.innerHTML = '<option value="">— 1st 9 —</option>';
    if (ksel2) ksel2.innerHTML = '<option value="">— 2nd 9 —</option>';
  },

  onCourseSelectChange() {
    const sel = document.getElementById('af_course');
    const kb = document.getElementById('af_courseKeyBlock');
    const ksel1 = document.getElementById('af_courseKey1');
    const ksel2 = document.getElementById('af_courseKey2');
    if (!sel || !kb || !ksel1 || !ksel2) return;
    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) {
      kb.style.display = 'none';
      ksel1.innerHTML = '<option value="">— 1st 9 —</option>';
      ksel2.innerHTML = '<option value="">— 2nd 9 —</option>';
      return;
    }
    let courseNames = [];
    try { courseNames = JSON.parse(opt.dataset.courseNames || '[]'); } catch(e) {}
    if (Array.isArray(courseNames) && courseNames.length >= 2) {
      kb.style.display = 'block';
      const escAttr = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
      const opts = courseNames.map(k => '<option value="' + escAttr(k) + '">' + escAttr(k) + '</option>').join('');
      ksel1.innerHTML = '<option value="">— 1st 9 (전반) —</option>' + opts;
      ksel2.innerHTML = '<option value="">— 2nd 9 (후반) —</option>' + opts;
    } else {
      kb.style.display = 'none';
      ksel1.innerHTML = '<option value="">— 1st 9 —</option>';
      ksel2.innerHTML = '<option value="">— 2nd 9 —</option>';
    }
  },
  async doCreateActivity(clubId) {
    const type = document.getElementById('af_type')?.value;
    const name = document.getElementById('af_name')?.value;
    const eventDate = document.getElementById('af_date')?.value;
    const eventTime = document.getElementById('af_time')?.value;
    const courseSel = document.getElementById('af_course');
    const courseOpt = courseSel && courseSel.options[courseSel.selectedIndex];
    const courseId = courseSel?.value || '';
    const course = (courseOpt && courseOpt.dataset && courseOpt.dataset.name) || '';
    // 27/36홀: 두 코스 선택해서 "A+B" 조합
    let courseKey = '';
    if (courseId && courseOpt) {
      let cn = [];
      try { cn = JSON.parse(courseOpt.dataset.courseNames || '[]'); } catch(e) {}
      const isMulti = Array.isArray(cn) && cn.length >= 2;
      if (isMulti) {
        const k1 = document.getElementById('af_courseKey1')?.value || '';
        const k2 = document.getElementById('af_courseKey2')?.value || '';
        if (!k1 || !k2) { toast('27/36홀 골프장은 1st 9와 2nd 9 모두 선택해주세요'); return; }
        if (k1 === k2) { toast('1st 9와 2nd 9는 다른 코스를 선택해주세요'); return; }
        courseKey = k1 + '+' + k2;
      }
    }
    const scoringMethod = document.getElementById('af_scoring')?.value;
    const body = document.getElementById('af_body')?.value;
    showLoading();
    const r = await createActivity(clubId, { name, type, eventDate, eventTime, course, courseId, courseKey, scoringMethod, body });
    hideLoading();
    if (r.error) { showError(r.error, '활동 등록'); return; }
    toastSuccess('활동 등록 완료');
    resetTo({ type: 'clubDetail', params: { id: clubId } });
  },
  
  // ── Award workflow (unchanged) ──
  async lockResults(eventId) {
    if (!await confirmDialog('시상을 잠그시겠어요?\n이후 참가자는 점수를 수정할 수 없습니다.', { title: '시상 잠금', okLabel: '잠금', danger: false })) return;
    showLoading();
    const r = await lockResults(eventId);
    hideLoading();
    if (r.error) { showError(r.error, '시상 잠금'); return; }
    toastSuccess('시상 잠금 완료 — 다음 단계로 진행하세요');
    setTimeout(() => this.doShowAllScorecards(eventId), 300);
    renderApp();
  },
  async saveMethodAndRanks(eventId) {
    const ranks = parseInt(document.getElementById('awSelRanks_' + eventId)?.value, 10);
    const method = document.getElementById('awSelMethod_' + eventId)?.value;
    const grossRanks = parseInt(document.getElementById('awSelGrossRanks_' + eventId)?.value, 10);
    if (!ranks || !method) { toastError('시상 방식 + 방식 등수 모두 선택'); return; }
    if (isNaN(grossRanks)) { toastError('그로스 시상 인원 선택'); return; }
    showLoading();
    const r = await setMethodAndRanks(eventId, ranks, method, grossRanks);
    hideLoading();
    if (r.error) { showError(r.error, '시상 방식 저장'); return; }
    toastSuccess('시상 방식 저장 완료 — 다음 단계로 진행하세요');
    renderApp();
  },
  async drawPeoria(eventId) {
    if (!await confirmDialog('신페리오 12홀을 무작위로 추첨하시겠어요?', { title: '12홀 추첨' })) return;
    showLoading();
    const stageEl = document.getElementById('peoriaStage_' + eventId);
    if (stageEl) stageEl.innerHTML = '<div style="text-align:center;padding:12px;font-size:18px;">🎰 추첨 중...</div>';
    const r = await drawPeoriaHoles(eventId);
    hideLoading();
    if (r.error) { showError(r.error, '12홀 추첨'); return; }
    toastSuccess('12홀 추첨 완료: ' + r.holes.join(', '));
    setTimeout(() => renderApp(), 500);
  },
  async saveLongNear(eventId) {
    const longs = [], nears = [];
    for (let i = 0; i < 4; i++) {
      const lv = document.getElementById('awSelLong_' + i + '_' + eventId)?.value;
      const nv = document.getElementById('awSelNear_' + i + '_' + eventId)?.value;
      if (lv) longs.push(lv);
      if (nv) nears.push(nv);
    }
    showLoading();
    const r = await setSpecialAwards(eventId, longs, nears);
    hideLoading();
    if (r.error) { showError(r.error, '롱기/니어 저장'); return; }
    toastSuccess(`롱기 ${longs.length}명 / 니어 ${nears.length}명 저장됨`);
    renderApp();
  },
  async publishAwards(eventId) {
    if (!await confirmDialog('정규 시상을 발표하시겠어요?', { title: '시상 발표' })) return;
    showLoading();
    const r = await publishAwards(eventId);
    hideLoading();
    if (r.error) { showError(r.error, '시상 발표'); return; }
    toastSuccess('🏆 정규 시상 발표 완료!');
    renderApp();
  },
  async unlockResults(eventId) {
    if (!await confirmDialog('시상 잠금을 해제하시겠어요?\n\n모든 시상 데이터(12홀, 롱기/니어, 등수/방식, 발표 시각)가 초기화됩니다.', { title: '시상 잠금 해제', okLabel: '해제', danger: true })) return;
    showLoading();
    const r = await unlockResults(eventId);
    hideLoading();
    if (r.error) { showError(r.error, '잠금 해제'); return; }
    toastSuccess('시상 잠금 해제됨 — 1단계로 돌아갑니다');
    renderApp();
  },
  async startRaffle(eventId) {
    showLoading();
    const { data: parts } = await loadEventParticipants(eventId);
    const { data: aw } = await loadEventAwards(eventId);
    hideLoading();
    if (!parts || !parts.length) { toastError('참가자 없음'); return; }
    
    // Read + persist the include-winners toggle
    const _raffleCb = document.getElementById('awChkRaffleAll_' + eventId);
    const includeWinners = _raffleCb ? !!_raffleCb.checked : (aw?.raffle_include_winners ?? true);
    if (aw && includeWinners !== !!aw.raffle_include_winners) {
      await setRaffleIncludeWinners(eventId, includeWinners);
    }
    
    let eligible = parts;
    if (!includeWinners) {
      const grossRanks = aw?.gross_ranks ?? 0;
      const methodRanks = aw?.award_ranks ?? 0;
      const method = aw?.award_method;
      const byGross = [...parts].sort((a,b) => (a.total ?? 999) - (b.total ?? 999));
      const grossWinIds = new Set(byGross.slice(0, grossRanks).map(p => p.user_id));
      let methodWinIds = new Set();
      if (method && method !== 'gross' && methodRanks > 0) {
        const elig = parts.filter(p => !grossWinIds.has(p.user_id));
        methodWinIds = new Set(elig.slice(0, methodRanks).map(p => p.user_id));
      }
      // Also exclude longest/nearest winners (arrays)
      const longArr = Array.isArray(aw?.longest_drive_user_ids) ? aw.longest_drive_user_ids : (aw?.longest_drive_user_id ? [aw.longest_drive_user_id] : []);
      const nearArr = Array.isArray(aw?.nearest_pin_user_ids) ? aw.nearest_pin_user_ids : (aw?.nearest_pin_user_id ? [aw.nearest_pin_user_id] : []);
      const specialIds = new Set([...longArr, ...nearArr]);
      eligible = parts.filter(p => !grossWinIds.has(p.user_id) && !methodWinIds.has(p.user_id) && !specialIds.has(p.user_id));
    }
    
    if (!eligible.length) { toastError('럭키드로우 대상자 0명'); return; }
    const winners = await runRaffle(eventId, eligible);
    if (winners === null) return;
    toastSuccess(`🎁 럭키드로우 종료 — ${winners.length}명 당첨`);
    renderApp();
  }
};

// 알람용 AudioContext (사용자 first interaction에 활성화)
let _audioCtx = null;
function playBeep() {
  // 폴백용 짧은 beep
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _audioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch(_) {}
}

function playGolfdongAlarm() {
  // 0. audio context resume 시도 (suspended 상태일 수 있음)
  try { if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume(); } catch(_) {}
  // 1. 보장된 beep (즉시) — 모든 환경에서 동작
  playMelodyBeep();
  
  // 2. TTS 시도 — 환경에 따라 음성 추가
  try {
    if ('speechSynthesis' in window) {
      try { speechSynthesis.cancel(); } catch(_) {}
      setTimeout(() => {
        const u = new SpeechSynthesisUtterance('골프메이트');
        u.lang = 'ko-KR';
        u.rate = 1.0;
        u.pitch = 1.3;
        u.volume = 1.0;
        const voices = speechSynthesis.getVoices();
        const koVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('ko'));
        if (koVoice) u.voice = koVoice;
        speechSynthesis.speak(u);
      }, 100);
    }
  } catch(_) {}
  
  // 3. 진동 (모바일만)
  try { if (navigator.vibrate) navigator.vibrate([100, 50, 100]); } catch(_) {}
}

function playMelodyBeep() {
  // 도-미-솔 짧은 멜로디 (3음, 0.6초)
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _audioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    
    const notes = [
      { freq: 523, start: 0, dur: 0.18 },     // C5
      { freq: 659, start: 0.15, dur: 0.18 },  // E5
      { freq: 784, start: 0.30, dur: 0.28 }   // G5
    ];
    
    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = n.freq;
      const t0 = ctx.currentTime + n.start;
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + n.dur);
      osc.start(t0);
      osc.stop(t0 + n.dur + 0.05);
    });
  } catch(_) {}
}
window.addEventListener('click', () => { if (_audioCtx?.state === 'suspended') _audioCtx.resume(); }, { once: false });
window.addEventListener('touchstart', () => { if (_audioCtx?.state === 'suspended') _audioCtx.resume(); }, { once: false, passive: true });
window.addEventListener('pointerdown', () => { if (_audioCtx?.state === 'suspended') _audioCtx.resume(); }, { once: false, passive: true });
// SpeechSynthesis voices 사전 로드
try { if ('speechSynthesis' in window) speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); } catch(_) {}


// 홈 채팅 버튼 unread 뱃지 실시간 갱신
let _badgePending = null;
async function refreshChatBadge() {
  if (_badgePending) return _badgePending;
  _badgePending = new Promise((resolve) => setTimeout(async () => { _badgePending = null; try { await _doRefreshChatBadge(); } catch(_){} resolve(); }, 300));
  return _badgePending;
}
async function _doRefreshChatBadge() {
  try {
    const r = await loadUnreadCount();
    const count = (r && r.count) || 0;
    document.querySelectorAll('button[onclick*="goChatList"]').forEach(btn => {
      const badge = count > 0 ? ` <span style="background:#d32f2f;color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;margin-left:4px;">${count}</span>` : '';
      btn.innerHTML = btn.innerHTML.replace(/(💬 채팅)(\s*<span[^>]*>[^<]*<\/span>)?/, '$1' + badge);
    });
  } catch(_) {}
}

// 글로벌 채팅 채널 재구독 + audio context resume
let _chatChannel = null;
// auth 상태 변경 시 채널 재설정 (logout/login 좀비 채널 방지)
let _lastWiredUserId = null;
async function rewireGlobalChat(reason) {
  try { if (_chatChannel) { _chatChannel.unsubscribe(); _chatChannel = null; } } catch(_) {}
  _lastWiredUserId = null;
  const s = getSession();
  if (s && s.user && s.user.id) {
    setupGlobalChat(s.user.id);
    _lastWiredUserId = s.user.id;
    refreshChatBadge();
  }
}
try {
  sb.auth.onAuthStateChange((event, session) => {
    const newId = session && session.user ? session.user.id : null;
    if (newId !== _lastWiredUserId) rewireGlobalChat('auth-change:' + event);
  });
} catch(_) {}

function setupGlobalChat(userId) {
  try { if (_chatChannel) _chatChannel.unsubscribe(); } catch(_) {}
  _lastWiredUserId = userId;
  _chatChannel = subscribeAllChatForUser(userId, async (msg) => {
    try {
      const cur = (window.location.hash || '').match(/^#c\/(.+)$/);
      if (cur && cur[1] === msg.room_id) { refreshChatBadge(); return; }
    } catch(_) {}
    playGolfdongAlarm();
    // sender 이름 + content preview 가져와서 toast — 빠른 lookup
    let title = '💬 새 메시지';
    try {
      const { data: sp } = await sb.from('profiles').select('name').eq('id', msg.sender_id).maybeSingle();
      const senderName = sp?.name || '대화 상대';
      const preview = (msg.content || '').substring(0, 30);
      title = '💬 ' + senderName + ': ' + preview;
      if ((msg.content || '').length > 30) title += '...';
    } catch(_) {}
    toast(title, 'default', 6000);
    // 페이지 제목에 표시 (작업표시줄)
    try { if (!document.title.startsWith('🔔 ')) document.title = '🔔 ' + document.title; } catch(_) {}
    refreshChatBadge();
  });
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    try { if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume(); } catch(_) {}
    // 페이지 제목 복원
    try { if (document.title.startsWith('🔔 ')) document.title = document.title.replace(/^🔔 /, ''); } catch(_) {}
    refreshChatBadge();
  }
});


// PWA 설치 prompt 캐치 (Chrome Android/Desktop)
let _installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _installPrompt = e;
  // 홈에 있으면 다시 그리기 (설치 카드 노출용)
  try { if ((window.location.hash || '') === '' || window.location.hash === '#' || window.location.hash === '#h') {
    pushView({ type: 'home' });
  } } catch(_) {}
});
window.addEventListener('appinstalled', () => {
  _installPrompt = null;
  toastSuccess('🎉 앱 설치 완료!');
});
window.canInstallPwa = () => !!_installPrompt;
window.isPwaInstalled = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;


// PWA 수동 설치 가이드 모달 (OS별)
function showInstallGuide() {
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isInApp = /KAKAOTALK|Line|FBAN|FBAV|Instagram|NAVER|whale/i.test(ua);
  let osLabel, steps;
  if (isInApp) {
    osLabel = "⚠️ 인앱 브라우저 감지됨";
    steps = [
      ["1", "지금 보고 있는 화면은 카톡/라인 등의 <b>인앱 브라우저</b>입니다"],
      ["2", "우상단 메뉴에서 <b>외부 브라우저(Chrome)로 열기</b> 선택"],
      ["3", "Chrome에서 페이지가 열린 후, 우상단 <b>⋮</b> 메뉴 탭"],
      ["4", "<b>앱 설치</b> 또는 <b>홈 화면에 추가</b> 선택"]
    ];
  } else if (isIos) {
    osLabel = "🍎 iOS (iOS 16.4 이상 필수)";
    steps = [
      ["1", "<b>Safari</b>로 이 페이지 열기 (Chrome X)"],
      ["2", "화면 하단 가운데 <b>공유 ⬆</b> 버튼 탭"],
      ["3", "메뉴 스크롤 → <b>홈 화면에 추가</b> 선택"],
      ["4", "우상단 <b>추가</b> 탭 → 끝"]
    ];
  } else if (isAndroid) {
    osLabel = "🤖 안드로이드";
    steps = [
      ["1", "Chrome 우상단 <b>⋮ (점 3개)</b> 메뉴 탭"],
      ["2", "<b>앱 설치</b> 또는 <b>홈 화면에 추가</b> 선택"],
      ["3", "확인 팝업에서 <b>설치</b> 또는 <b>추가</b> 탭"],
      ["4", "홈 화면에 GolfMate 아이콘 생성 ✓"]
    ];
  } else {
    osLabel = "💻 데스크탑";
    steps = [
      ["1", "Chrome 주소창 우측 <b>다이아몬드 (+)</b> 아이콘 클릭"],
      ["2", "팝업에서 <b>설치</b> 버튼 클릭"],
      ["3", "데스크탑에 GolfMate 앱 생성 ✓"]
    ];
  }
  const modal = document.createElement("div");
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.2s;";
  modal.innerHTML = `
    <div style="background:white;border-radius:16px;max-width:380px;width:100%;padding:24px;max-height:90vh;overflow-y:auto;">
      <div style="text-align:center;font-size:56px;margin-bottom:8px;line-height:1;">📲</div>
      <h2 style="margin:0 0 6px;text-align:center;color:#1a1a2e;font-size:20px;">앱으로 설치하기</h2>
      <p style="font-size:13px;color:#666;text-align:center;margin:0 0 20px;">${osLabel}</p>
      ${steps.map(([n,t]) => `
        <div style="display:flex;gap:12px;margin-bottom:14px;align-items:flex-start;">
          <div style="background:#2E7D32;color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;font-size:14px;">${n}</div>
          <div style="flex:1;font-size:14px;line-height:1.55;color:#333;padding-top:4px;">${t}</div>
        </div>
      `).join("")}
      <button onclick="this.parentElement.parentElement.remove()" style="width:100%;background:#2E7D32;color:white;border:none;padding:14px;border-radius:8px;font-size:15px;font-weight:600;margin-top:16px;cursor:pointer;">확인</button>
    </div>
  `;
  document.body.appendChild(modal);
}


// 자동 로딩 spinner — 클릭 후 250ms 응답 없으면 표시, 다음 render 시 자동 hide
(() => {
  let _autoTimer = null;
  let _autoShown = false;
  function showSpinner() {
    try {
      const ov = document.getElementById("loading-overlay");
      if (ov && !_autoShown) { ov.style.display = "flex"; _autoShown = true; }
    } catch(_) {}
  }
  function hideSpinner() {
    try {
      clearTimeout(_autoTimer);
      const ov = document.getElementById("loading-overlay");
      if (ov && _autoShown) { ov.style.display = "none"; _autoShown = false; }
    } catch(_) {}
  }
  // 사용자 클릭 → 250ms 후 spinner 표시 (빠르면 안 보임)
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, a, [onclick]");
    if (!t) return;
    if (t.closest("#loading-overlay, #toast-container, #dialog-container")) return;
    clearTimeout(_autoTimer);
    _autoTimer = setTimeout(showSpinner, 100);
    // 안전판: 5초 후 강제 hide
    setTimeout(hideSpinner, 5000);
  }, true);
  // location.hash 변할 때 (페이지 전환 완료) hide
  window.addEventListener("hashchange", () => setTimeout(hideSpinner, 50));
  window.addEventListener("popstate", () => setTimeout(hideSpinner, 50));
  // 외부에서 강제 끌 때
  window.__hideAutoSpinner = hideSpinner;
})();


// DOM 자동 영문 swap (langs.en일 때만, render 후 적용)
(() => {
  let _swapTimer = null;
  async function applySwap() {
    try {
      const m = await import('./core/i18n.js');
      if (m.swapDom) m.swapDom(document.getElementById('app') || document.body);
    } catch(_) {}
  }
  function scheduleSwap() {
    clearTimeout(_swapTimer);
    _swapTimer = setTimeout(applySwap, 50);
  }
  // 페이지 전환마다 swap
  window.addEventListener('hashchange', scheduleSwap);
  window.addEventListener('popstate', scheduleSwap);
  // 초기 + DOM 변경 감지
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    scheduleSwap();
  } else {
    document.addEventListener('DOMContentLoaded', scheduleSwap);
  }
  // 동적 변경 감지 (입력 폼/리스트 등)
  const target = document.getElementById('app') || document.body;
  if (target && window.MutationObserver) {
    const mo = new MutationObserver(() => scheduleSwap());
    mo.observe(target, { childList: true, subtree: true });
  }
  window.__swapDomNow = applySwap;
})();

async function init() {
  // EMBED: running inside ThaiMate (/golf/?embed=thaimate). Trims marketplace,
  // admin tools and the tall header so ThaiMate's bar is the only chrome.
  try { window.__embed = new URL(window.location.href).searchParams.get('embed') === 'thaimate'; } catch (_) { window.__embed = false; }
  await loadSession();
  // 연결 워밍업 — 첫 데이터 쿼리의 콜드스타트(~700ms)를 랜딩 렌더와 겹치도록 미리 데움 (fire-and-forget)
  try { sb.from('golf_clubs').select('id').limit(1).then(() => {}, () => {}); } catch (_) {}

  // 전역 채팅 구독 — 새 메시지 알람
  const sess = getSession();
  if (sess?.user?.id) {
    setupGlobalChat(sess.user.id);
    refreshChatBadge();
    checkAndAutoSubscribe();
  }
  
  // ─── 매직링크 콜백 처리 ───
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('email_verified') === '1') {
      // Supabase가 자동으로 hash → session 변환했을 것
      setTimeout(() => toastSuccess('📧 이메일 인증 완료! 환영합니다'), 500);
      // URL에서 ?email_verified 제거
      url.searchParams.delete('email_verified');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  } catch(_) {}
  registerViews({
    home: homeView,
    signIn: signInView,
    signUp: signUpView,
    clubsList: clubsListView,
    clubDetail: clubDetailView,
    clubApply: clubApplyView,
    clubAdmin: clubAdminView,
    activityForm: activityFormView,
    myPage: myPageView,
    memberList: memberListView,
    clubsManage: clubsManageView,
    coursesAdmin: coursesAdminView,
    coursesAdminEdit: coursesAdminEditView,
    eventDetail: eventDetailView,
    matchesList: matchesListView,
    matchCreate: matchCreateView,
    matchDetail: matchDetailView,
    myRounds: myRoundsView,
    eventScore: eventScoreView,
    chatList: chatListView,
    chatRoom: chatRoomView,
    roundAdd: roundAddView,
    sponsorDetail: (p) => `<div class="card"><h2>회원사</h2><p>Phase 6</p><p>ID: ${p.id || '-'}</p></div>`,
    marketList: marketListView,
    marketCreate: marketCreateView,
    marketItem: marketDetailView,
    businessList: businessListView,
    businessApply: businessApplyView,
    businessDetail: businessDetailView,
    businessReview: businessReviewView,
    sponsorDetail: businessDetailView,
  });
  onRouteChange(() => renderApp());
  startRouter();
  await renderApp();
  console.log('[main] Phase 4 + club mgmt ready');
}


// ─── 동반자 모집 + 개인 라운드 핸들러 (window._gd 객체 외부 보강) ───
Object.assign(window._gd, {
  // 회원사
  goBusinessList() { pushView({ type: 'businessList' }); },
  goBusinessApply() { pushView({ type: 'businessApply' }); },
  openBusiness(id) { pushView({ type: 'businessDetail', params: { id } }); },
  goBusinessReview() { pushView({ type: 'businessReview' }); },
  setBizType(t) { window.__bizType = t; renderApp(); },
  async doUploadBizPhotos(input) {
    const files = Array.from(input.files || []);
    if (!files.length) return;
    window.__bizPhotos = window.__bizPhotos || [];
    if (window.__bizPhotos.length + files.length > 5) { toastError('최대 5장'); return; }
    showLoading();
    for (const f of files) {
      const r = await uploadBusinessPhoto(f);
      if (r.error) { hideLoading(); showError(r.error, '사진'); return; }
      window.__bizPhotos.push(r.url);
    }
    hideLoading();
    const prev = document.getElementById('bz_photosPreview');
    if (prev) {
      prev.innerHTML = window.__bizPhotos.map((url,i) =>
        '<div style="position:relative;"><img src="'+url+'" style="width:70px;height:70px;object-fit:cover;border-radius:6px;border:1px solid #ddd;"><button onclick="window._gd.removeBizPhoto('+i+')" style="position:absolute;top:-6px;right:-6px;background:#d32f2f;color:white;border:none;border-radius:50%;width:20px;height:20px;font-size:12px;cursor:pointer;">×</button></div>'
      ).join('');
    }
    input.value = '';
  },
  removeBizPhoto(idx) {
    window.__bizPhotos.splice(idx, 1);
    const prev = document.getElementById('bz_photosPreview');
    if (prev) {
      prev.innerHTML = window.__bizPhotos.map((url,i) =>
        '<div style="position:relative;"><img src="'+url+'" style="width:70px;height:70px;object-fit:cover;border-radius:6px;border:1px solid #ddd;"><button onclick="window._gd.removeBizPhoto('+i+')" style="position:absolute;top:-6px;right:-6px;background:#d32f2f;color:white;border:none;border-radius:50%;width:20px;height:20px;font-size:12px;cursor:pointer;">×</button></div>'
      ).join('');
    }
  },
  async doApplyBusiness() {
    const get = id => document.getElementById(id)?.value?.trim() || '';
    const name = get('bz_name');
    const type = get('bz_type');
    if (!name || !type) { toastError('업종/상호명은 필수'); return; }
    showLoading();
    const r = await applyBusiness({
      name, type,
      region: get('bz_region'),
      location: get('bz_location'),
      address: get('bz_address'),
      description: get('bz_description'),
      phone: get('bz_phone'),
      website: get('bz_website'),
      contact_email: get('bz_contact_email'),
      photos: window.__bizPhotos || []
    });
    hideLoading();
    if (r.error) { showError(r.error, '신청'); return; }
    toastSuccess('신청 완료! 슈퍼관리자 승인 대기');
    window.__bizPhotos = [];
    resetTo({ type: 'home' });
  },
  async doApproveBusiness(id) {
    showLoading();
    const r = await approveBusiness(id);
    hideLoading();
    if (r.error) { showError(r.error, '승인'); return; }
    toastSuccess('승인됨');
    renderApp();
  },
  async doRejectBusiness(id) {
    const reason = await promptDialog('거절 사유를 입력하세요', '예: 정보 불충분');
    if (!reason) return;
    showLoading();
    const r = await rejectBusiness(id, reason);
    hideLoading();
    if (r.error) { showError(r.error, '거절'); return; }
    toastSuccess('거절됨');
    renderApp();
  },
  goMarketList() { pushView({ type: 'marketList' }); },
  goMarketCreate() { pushView({ type: 'marketCreate' }); },
  openMarketItem(id) { pushView({ type: 'marketItem', params: { id } }); },
  goMarketEdit(id) { pushView({ type: 'marketCreate', params: { id } }); },
  async doSaveMarketItem(id) {
    const title = document.getElementById('mk_title')?.value;
    const category = document.getElementById('mk_category')?.value;
    const subCategory = document.getElementById('mk_subcategory')?.value || '';
    const price = document.getElementById('mk_price')?.value;
    const condition = document.getElementById('mk_condition')?.value;
    const location = document.getElementById('mk_location')?.value;
    const description = document.getElementById('mk_description')?.value;
    const images = window.__marketPhotos || [];
    if (!title || !category || price === '' || price == null) { toastError('필수 항목을 입력하세요'); return; }
    if (category === '골프용품' && !subCategory) { toastError('골프용품 세부 카테고리를 선택하세요'); return; }
    showLoading();
    const r = await updateMarketItem(id, { title, category, subCategory, price, condition, location, description, images });
    hideLoading();
    if (r.error) { showError(r.error, '수정'); return; }
    toastSuccess('수정 완료');
    window.__marketPhotos = [];
    pushView({ type: 'marketItem', params: { id } });
  },
  setMarketCat(c) { window.__marketCat = c; renderApp(); },
  onMarketCategoryChange() {
    const cat = document.getElementById('mk_category')?.value;
    const subBlock = document.getElementById('mk_subcategory_block');
    if (!subBlock) return;
    if (cat === '골프용품') {
      subBlock.style.display = '';
    } else {
      subBlock.style.display = 'none';
      const subSel = document.getElementById('mk_subcategory');
      if (subSel) subSel.value = '';
    }
  },
  
  async doUploadMarketPhotos(input) {
    const files = Array.from(input.files || []);
    if (!files.length) return;
    window.__marketPhotos = window.__marketPhotos || [];
    if (window.__marketPhotos.length + files.length > 5) { toastError('최대 5장'); return; }
    showLoading();
    for (const f of files) {
      const r = await uploadMarketPhoto(f);
      if (r.error) { hideLoading(); showError(r.error, '사진 업로드'); return; }
      window.__marketPhotos.push(r.url);
    }
    hideLoading();
    // preview
    const prev = document.getElementById('mk_photosPreview');
    if (prev) {
      prev.innerHTML = window.__marketPhotos.map((url, i) => 
        '<div style="position:relative;"><img src="' + url + '" style="width:70px;height:70px;object-fit:cover;border-radius:6px;border:1px solid #ddd;"><button onclick="window._gd.removeMarketPhoto(' + i + ')" style="position:absolute;top:-6px;right:-6px;background:#d32f2f;color:white;border:none;border-radius:50%;width:20px;height:20px;font-size:12px;cursor:pointer;">×</button></div>'
      ).join('');
    }
    input.value = '';
  },
  removeMarketPhoto(idx) {
    if (!window.__marketPhotos) return;
    window.__marketPhotos.splice(idx, 1);
    const prev = document.getElementById('mk_photosPreview');
    if (prev) {
      prev.innerHTML = window.__marketPhotos.map((url, i) => 
        '<div style="position:relative;"><img src="' + url + '" style="width:70px;height:70px;object-fit:cover;border-radius:6px;border:1px solid #ddd;"><button onclick="window._gd.removeMarketPhoto(' + i + ')" style="position:absolute;top:-6px;right:-6px;background:#d32f2f;color:white;border:none;border-radius:50%;width:20px;height:20px;font-size:12px;cursor:pointer;">×</button></div>'
      ).join('');
    }
  },
  async doCreateMarketItem() {
    const title = document.getElementById('mk_title')?.value;
    const category = document.getElementById('mk_category')?.value;
    const subCategory = document.getElementById('mk_subcategory')?.value || '';
    const price = document.getElementById('mk_price')?.value;
    const condition = document.getElementById('mk_condition')?.value;
    const location = document.getElementById('mk_location')?.value;
    const description = document.getElementById('mk_description')?.value;
    const images = window.__marketPhotos || [];
    if (!title || !category || price === '' || price == null) { toastError('필수 항목을 입력하세요'); return; }
    if (category === '골프용품' && !subCategory) { toastError('골프용품 세부 카테고리를 선택하세요'); return; }
    showLoading();
    const r = await createMarketItem({ title, category, subCategory, price, condition, description, location, images });
    hideLoading();
    if (r.error) { showError(r.error, '나눔 등록'); return; }
    toastSuccess('나눔 등록 완료!');
    window.__marketPhotos = [];
    pushView({ type: 'marketItem', params: { id: r.data.id } });
  },
  async doCompleteMarketItem(id) {
    if (!await confirmDialog('거래완료 처리하시겠어요?\n매물·사진이 즉시 삭제됩니다.', { title: '거래완료', okLabel: '완료', danger: true })) return;
    showLoading();
    const r = await completeAndDeleteItem(id);
    hideLoading();
    if (r.error) { showError(r.error, '거래완료'); return; }
    toastSuccess('거래완료 — 매물 삭제됨');
    pushView({ type: 'marketList' });
  },
  async doDeleteMarketItem(id) {
    if (!await confirmDialog('이 매물을 삭제하시겠어요?', { title: '삭제', okLabel: '삭제', danger: true })) return;
    showLoading();
    const r = await completeAndDeleteItem(id);
    hideLoading();
    if (r.error) { showError(r.error, '삭제'); return; }
    toastSuccess('삭제됨');
    pushView({ type: 'marketList' });
  },
  goChatList() { pushView({ type: 'chatList' }); },
  async doSendVerificationEmail() {
    const session = getSession();
    if (!session || !session.user || !session.user.email) {
      toast('이메일이 등록되어 있지 않습니다', 'default', 5000);
      return;
    }
    if (session.user.email_confirmed_at) {
      toastSuccess('✓ 이미 인증된 이메일입니다');
      return;
    }
    showLoading();
    const { sb } = await import('./core/db.js');
    const { error } = await sb.auth.resend({ type: 'signup', email: session.user.email });
    hideLoading();
    if (error) { showError(error, '인증 메일 발송'); return; }
    toastSuccess('📧 인증 메일 발송됨 — 메일함 확인 후 링크 클릭');
  },  async doRegisterRealEmail() {
    const input = document.getElementById('real-email-input');
    if (!input) { toast('입력칸을 찾을 수 없습니다'); return; }
    const email = (input.value || '').trim().toLowerCase();
    if (!email) { toast('이메일을 입력해주세요'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('올바른 이메일 형식이 아닙니다'); return; }
    if (email.endsWith('@golfdong.local')) { toast('가짜 도메인은 등록할 수 없습니다'); return; }
    showLoading();
    const { sb } = await import('./core/db.js');
    const { error } = await sb.auth.updateUser({ email });
    hideLoading();
    if (error) { showError(error, '이메일 등록'); return; }
    toastSuccess('📧 인증 메일 발송됨 — 새 메일함에서 링크를 클릭하면 인증 완료됩니다');
  },
  async doToggleLang() {
    const { setLang, t, getLang } = await import('./core/i18n.js');
    const next = getLang() === 'ko' ? 'en' : 'ko';
    if (setLang(next)) {
      toastSuccess(t('lang.changed'));
      pushView({ type: 'home' });
    }
  },
  async doSetLang(lang) {
    const { setLang, t } = await import('./core/i18n.js');
    if (setLang(lang)) {
      toastSuccess(t('lang.changed'));
      pushView({ type: 'home' });
    }
  },
  async doInstallPwa() {
    if (_installPrompt) {
      _installPrompt.prompt();
      const r = await _installPrompt.userChoice;
      if (r.outcome === 'accepted') {
        toastSuccess('🎉 앱 설치 완료!');
        _installPrompt = null;
        pushView({ type: 'home' });
      } else {
        toast('설치를 취소했어요.', 'default', 4000);
      }
      return;
    }
    if (window.isPwaInstalled()) {
      toast('✓ 이미 설치되어 있어요', 'success', 3000);
      return;
    }
    showInstallGuide();
  },
  async doEnablePush() {
    if (!isPushSupported()) { toast('이 브라우저는 푸시를 지원하지 않습니다'); return; }
    showLoading();
    const r = await subscribeToPush();
    hideLoading();
    if (r.error) { showError(r.error, '알림 활성화'); return; }
    toastSuccess('🔔 푸시 알림 활성화됨');
    pushView({ type: 'home' });
  },
  openChatRoom(roomId) { pushView({ type: 'chatRoom', params: { id: roomId } }); },
  async doCloseChat(roomId) {
    if (!await confirmDialog('이 대화를 종료하시겠어요?\n\n• 나에게는 채팅 목록에서 사라집니다.\n• 상대도 종료하면 대화 전체가 영구 삭제됩니다.', { title: '대화 종료', danger: true, okLabel: '종료' })) return;
    showLoading();
    const r = await closeChatRoom(roomId);
    hideLoading();
    if (r.error) { showError(r.error, '대화 종료'); return; }
    toastSuccess('대화 종료됨');
    resetTo({ type: 'home' });
  },
  async startMatchChat(matchId, hostUserId, matchTitle) {
    showLoading();
    const r = await findOrCreate1on1('match', matchId, hostUserId, matchTitle || '동반자 모집 대화');
    hideLoading();
    if (r.error) { showError(r.error, '채팅 시작'); return; }
    pushView({ type: 'chatRoom', params: { id: r.data.id } });
  },
  async startMarketChat(itemId, sellerUserId, itemTitle) {
    showLoading();
    const r = await findOrCreate1on1('market', itemId, sellerUserId, itemTitle || '장터 대화');
    hideLoading();
    if (r.error) { showError(r.error, '채팅 시작'); return; }
    pushView({ type: 'chatRoom', params: { id: r.data.id } });
  },
  async startBusinessChat(bizId, ownerUserId, bizName) {
    showLoading();
    const r = await findOrCreate1on1('business', bizId, ownerUserId, bizName);
    hideLoading();
    if (r.error) { showError(r.error, '채팅 시작'); return; }
    pushView({ type: 'chatRoom', params: { id: r.data.id } });
  },
  async doSendChat(roomId) {
    const inp = document.getElementById('chatInput_' + roomId);
    const content = inp?.value?.trim();
    if (!content) return;
    const r = await sendMessage(roomId, content);
    if (r.error) { showError(r.error, '전송 실패'); return; }
    if (inp) inp.value = '';
    // 메시지는 Realtime이 갱신하니까 별도 render 안 함
  },
  recalcEventLive() {
    let sum = 0;
    for (let i = 1; i <= 18; i++) {
      const v = parseInt(document.getElementById('es_h' + i)?.value);
      if (!isNaN(v)) sum += v;
    }
    const t = document.getElementById('es_total');
    if (t) t.value = sum || '';
  },
  recalcRoundLive() {
    let sum = 0;
    for (let i = 1; i <= 18; i++) {
      const v = parseInt(document.getElementById('ra_h' + i)?.value);
      if (!isNaN(v)) sum += v;
    }
    const t = document.getElementById('ra_total');
    if (t) t.value = sum || '';
  },
  async doJoinEvent(eventId) {
    const session = (await import('./core/auth.js')).getSession();
    if (!session) { toastError('로그인 필요'); return; }
    showLoading();
    const { error } = await sb.from('event_participants').upsert({
      event_id: eventId,
      user_id: session.user.id,
      status: 'approved'
    }, { onConflict: 'event_id,user_id' });
    hideLoading();
    if (error) { showError(error, '참가'); return; }
    pushView({ type: 'eventDetail', params: { id: eventId } });
  },
  goEventScore(eventId) { pushView({ type: 'eventScore', params: { eventId } }); },
  goEventScoreFor(eventId, targetUserId) { pushView({ type: 'eventScore', params: { eventId, targetUserId } }); },
  calcEventScoreTotal() {
    let sum = 0;
    for (let i = 1; i <= 18; i++) {
      const v = parseInt(document.getElementById('es_h' + i)?.value);
      if (isNaN(v)) { toast('18홀 모두 입력해야 자동합산'); return; }
      sum += v;
    }
    const t = document.getElementById('es_total');
    if (t) t.value = sum;
    toast('합계 ' + sum + ' 자동 입력');
  },
  async doSaveMyEventRound(eventId) {
    const holes = [];
    let allFilled = true;
    for (let i = 1; i <= 18; i++) {
      const v = parseInt(document.getElementById('es_h' + i)?.value);
      if (isNaN(v)) { allFilled = false; break; }
      holes.push(v);
    }
    const total = document.getElementById('es_total')?.value;
    if (!total) { toastError('총 스코어를 입력하세요'); return; }
    showLoading();
    const r = await saveMyEventRound(eventId, allFilled ? holes : null, total);
    hideLoading();
    if (r.error) { showError(r.error, '점수 저장'); return; }
    toastSuccess('점수 저장됨');
    popViewSafe();
  },
  goMatches() { pushView({ type: 'matchesList' }); },
  goMatchCreate() { pushView({ type: 'matchCreate' }); },
  openMatch(id) { pushView({ type: 'matchDetail', params: { id } }); },
  setMatchRegion(r) { window.__matchRegion = r; renderApp(); },
  setMatchSort(s) { window.__matchSort = s; renderApp(); },
  async doCreateMatch() {
    let course = document.getElementById('mc_course')?.value;
    const _k1 = document.getElementById('mc_courseKey1')?.value;
    const _k2 = document.getElementById('mc_courseKey2')?.value;
    if (_k1 && _k2) course = course + ' (' + _k1 + '+' + _k2 + ')';
    const matchDate = document.getElementById('mc_date')?.value;
    const teeTime = document.getElementById('mc_time')?.value;
    const spotsTotal = document.getElementById('mc_spots')?.value;
    const hcpMin = document.getElementById('mc_hcpMin')?.value;
    const hcpMax = document.getElementById('mc_hcpMax')?.value;
    const fee = null;
    const note = document.getElementById('mc_note')?.value;
    if (!course) { toastError('골프장을 선택하세요'); return; }
    if (!matchDate) { toastError('날짜를 선택하세요'); return; }
    showLoading();
    const r = await createMatch({ course, matchDate, teeTime, spotsTotal, hcpMin, hcpMax, fee, note });
    hideLoading();
    if (r.error) { showError(r.error, '매치 등록'); return; }
    toastSuccess('매치 등록 완료!');
    pushView({ type: 'matchDetail', params: { id: r.data.id } });
  },
  onMatchCourseSelectChange() {
    const sel = document.getElementById('mc_course');
    if (!sel) return;
    const reg = document.getElementById('mc_courseRegion')?.value || '';
    const all = window.__matchCoursesByRegion || {};
    const list = reg ? (all[reg] || []) : Object.values(all).flat();
    const found = list.find(c => c.name === sel.value);
    const dual = document.getElementById('mc_dualCourseBlock');
    if (!dual) return;
    if (found && Array.isArray(found.course_names) && found.course_names.length >= 2) {
      dual.style.display = 'block';
      const opts1 = '<option value="">— 1st 9 —</option>' + found.course_names.map(k => '<option value="' + k + '">' + k + '</option>').join('');
      const opts2 = '<option value="">— 2nd 9 —</option>' + found.course_names.map(k => '<option value="' + k + '">' + k + '</option>').join('');
      document.getElementById('mc_courseKey1').innerHTML = opts1;
      document.getElementById('mc_courseKey2').innerHTML = opts2;
    } else {
      dual.style.display = 'none';
    }
  },
  onMatchCourseRegionChange() {
    const reg = document.getElementById('mc_courseRegion')?.value || '';
    const sel = document.getElementById('mc_course');
    if (!sel) return;
    const all = window.__matchCoursesByRegion || {};
    const list = reg ? (all[reg] || []) : Object.values(all).flat();
    sel.innerHTML = '<option value="">— 골프장 선택 —</option>' +
      list.map(c => {
        const sub = c.district ? ' (' + c.district + ')' : '';
        const safe = c.name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        return '<option value="' + safe + '">' + safe + sub + '</option>';
      }).join('');
  },
  async applyMatch(matchId) {
    if (!await confirmDialog('참가 신청하시겠어요?\n호스트가 승인하면 확정됩니다.', { title: '참가 신청' })) return;
    showLoading();
    const r = await applyMatch(matchId);
    hideLoading();
    if (r.error) { showError(r.error, '신청'); return; }
    toastSuccess('신청 완료! 호스트 승인 대기 중');
    renderApp();
  },
  async approveMatchApp(matchId, userId) {
    showLoading();
    const r = await approveMatchApply(matchId, userId);
    hideLoading();
    if (r.error) { showError(r.error, '승인'); return; }
    toastSuccess('승인 완료');
    renderApp();
  },
  async rejectMatchApp(matchId, userId) {
    if (!await confirmDialog('신청을 거절하시겠어요?', { title: '신청 거절', danger: true, okLabel: '거절' })) return;
    showLoading();
    const r = await rejectMatchApply(matchId, userId);
    hideLoading();
    if (r.error) { showError(r.error, '거절'); return; }
    toastSuccess('거절됨');
    renderApp();
  },
  async cancelMyMatchApp(matchId) {
    if (!await confirmDialog('참가 신청을 취소하시겠어요?', { title: '취소', danger: true, okLabel: '취소' })) return;
    showLoading();
    const r = await cancelMyMatchApply(matchId);
    hideLoading();
    if (r.error) { showError(r.error, '취소'); return; }
    toastSuccess('취소됨');
    renderApp();
  },
  
  // 개인 라운드
  goMyRounds() { pushView({ type: 'myRounds' }); },
  goRoundAdd() { pushView({ type: 'roundAdd' }); },
  onRoundCourseRegionChange() {
    const reg = document.getElementById('ra_courseRegion')?.value || '';
    const sel = document.getElementById('ra_course');
    if (!sel) return;
    const all = window.__roundCoursesByRegion || {};
    const list = reg ? (all[reg] || []) : Object.values(all).flat();
    sel.innerHTML = '<option value="">— 골프장 선택 —</option>' +
      list.map(c => {
        const sub = c.district ? ' (' + c.district + ')' : '';
        const safe = c.name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        return '<option value="' + safe + '">' + safe + sub + '</option>';
      }).join('');
  },
  calcRoundTotal() {
    let sum = 0;
    for (let i = 1; i <= 18; i++) {
      const v = parseInt(document.getElementById('ra_h' + i)?.value);
      if (isNaN(v)) { toast('18홀 모두 입력해야 자동합산'); return; }
      sum += v;
    }
    const t = document.getElementById('ra_total');
    if (t) t.value = sum;
    toast('합계 ' + sum + ' 자동 입력');
  },
  async doAddRound() {
    const cs = document.getElementById('ra_course')?.value;
    const cm = document.getElementById('ra_courseManual')?.value?.trim();
    const course = cs || cm;
    const playedAt = document.getElementById('ra_date')?.value;
    const total = document.getElementById('ra_total')?.value;
    const holes = [];
    let af = true;
    for (let i = 1; i <= 18; i++) {
      const v = parseInt(document.getElementById('ra_h' + i)?.value);
      if (isNaN(v)) { af = false; break; }
      holes.push(v);
    }
    if (!course) { toastError('골프장 선택'); return; }
    if (!playedAt) { toastError('날짜 선택'); return; }
    if (!total) { toastError('총 스코어 입력'); return; }
    showLoading();
    const r = await addPersonalRound({ course, playedAt, total, holes: af ? holes : null });
    hideLoading();
    if (r.error) { showError(r.error, '라운드 등록'); return; }
    toastSuccess('라운드 등록!');
    popViewSafe();
  },
  async deleteMyRound(roundId) {
    if (!await confirmDialog('이 라운드를 삭제하시겠어요?', { title: '삭제', danger: true, okLabel: '삭제' })) return;
    showLoading();
    const r = await deleteRound(roundId);
    hideLoading();
    if (r.error) { showError(r.error, '삭제'); return; }
    toastSuccess('삭제됨');
    renderApp();
  }
});

init().catch(e => {
  console.error('[main] init failed', e);
  document.getElementById('app').innerHTML = `<div class="card"><h2 style="color:#d32f2f;">초기화 실패</h2><p>${e.message}</p><button class="btn btn-primary" onclick="location.reload()">새로고침</button></div>`;
});


// ============ EN 자동 swap 활성화 (페이지 전환 시) ============
import('./core/i18n.js').then(mod => {
  try { mod.setupAutoSwap && mod.setupAutoSwap(); } catch (e) { console.warn('autoSwap init failed', e); }
}).catch(() => {});


// nav-spinner-popstate — back/forward 버튼에 spinner 트리거
(() => {
  let _navHideTimer = null;
  window.addEventListener('popstate', () => {
    try {
      const fn = (typeof showLoading === 'function') ? showLoading : (window._gd && window._gd.showLoading);
      const hideFn = (typeof hideLoading === 'function') ? hideLoading : (window._gd && window._gd.hideLoading);
      if (fn) fn();
      clearTimeout(_navHideTimer);
      _navHideTimer = setTimeout(() => { if (hideFn) hideFn(); }, 800);
    } catch (e) {}
  });
})();


// default-signin-on-load — 앱 첫 진입 시 session 없으면 signIn으로 (home의 게스트 모드 → sign-in 화면)
window.addEventListener('load', async () => {
  await new Promise(r => setTimeout(r, 400)); // session 로드 + view init 완료 대기
  try {
    const [{ getSession }, { resetTo, getCurrentView }] = await Promise.all([
      import('./core/auth.js'),
      import('./core/router.js')
    ]);
    const session = getSession();
    if (!session || !session.user) {
      const cur = getCurrentView();
      if (cur && cur.type === 'home') {
        resetTo({ type: 'signIn' });
      }
    }
  } catch (e) { console.warn('default view fix failed', e); }
});


// global-lang-toggle — 모든 화면 우상단 KO/EN 토글 (sign-in 등에서도 영문 전환 가능). home view에선 기존 토글과 중복이라 숨김.
(async () => {
  try {
    const { getLang, setLang } = await import('./core/i18n.js');
    const { onChange, getCurrentView } = await import('./core/router.js');
    const btn = document.createElement('button');
    btn.id = 'global-lang-toggle';
    btn.style.cssText = 'position:fixed;top:14px;right:14px;background:rgba(46,125,50,0.92);color:white;border:none;border-radius:18px;padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
    const updateLabel = () => {
      btn.textContent = (getLang() === 'en') ? '🌐 KO' : '🌐 EN';
    };
    const updateVisibility = () => {
      try {
        const cur = getCurrentView();
        // home view엔 이미 우상단에 토글 있음 → 글로벌 토글 숨김
        (async () => {
        try {
          const { getSession } = await import('./core/auth.js');
          const sess = getSession();
          // session 있는 회원이 home에 있을 때만 숨김 (home 자체 토글 사용). 그 외는 항상 표시.
          if (sess && sess.user && cur && cur.type === 'home') {
            btn.style.display = 'none';
          } else {
            btn.style.display = 'block';
          }
        } catch (e) { btn.style.display = 'block'; }
      })();
      } catch (e) { btn.style.display = 'block'; }
    };
    btn.onclick = () => {
      const cur = getLang();
      setLang(cur === 'en' ? 'ko' : 'en');
      updateLabel();
      // 즉시 swap 적용을 위해 reload (가장 단순하고 안정적)
      location.reload();
    };
    document.body.appendChild(btn);
    updateLabel();
    updateVisibility();
    if (onChange) onChange(updateVisibility);
  } catch (e) { console.warn('global lang toggle init failed', e); }
})();


// ─────── 회장용 골프장 Par 편집 (Par fix 2026-05-28) ───────
async function doOpenLeaderParEditor(eventId) {
  const sb = window._sb || window.sb;
  if (!sb) { alert('Supabase 클라이언트 없음'); return; }
  const { data: ev, error } = await sb.from('events')
    .select('id,name,course,hole_pars,club_id').eq('id', eventId).maybeSingle();
  if (error || !ev) { alert('이벤트 조회 실패'); return; }

  const pars = Array.isArray(ev.hole_pars) ? ev.hole_pars : new Array(18).fill(null);
  const inputsHtml = pars.map((p, i) =>
    `<div style="display:inline-block;width:46px;margin:2px;text-align:center;">
       <div style="font-size:10px;color:#888;">${i + 1}</div>
       <input id="lp_${i}" type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="1"
              value="${p ?? ''}" style="width:38px;padding:4px;text-align:center;border:1px solid #ccc;border-radius:4px;font-size:14px;" />
     </div>`).join('');

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:20px;max-width:520px;width:100%;max-height:90vh;overflow:auto;">
      <h3 style="margin:0 0 8px 0;">🏌️ 이번 라운드 Par 입력</h3>
      <div style="font-size:13px;color:#666;margin-bottom:12px;">${ev.name} — ${ev.course || '(골프장 미정)'}</div>
      <div style="margin-bottom:12px;">${inputsHtml}</div>
      <label style="display:flex;gap:8px;align-items:center;font-size:13px;color:#555;margin-bottom:14px;">
        <input type="checkbox" id="lp_sync_master" />
        이 Par를 골프장 마스터에도 반영 (다음 라운드부터 자동 적용)
      </label>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button id="lp_cancel" style="padding:8px 14px;border:1px solid #ccc;background:#fff;border-radius:6px;cursor:pointer;">취소</button>
        <button id="lp_save" style="padding:8px 14px;border:0;background:#1d6f42;color:#fff;border-radius:6px;cursor:pointer;">저장</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  modal.querySelector('#lp_cancel').onclick = () => modal.remove();
  modal.querySelector('#lp_save').onclick = async () => {
    const newPars = [];
    for (let i = 0; i < 18; i++) {
      const v = parseInt(document.getElementById('lp_' + i).value, 10);
      newPars.push(Number.isFinite(v) && v >= 3 && v <= 6 ? v : null);
    }
    if (newPars.some(p => p == null)) {
      if (!confirm('일부 홀이 비어있어. 그대로 저장할까?')) return;
    }
    const { error: e1 } = await sb.from('events').update({ hole_pars: newPars }).eq('id', eventId);
    if (e1) { alert('저장 실패: ' + e1.message); return; }

    if (modal.querySelector('#lp_sync_master').checked && ev.course) {
      const { error: e2 } = await sb.from('golf_courses')
        .update({ pars: { main: newPars } })
        .ilike('name', ev.course);
      if (e2) console.warn('master sync failed', e2);
    }
    alert('저장 완료');
    modal.remove();
    location.reload();
  };
}

if (window._gd) window._gd.doOpenLeaderParEditor = doOpenLeaderParEditor;
else window._gd = { doOpenLeaderParEditor };


// ─────── Par 직접 입력 버튼 자동 삽입 (회장/슈퍼관리자) (Par fix v3 2026-05-28) ───────
(function () {
  let injectedFor = null;
  const sb = () => window._sb || window.sb;

  async function tryInject() {
    const hintEl = Array.from(document.querySelectorAll('div,p,span,small'))
      .find(el => el.children.length === 0 && el.textContent && el.textContent.includes('Par 정보가 없으면'));
    if (!hintEl) return;

    // URL hash에서 eventId 추출 시도 (다양한 패턴)
    const hash = location.hash || '';
    let eventId = null;
    const patterns = [
      /eventScore[\/\-_:]([0-9a-f-]{8,})/i,
      /event[\/\-_:]([0-9a-f-]{8,})/i,
      /#\/?([0-9a-f-]{36})/i,
    ];
    for (const p of patterns) { const m = hash.match(p); if (m) { eventId = m[1]; break; } }

    // hash로 못 찾으면 이벤트 이름으로 DB 조회 (헤더에 표시된 이벤트명)
    if (!eventId) {
      const headerEl = document.querySelector('h1,h2,h3,.card div,.event-name');
      const card = Array.from(document.querySelectorAll('div')).find(el => el.textContent && el.textContent.includes('·') && el.children.length === 0);
      if (card) {
        const evName = card.textContent.split('·')[0].trim();
        if (evName) {
          try {
            const { data } = await sb().from('events').select('id').eq('name', evName).order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (data) eventId = data.id;
          } catch (e) {}
        }
      }
    }
    if (!eventId || injectedFor === eventId) return;

    // 권한 체크
    let isAllowed = false;
    try {
      const sess = (await sb().auth.getSession()).data.session;
      if (!sess) return;
      const { data: prof } = await sb().from('profiles').select('is_super_admin').eq('id', sess.user.id).maybeSingle();
      if (prof?.is_super_admin) { isAllowed = true; }
      else {
        const { data: ev } = await sb().from('events').select('club_id').eq('id', eventId).maybeSingle();
        if (ev?.club_id) {
          const { data: cm } = await sb().from('club_members').select('role').eq('club_id', ev.club_id).eq('user_id', sess.user.id).maybeSingle();
          if (cm && (cm.role === 'leader' || cm.role === 'co_leader')) isAllowed = true;
        }
      }
    } catch (e) { console.warn('perm check failed', e); return; }
    if (!isAllowed) return;

    // 기존 버튼 있으면 skip
    if (document.getElementById('leader-par-fab')) { injectedFor = eventId; return; }

    const btn = document.createElement('button');
    btn.id = 'leader-par-fab';
    btn.textContent = '🏌️ Par 직접 입력 (회장/슈퍼관리자)';
    btn.style.cssText = 'display:block;width:100%;margin:12px 0;padding:14px;background:#ff9500;color:#fff;border:0;border-radius:8px;font-size:15px;font-weight:bold;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);';
    btn.onclick = (e) => { e.preventDefault(); window._gd && window._gd.doOpenLeaderParEditor && window._gd.doOpenLeaderParEditor(eventId); };
    hintEl.parentNode.insertBefore(btn, hintEl);
    injectedFor = eventId;
  }

  // 페이지 변경 + DOM 변경 모두 트리거
  const obs = new MutationObserver(() => { setTimeout(tryInject, 100); });
  obs.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => { injectedFor = null; setTimeout(tryInject, 200); });
  setTimeout(tryInject, 500);
})();


// ─────── Par fab v4 (권한 체크 우회 + 디버깅 로그) 2026-05-28 ───────
(function () {
  let injectedFor = null;
  const sb = () => window._sb || window.sb;

  async function tryInject() {
    if (document.getElementById('leader-par-fab-v4')) return;
    const allEls = Array.from(document.querySelectorAll('div,p,span,small,b,i'));
    const hintEl = allEls.find(el =>
      el.children.length === 0 && el.textContent && el.textContent.includes('Par 정보가 없으면')
    );
    if (!hintEl) { return; }

    const hash = location.hash || '';
    const m = hash.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    const eventId = m ? m[0] : null;
    if (!eventId) { console.log('[par-fab v4] eventId not in URL hash:', hash); return; }
    if (injectedFor === eventId) return;

    const sess = (await sb().auth.getSession()).data.session;
    if (!sess) { console.log('[par-fab v4] not logged in'); return; }

    const btn = document.createElement('button');
    btn.id = 'leader-par-fab-v4';
    btn.textContent = '🏌️ Par 직접 입력 (회장/슈퍼관리자)';
    btn.style.cssText = 'display:block;width:100%;margin:12px 0;padding:14px;background:#ff9500;color:#fff;border:0;border-radius:8px;font-size:15px;font-weight:bold;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);';
    btn.onclick = (e) => { e.preventDefault(); if (window._gd?.doOpenLeaderParEditor) window._gd.doOpenLeaderParEditor(eventId); else alert('doOpenLeaderParEditor 함수 없음'); };
    hintEl.parentNode.insertBefore(btn, hintEl);
    injectedFor = eventId;
    console.log('[par-fab v4] injected for', eventId);
  }

  const obs = new MutationObserver(() => setTimeout(tryInject, 100));
  obs.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => { injectedFor = null; setTimeout(tryInject, 200); });
  setTimeout(tryInject, 500);
  setTimeout(tryInject, 1500);
  setTimeout(tryInject, 3000);
})();

// ─── Proxy Member (대행 가입) 핸들러 2026-06-01 ───
(function () {
  if (typeof window === 'undefined') return;
  function ensureGd() {
    if (!window._gd) window._gd = {};
    return window._gd;
  }
  const gd = ensureGd();

  gd.openProxyMember = function (clubId) {
    const existing = document.getElementById('proxy-member-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'proxy-member-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10001;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;';
    modal.innerHTML =
      '<div style="background:white;border-radius:12px;max-width:480px;width:100%;padding:24px;margin-top:40px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">' +
          '<h2 style="margin:0;font-size:18px;color:#6a1b9a;">🤝 대행 가입</h2>' +
          '<button onclick="document.getElementById(\'proxy-member-modal\').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;">×</button>' +
        '</div>' +
        '<p style="font-size:13px;color:#666;margin-bottom:16px;line-height:1.5;">앱을 직접 사용하기 어려운 분(연로하신 분 등)의 가입을 회장이 대신 처리합니다. 본인 로그인은 발생하지 않으며 회장이 계속 관리합니다.</p>' +
        '<div style="margin-bottom:12px;">' +
          '<label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">닉네임 <span style="color:#d32f2f;">*</span></label>' +
          '<input id="pm-nickname" type="text" maxlength="30" placeholder="동호회에서 부르는 이름 (예: 김철수)" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">' +
        '</div>' +
        '<div style="margin-bottom:12px;">' +
          '<label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">본명</label>' +
          '<input id="pm-realname" type="text" maxlength="30" placeholder="(선택)" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">' +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-bottom:14px;">' +
          '<div style="flex:1;"><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">핸디캡</label><input id="pm-handicap" type="number" min="0" max="54" step="0.1" placeholder="예: 18.5" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;"></div>' +
          '<div style="flex:1;"><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">전화번호</label><input id="pm-phone" type="tel" maxlength="20" placeholder="(선택)" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;"></div>' +
        '</div>' +
        
        '<div style="display:flex;gap:8px;">' +
          '<button onclick="document.getElementById(\'proxy-member-modal\').remove()" style="flex:1;background:#eee;border:none;padding:12px;border-radius:6px;font-weight:600;cursor:pointer;">취소</button>' +
          '<button onclick="window._gd.doCreateProxyMember(\'' + clubId + '\')" style="flex:2;background:#7E57C2;color:white;border:none;padding:12px;border-radius:6px;font-weight:700;cursor:pointer;">✓ 가입 완료</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    setTimeout(function () { var i = document.getElementById('pm-nickname'); if (i) i.focus(); }, 50);
  };

  gd.doCreateProxyMember = async function (clubId) {
    const nick = (document.getElementById('pm-nickname')?.value || '').trim();
    const real = (document.getElementById('pm-realname')?.value || '').trim() || null;
    const hcpRaw = document.getElementById('pm-handicap')?.value;
    const hcp = (hcpRaw === '' || hcpRaw == null) ? null : parseFloat(hcpRaw);
    const phone = (document.getElementById('pm-phone')?.value || '').trim() || null;
    const joinEvents = !!document.getElementById('pm-joinevents')?.checked;
    if (!nick || nick.length < 2) { alert('닉네임은 2자 이상 입력해주세요'); return; }
    const sbMod = await import('./core/db.js');
    const ui = await import('./core/ui-kit.js');
    ui.showLoading && ui.showLoading();
    const { data, error } = await sbMod.sb.rpc('create_proxy_member', {
      p_club_id: clubId,
      p_nickname: nick,
      p_real_name: real,
      p_handicap: hcp,
      p_phone: phone,
      p_join_active_events: false
    });
    ui.hideLoading && ui.hideLoading();
    if (error) {
      (ui.toastError || alert)(error.message || '대행 가입 실패');
      return;
    }
    const joinedMsg = data?.joined_events ? ' (활동 ' + data.joined_events + '건 자동 참가)' : '';
    (ui.toastSuccess || alert)('🤝 ' + (data?.name || nick) + ' 대행 가입 완료' + joinedMsg);
    document.getElementById('proxy-member-modal')?.remove();
    setTimeout(function () {
      if (typeof gd.refreshView === 'function') gd.refreshView();
      else location.reload();
    }, 600);
  };
})();

// 활동 참가자 추가 (회장 전용) 2026-06-01
(function () {
  if (typeof window === 'undefined' || !window._gd) return;
  window._gd.openAddMemberToEvent = async function (eventId) {
    if (!eventId) return;
    const sbMod = await import('./core/db.js');
    const ui = await import('./core/ui-kit.js');
    ui.showLoading && ui.showLoading();
    const { data: ev } = await sbMod.sb.from('events').select('club_id, name').eq('id', eventId).maybeSingle();
    if (!ev || !ev.club_id) { ui.hideLoading && ui.hideLoading(); (ui.toastError || alert)('동호회 정보를 찾을 수 없음'); return; }
    const { data: members } = await sbMod.sb.from('club_members').select('user_id, profiles!club_members_user_id_fkey(id, name, handicap, created_by_proxy_uuid)').eq('club_id', ev.club_id).eq('status', 'approved');
    const { data: parts } = await sbMod.sb.from('event_participants').select('user_id').eq('event_id', eventId);
    ui.hideLoading && ui.hideLoading();
    const partSet = new Set((parts || []).map(p => p.user_id));
    const notIn = (members || []).filter(m => !partSet.has(m.user_id));
    const ex = document.getElementById('add-member-modal');
    if (ex) ex.remove();
    const modal = document.createElement('div');
    modal.id = 'add-member-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10001;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;';
    const esc = function (s) { return (s == null ? '' : String(s).replace(/[<>&"]/g, function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c];})); };
    const rows = notIn.length === 0
      ? '<p style="color:#888;text-align:center;padding:20px;">모든 동호회 멤버가 이미 이 활동에 참가 중입니다.</p>'
      : notIn.map(function (m) {
          const isProxy = !!(m.profiles && m.profiles.created_by_proxy_uuid);
          const proxyBadge = isProxy ? '<span style="background:#e1bee7;color:#6a1b9a;font-size:9px;padding:1px 5px;border-radius:4px;margin-left:4px;font-weight:600;">🤝 대행</span>' : '';
          const hcp = (m.profiles && m.profiles.handicap != null) ? ' · 핸디 ' + m.profiles.handicap : '';
          return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid #eee;">' +
            '<div><b>' + esc(m.profiles && m.profiles.name || '익명') + '</b>' + proxyBadge + '<span style="color:#888;font-size:12px;">' + hcp + '</span></div>' +
            '<button onclick="window._gd.doAddMemberToEvent(\'' + eventId + '\',\'' + m.user_id + '\')" style="background:#1976D2;color:white;border:none;padding:6px 12px;border-radius:4px;font-size:12px;cursor:pointer;">✓ 참가</button>' +
          '</div>';
        }).join('');
    modal.innerHTML =
      '<div style="background:white;border-radius:12px;max-width:480px;width:100%;padding:20px;margin-top:40px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
          '<h2 style="margin:0;font-size:17px;">➕ 활동에 참가시키기</h2>' +
          '<button onclick="document.getElementById(\'add-member-modal\').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;">×</button>' +
        '</div>' +
        '<p style="font-size:12px;color:#888;margin:0 0 12px;">' + esc(ev.name || '') + ' · 미참가 멤버 ' + notIn.length + '명</p>' +
        rows +
      '</div>';
    document.body.appendChild(modal);
  };
  window._gd.doAddMemberToEvent = async function (eventId, userId) {
    const sbMod = await import('./core/db.js');
    const ui = await import('./core/ui-kit.js');
    ui.showLoading && ui.showLoading();
    const { error } = await sbMod.sb.rpc('add_event_participant_as_leader', {
      p_event_id: eventId,
      p_user_id: userId
    });
    ui.hideLoading && ui.hideLoading();
    if (error) { (ui.toastError || alert)(error.message || '참가 추가 실패'); return; }
    (ui.toastSuccess || alert)('✓ 참가시켰습니다');
    var m = document.getElementById('add-member-modal'); if (m) m.remove();
    setTimeout(function () {
      if (typeof window._gd.refreshView === 'function') window._gd.refreshView();
      else location.reload();
    }, 500);
  };
})();
