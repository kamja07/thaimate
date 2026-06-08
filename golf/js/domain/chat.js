// domain/chat.js — 1:1 인앱 채팅 (동반자 모집/장터/직접)
import { sb, query, mutate } from '../core/db.js';
import { getSession } from '../core/auth.js';

export async function loadMyRooms() {
  const session = getSession();
  if (!session) return { data: [], error: null };
  // 본인이 참가자인 모든 방 + 최근 메시지 + 상대 정보
  const { data: parts } = await sb.from('chat_participants')
    .select('room_id, last_read_at, chat_rooms(id, type, context_id, title, last_message_at, created_at)')
    .eq('user_id', session.user.id);
  if (!parts || !parts.length) return { data: [], error: null };
  
  const rooms = parts.map(p => p.chat_rooms).filter(Boolean);
  // 정렬
  rooms.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
  
  // 각 방의 상대 참가자 + 마지막 메시지
  for (const r of rooms) {
    const { data: otherParts } = await sb.from('chat_participants')
      .select('user_id, profiles(id, name)')
      .eq('room_id', r.id)
      .neq('user_id', session.user.id);
    r._others = otherParts || [];
    
    const { data: lastMsg } = await sb.from('chat_messages')
      .select('content, sender_id, sent_at')
      .eq('room_id', r.id)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    r._lastMsg = lastMsg;
    
    // unread count
    const myPart = parts.find(p => p.room_id === r.id);
    if (myPart?.last_read_at) {
      const { count } = await sb.from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', r.id)
        .gt('sent_at', myPart.last_read_at);
      r._unread = count || 0;
    } else {
      const { count } = await sb.from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', r.id);
      r._unread = count || 0;
    }
  }
  
  return { data: rooms, error: null };
}

export async function loadRoom(roomId) {
  return await query(sb.from('chat_rooms').select('*').eq('id', roomId).maybeSingle());
}

export async function loadMessages(roomId, limit = 100) {
  const { data, error } = await sb.from('chat_messages')
    .select('id, sender_id, content, sent_at, profiles!chat_messages_sender_id_fkey(name)')
    .eq('room_id', roomId)
    .order('sent_at', { ascending: true })
    .limit(limit);
  return { data: data || [], error };
}

export async function sendMessage(roomId, content) {
  const session = getSession();
  if (!session) return { error: new Error('로그인 필요') };
  if (!content?.trim()) return { error: new Error('내용 비어있음') };
  
  const { data, error, rls } = await mutate(
    sb.from('chat_messages').insert({
      room_id: roomId,
      sender_id: session.user.id,
      content: content.trim()
    }),
    { rlsMessage: '메시지 전송 실패' }
  );
  if (!error) {
    // last_message_at 업데이트
    await sb.from('chat_rooms').update({ last_message_at: new Date().toISOString() }).eq('id', roomId);
  }
  return { data: data?.[0], error, rls };
}

export async function markRoomRead(roomId) {
  const session = getSession();
  if (!session) return;
  await sb.from('chat_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('room_id', roomId).eq('user_id', session.user.id);
}

// 기존 방 찾기 또는 생성 (1:1)
export async function findOrCreate1on1(type, contextId, otherUserId, title) {
  const session = getSession();
  if (!session) return { error: new Error('로그인 필요') };
  const me = session.user.id;
  
  // 기존 방 검색 — chat_rooms 직접 (RLS로 본인이 참가자인 방만 보임)
  const { data: existingRooms } = await sb.from('chat_rooms')
    .select('id')
    .eq('type', type)
    .eq('context_id', contextId);
  
  for (const r of (existingRooms || [])) {
    // 이 방에 otherUser가 있는지
    const { data: parts } = await sb.from('chat_participants')
      .select('user_id')
      .eq('room_id', r.id);
    const ids = (parts || []).map(p => p.user_id).sort();
    const want = [me, otherUserId].sort();
    if (ids.length === 2 && ids[0] === want[0] && ids[1] === want[1]) {
      return { data: { id: r.id, existed: true }, error: null };
    }
  }
  
  // 신규 방 생성 — client에서 uuid 생성 (RLS 우회용)
  const roomId = crypto.randomUUID();
  
  // 1) 방 INSERT (.select() 없이 — RLS SELECT 우회)
  const { error: rErr } = await sb.from('chat_rooms').insert({
    id: roomId, type, context_id: contextId, title
  });
  if (rErr) return { error: rErr };
  
  // 2) 본인 참가자 먼저 INSERT (다음 SELECT부터는 본인 방으로 보임)
  const { error: pErr1 } = await sb.from('chat_participants').insert({
    room_id: roomId, user_id: me
  });
  if (pErr1) return { error: pErr1 };
  
  // 3) 상대 참가자 INSERT
  const { error: pErr2 } = await sb.from('chat_participants').insert({
    room_id: roomId, user_id: otherUserId
  });
  if (pErr2) return { error: pErr2 };
  
  return { data: { id: roomId, existed: false }, error: null };
}

export function subscribeRoom(roomId, onNewMessage) {
  return sb.channel('room:' + roomId)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: 'room_id=eq.' + roomId
    }, payload => {
      onNewMessage(payload.new);
    })
    .subscribe();
}


export async function loadUnreadCount() {
  const session = getSession();
  if (!session) return { count: 0 };
  const { data: parts } = await sb.from('chat_participants')
    .select('room_id, last_read_at')
    .eq('user_id', session.user.id);
  if (!parts || !parts.length) return { count: 0 };
  let total = 0;
  for (const p of parts) {
    let q = sb.from('chat_messages').select('id', { count: 'exact', head: true })
      .eq('room_id', p.room_id).neq('sender_id', session.user.id);
    if (p.last_read_at) q = q.gt('sent_at', p.last_read_at);
    const { count } = await q;
    total += count || 0;
  }
  return { count: total };
}

export function subscribeAllChatForUser(userId, onNewMessage) {
  return sb.channel('global-chat-' + userId)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages'
    }, async (payload) => {
      const msg = payload.new;
      if (!msg || msg.sender_id === userId) return;
      // 본인이 참가자인 방인지 확인
      const { data: part } = await sb.from('chat_participants')
        .select('user_id').eq('room_id', msg.room_id).eq('user_id', userId).maybeSingle();
      if (!part) return;
      onNewMessage(msg);
    })
    .subscribe();
}


export async function closeChatRoom(roomId) {
  const { error } = await sb.rpc('close_chat_room', { p_room: roomId });
  return { error };
}
