-- 꽃마중 데이터 구조
-- Supabase 왼쪽 메뉴의 SQL Editor에 이 파일 전체를 붙여 넣고 Run을 누르세요.
-- 여러 번 실행해도 안전합니다.

-- 1. 사용자별 세이브 데이터
create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.saves enable row level security;
grant select, insert, update on public.saves to authenticated;

drop policy if exists "saves_select_own" on public.saves;
create policy "saves_select_own" on public.saves
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "saves_insert_own" on public.saves;
create policy "saves_insert_own" on public.saves
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "saves_update_own" on public.saves;
create policy "saves_update_own" on public.saves
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 2. 하루 감정 횟수 기록 (사용자가 직접 읽거나 고칠 수 없음)
create table if not exists public.identify_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  n integer not null default 0,
  primary key (user_id, day)
);
create table if not exists public.identify_daily (
  day date primary key,
  n integer not null default 0
);
alter table public.identify_usage enable row level security;
alter table public.identify_daily enable row level security;
revoke all on public.identify_usage from anon, authenticated;
revoke all on public.identify_daily from anon, authenticated;

-- 3. 감정 한 번을 쓰기 전에 호출하는 관문
--    한 사람당 하루 20장, 전체 하루 500장을 넘으면 거절합니다.
--    한도를 바꾸려면 아래 두 숫자만 고쳐서 이 함수를 다시 실행하세요.
create or replace function public.claim_identify()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_limit constant integer := 20;
  total_limit constant integer := 500;
  who uuid := auth.uid();
  today date := (now() at time zone 'Asia/Seoul')::date;
  used integer;
begin
  if who is null then
    return 'auth';
  end if;

  insert into public.identify_usage as u (user_id, day, n)
  values (who, today, 1)
  on conflict (user_id, day) do update set n = u.n + 1
  where u.n < user_limit
  returning u.n into used;
  if used is null then
    return 'user_limit';
  end if;

  used := null;
  insert into public.identify_daily as d (day, n)
  values (today, 1)
  on conflict (day) do update set n = d.n + 1
  where d.n < total_limit
  returning d.n into used;
  if used is null then
    update public.identify_usage set n = n - 1 where user_id = who and day = today;
    return 'total_limit';
  end if;

  return 'ok';
end;
$$;
revoke all on function public.claim_identify() from public, anon;
grant execute on function public.claim_identify() to authenticated;

-- 4. 사진 보관함 (본인만 볼 수 있음, 1장 1MB, 1인 500장까지)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 1048576, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "photos_select_own" on storage.objects;
create policy "photos_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "photos_insert_own" on storage.objects;
create policy "photos_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      select count(*) from storage.objects o
      where o.bucket_id = 'photos'
        and (storage.foldername(o.name))[1] = auth.uid()::text
    ) < 500
  );

drop policy if exists "photos_delete_own" on storage.objects;
create policy "photos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
