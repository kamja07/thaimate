// views/chatList.js — 내 채팅방 목록
import { loadMyRooms } from '../domain/chat.js';
import { getSession } from '../core/auth.js';
import { escapeHtml } from '../core/ui-kit.js';

export async function chatListView() {
  const session = getSession();
  if (!session) return '<div class="card"><button class="btn" onclick="window._gd.goBack()">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button><p style="margin-top:12px;text-align:center;color:#999;">로그인 후 이용 가능</p></div>';
  
  const { data: rooms } = await loadMyRooms();
  
  const cards = rooms.length === 0
    ? '<div class="card" style="text-align:center;color:#999;padding:32px;">채팅 내역이 없습니다.<br><br>동반자 모집이나 장터/나눔터에서 「💬 채팅」 버튼으로 시작하세요.</div>'
    : rooms.map(r => {
        const other = r._others?.[0]?.profiles;
        let lastTxt = r._lastMsg?.content || '(메시지 없음)'; if (lastTxt.startsWith('__SYS__:')) lastTxt = '⚠️ ' + lastTxt.replace(/^__SYS__:/, '');
        const lastTime = r._lastMsg?.sent_at ? new Date(r._lastMsg.sent_at).toLocaleString('ko-KR', {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
        const unreadBadge = r._unread > 0 ? `<span style="background:#d32f2f;color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">${r._unread}</span>` : '';
        const typeEmoji = r.type === 'match' ? '⛳' : r.type === 'market' ? '🛍️' : r.type === 'business' ? '🏢' : '💬';
        const typeText = r.type === 'match' ? '동반자 모집' : r.type === 'market' ? '장터/나눔터' : r.type === 'business' ? '회원사' : '직접';
        return `
          <div class="card" onclick="window._gd.openChatRoom('${r.id}')" style="cursor:pointer;">
            <div style="display:flex;justify-content:space-between;align-items:start;">
              <div style="flex:1;">
                <div style="font-weight:600;font-size:15px;">${typeEmoji} ${escapeHtml(other?.name || '대화 상대')}</div>
                <div style="font-size:11px;color:#999;margin-top:2px;">${typeText}${r.title ? ' · ' + escapeHtml(r.title) : ''}</div>
                <div style="font-size:13px;color:#666;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px;">${escapeHtml(lastTxt.substring(0,40))}${lastTxt.length>40?'...':''}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:11px;color:#999;">${lastTime}</div>
                <div style="margin-top:4px;">${unreadBadge}</div>
              </div>
            </div>
          </div>
        `;
      }).join('');
  
  return `
    <div class="card">
      <button class="btn" onclick="window._gd.goBack()" style="margin-bottom:12px;">← 뒤로</button><button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>
      <h2>💬 채팅</h2>
      <p style="color:#666;font-size:13px;">동반자 모집/장터/나눔터에서 시작된 1:1 대화</p>
    </div>
    ${cards}
  `;
}
