// views/chatRoom.js — 1:1 chat + Realtime
import { loadRoom, loadMessages, sendMessage, markRoomRead, subscribeRoom } from '../domain/chat.js';
import { getSession } from '../core/auth.js';
import { escapeHtml } from '../core/ui-kit.js';

let _currentChannel = null;

function unsubscribePrevious() {
  if (_currentChannel) {
    try { _currentChannel.unsubscribe(); } catch(_) {}
    _currentChannel = null;
  }
}

function renderMessages(msgs, myId) {
  if (!msgs.length) return '<div style="text-align:center;color:#999;padding:24px;">메시지를 시작해보세요</div>';
  return msgs.map(m => {
    if (m.content && m.content.startsWith('__SYS__:')) {
      const txt = m.content.replace(/^__SYS__:/, '');
      return '<div style="text-align:center;margin:12px 0;"><span style="background:#FFF3E0;color:#e65100;padding:6px 14px;border-radius:14px;font-size:12px;border:1px solid #FFCC80;">' + escapeHtml(txt) + '</span></div>';
    }
    const mine = m.sender_id === myId;
    const time = new Date(m.sent_at).toLocaleTimeString('ko-KR', {hour:'2-digit',minute:'2-digit'});
    const senderName = (m.profiles && m.profiles.name) || '';
    return '<div style="display:flex;justify-content:' + (mine?'flex-end':'flex-start') + ';margin-bottom:8px;">' +
      '<div style="max-width:75%;">' +
      (!mine ? '<div style="font-size:10px;color:#666;margin-bottom:2px;">' + escapeHtml(senderName) + '</div>' : '') +
      '<div style="display:flex;align-items:flex-end;gap:6px;' + (mine?'flex-direction:row-reverse;':'') + '">' +
      '<div style="background:' + (mine?'#2E7D32':'#f0f0f0') + ';color:' + (mine?'white':'#333') + ';padding:8px 12px;border-radius:14px;font-size:14px;word-break:break-word;">' + escapeHtml(m.content) + '</div>' +
      '<div style="font-size:10px;color:#999;">' + time + '</div>' +
      '</div></div></div>';
  }).join('');
}

export async function chatRoomView(params) {
  const roomId = params && params.id;
  if (!roomId) return '<div class="card">roomId 필수</div>';

  const session = getSession();
  if (!session) return '<div class="card"><button class="btn" onclick="window._gd.goBack()">&larr; 뒤로</button><p>로그인 후 이용</p></div>';

  const { data: room } = await loadRoom(roomId);
  const { data: msgs } = await loadMessages(roomId);

  await markRoomRead(roomId);

  unsubscribePrevious();
  setTimeout(() => {
    _currentChannel = subscribeRoom(roomId, async (newMsg) => {
      const { data: latest } = await loadMessages(roomId);
      const cont = document.getElementById('chatMsgs_' + roomId);
      if (cont) {
        cont.innerHTML = renderMessages(latest, session.user.id);
        cont.scrollTop = cont.scrollHeight;
      }
      await markRoomRead(roomId);
    });
  }, 100);

  const titleText = (room && room.title) || '대화';

  return '<div class="card" style="margin-bottom:8px;">' +
    '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
    '<button class="btn" onclick="window._gd.goBack()" style="font-size:12px;padding:6px 10px;">&larr; 뒤로</button>' +
    '<button onclick="window._gd.goHome()" style="background:none;border:none;padding:4px 6px;cursor:pointer;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;" aria-label="홈"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0288D1"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/></svg></button>' +
    '<h3 style="margin:0;flex:1;font-size:15px;">' + escapeHtml(titleText) + '</h3>' +
    '<button class="btn" onclick="window._gd.doCloseChat(\'' + roomId + '\')" style="font-size:12px;padding:6px 10px;color:#d32f2f;border:1px solid #d32f2f;">종료</button>' +
    '</div></div>' +
    '<div class="card" style="padding:12px;">' +
    '<div id="chatMsgs_' + roomId + '" style="min-height:300px;max-height:60vh;overflow-y:auto;padding:8px;background:#fafafa;border-radius:6px;">' +
    renderMessages(msgs, session.user.id) +
    '</div>' +
    '<div style="display:flex;gap:6px;margin-top:10px;">' +
    '<input id="chatInput_' + roomId + '" type="text" placeholder="메시지" style="flex:1;padding:10px;border:1px solid var(--border);border-radius:6px;font-size:14px;" onkeydown="if(event.key===\'Enter\'){window._gd.doSendChat(\'' + roomId + '\')}">' +
    '<button class="btn btn-primary" onclick="window._gd.doSendChat(\'' + roomId + '\')" style="font-size:14px;padding:10px 16px;">전송</button>' +
    '</div></div>';
}
