-- ============================================================================
-- 슈퍼관리자(Danny / app_admins) = 모든 동호회에서 방장 권한 + 입장
-- 핵심 헬퍼(is_club_leader/member/staff)에 or public.is_admin() 추가 →
-- 이 함수들을 쓰는 모든 RLS(clubs·club_members·activities·notices·events·awards)가 관리자 허용.
-- 직접 leader_id를 검사하는 관리 RPC(set_role/kick/set_notice)도 관리자 허용.
-- ============================================================================

create or replace function public.is_club_leader(p_club uuid)
returns boolean language sql security definer set search_path=public as $fn$
  select exists(select 1 from clubs where id=p_club and leader_id=auth.uid()) or public.is_admin();
$fn$;

create or replace function public.is_club_member(p_club uuid)
returns boolean language sql security definer set search_path=public as $fn$
  select exists(select 1 from club_members where club_id=p_club and user_id=auth.uid() and status='approved') or public.is_admin();
$fn$;

create or replace function public.is_club_staff(p_club uuid)
returns boolean language sql security definer set search_path=public as $fn$
  select exists(select 1 from clubs where id=p_club and leader_id=auth.uid())
      or exists(select 1 from club_members where club_id=p_club and user_id=auth.uid() and role in ('leader','vice') and status='approved')
      or public.is_admin();
$fn$;

-- 방장 전용: 역할 지정/해제 (관리자도 허용)
create or replace function public.club_set_role(p_club uuid, p_user uuid, p_role text)
returns void language plpgsql security definer set search_path=public as $fn$
begin
  if not (exists(select 1 from clubs where id=p_club and leader_id=auth.uid()) or public.is_admin()) then raise exception 'not_leader'; end if;
  if p_role not in ('vice','member') then raise exception 'bad_role'; end if;
  if p_user=(select leader_id from clubs where id=p_club) then raise exception 'cannot_change_leader'; end if;
  update club_members set role=p_role where club_id=p_club and user_id=p_user and status='approved';
end; $fn$;

-- 방장 전용: 강퇴 (관리자도 허용)
create or replace function public.club_kick(p_club uuid, p_user uuid)
returns void language plpgsql security definer set search_path=public as $fn$
begin
  if not (exists(select 1 from clubs where id=p_club and leader_id=auth.uid()) or public.is_admin()) then raise exception 'not_leader'; end if;
  if p_user=(select leader_id from clubs where id=p_club) then raise exception 'cannot_kick_leader'; end if;
  delete from club_members where club_id=p_club and user_id=p_user;
end; $fn$;

-- 운영진: 공지 지정/해제 (관리자도 허용)
create or replace function public.club_set_notice(p_club uuid, p_notice text)
returns void language plpgsql security definer set search_path=public as $fn$
begin
  if not (exists(select 1 from clubs where id=p_club and leader_id=auth.uid())
       or exists(select 1 from club_members where club_id=p_club and user_id=auth.uid() and role in ('leader','vice') and status='approved')
       or public.is_admin()) then
    raise exception 'not_staff';
  end if;
  update clubs set notice = nullif(btrim(coalesce(p_notice,'')),'') where id=p_club;
end; $fn$;
