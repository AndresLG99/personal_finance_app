-- Ejecutar una vez en SQL Editor del proyecto Supabase.
-- El documento se guarda atómicamente en PostgreSQL, por usuario y con versión.
create table if not exists public.finance_books (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{"accounts":[],"transactions":[],"rules":[]}',
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  constraint valid_book check (jsonb_typeof(payload->'accounts')='array' and jsonb_typeof(payload->'transactions')='array' and jsonb_typeof(payload->'rules')='array')
);
alter table public.finance_books enable row level security;
drop policy if exists owner_read on public.finance_books;
create policy owner_read on public.finance_books for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.finance_books from anon, authenticated;
grant select on public.finance_books to authenticated;
create or replace function public.save_finance_book(p_payload jsonb,p_revision bigint)
returns bigint language plpgsql security definer set search_path='' as $$
declare v_user uuid := auth.uid(); v_revision bigint;
begin
  if v_user is null then raise exception 'UNAUTHORIZED'; end if;
  if p_payload is null or jsonb_typeof(p_payload->'accounts') is distinct from 'array'
     or jsonb_typeof(p_payload->'transactions') is distinct from 'array'
     or jsonb_typeof(p_payload->'rules') is distinct from 'array'
     or octet_length(p_payload::text)>5000000 then raise exception 'INVALID_DATA'; end if;
  if p_revision=0 then
    insert into public.finance_books(user_id,payload,revision) values(v_user,p_payload,1)
    on conflict do nothing returning revision into v_revision;
  else
    update public.finance_books set payload=p_payload,revision=revision+1,updated_at=now()
    where user_id=v_user and revision=p_revision returning revision into v_revision;
  end if;
  if v_revision is null then raise exception 'CONFLICT'; end if;
  return v_revision;
end $$;
revoke all on function public.save_finance_book(jsonb,bigint) from public,anon;
grant execute on function public.save_finance_book(jsonb,bigint) to authenticated;
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='finance_books') then
  alter publication supabase_realtime add table public.finance_books;
 end if;
end $$;
