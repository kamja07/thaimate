-- 문의·신고 답변 기능: reports 테이블에 답변 컬럼 추가 + RLS 정책
-- Supabase SQL 에디터에서 1회 실행

alter table reports add column if not exists admin_reply text;
alter table reports add column if not exists answered_at timestamptz;

-- 본인은 자기가 보낸 문의/신고를 조회 가능(앱에서 답변 확인용)
drop policy if exists reports_select_own on reports;
create policy reports_select_own on reports for select
  using (reporter_id = auth.uid());

-- 관리자(app_admins)는 모든 reports 조회·수정 가능(완료 처리·답변 저장)
drop policy if exists reports_admin_manage on reports;
create policy reports_admin_manage on reports for all
  using (exists (select 1 from app_admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from app_admins a where a.user_id = auth.uid()));
