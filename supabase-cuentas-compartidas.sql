-- Ejecutar una vez en el SQL Editor de tu proyecto Supabase (además de supabase.sql,
-- que debe haberse corrido ya).
--
-- Agrega el soporte para "compartir una cuenta": la cuenta sigue viviendo únicamente en
-- tu documento (finance_books, tabla de supabase.sql) — quien la creó sigue siendo su
-- dueño y la sigue viendo/editando como siempre. Lo que se agrega aquí es una forma de
-- que otra persona, con su propia cuenta de la app, se "linkee" a esa cuenta con un
-- código y pueda agregarle movimientos (solo gasto/ingreso directo) desde su propia
-- sesión, sin tener ningún acceso al resto de tu documento. Cada movimiento compartido
-- queda guardado aparte (shared_account_transactions) con quién lo creó, para que cada
-- persona solo pueda editar/eliminar los movimientos que ella misma agregó — ni el
-- dueño de la cuenta puede borrar los de la otra persona, ni al revés.
--
-- Decisiones de alcance (ver tests/pre-push-check.mjs, lote 2026-10-25):
-- - La persona invitada NO ve el historial de movimientos que ya existían antes de
--   unirse (eso se queda privado, dentro del documento del dueño); solo ve los
--   movimientos agregados -por cualquiera- a partir de que se unió. El SALDO que ve sí
--   es el real: el dueño sincroniza un "saldo base" (su parte privada) cada vez que
--   guarda su documento, y la app le suma los movimientos de la tabla compartida.
-- - La persona invitada solo puede agregar gasto/ingreso directo a la cuenta compartida
--   (no transferencias, pagos de tarjeta ni compras a MSI — eso sigue siendo exclusivo
--   del dueño, dentro de su propio documento).

create extension if not exists pgcrypto;

create table if not exists public.shared_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  account_id text not null,
  share_code text not null unique default encode(gen_random_bytes(5),'hex'),
  name text not null default '',
  type text not null default 'debit',
  currency text not null default 'MXN',
  color text not null default 'auto',
  base_balance bigint not null default 0,
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  unique(owner_user_id, account_id)
);
alter table public.shared_accounts enable row level security;

create table if not exists public.shared_account_members (
  shared_account_id uuid not null references public.shared_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (shared_account_id, user_id)
);
alter table public.shared_account_members enable row level security;

create table if not exists public.shared_account_transactions (
  id uuid primary key default gen_random_uuid(),
  shared_account_id uuid not null references public.shared_accounts(id) on delete cascade,
  creator_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('expense','income')),
  amount bigint not null check (amount>0),
  concept text not null default '',
  category text not null default '',
  date date not null,
  created_at timestamptz not null default now()
);
alter table public.shared_account_transactions enable row level security;

-- Dueño o miembro ya aceptado de esa cuenta compartida (security definer: para poder
-- consultar shared_account_members sin que sus propias políticas, que dependen de esta
-- misma función, se vuelvan circulares).
create or replace function public.is_shared_account_participant(p_shared_account_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.shared_accounts sa where sa.id=p_shared_account_id and sa.owner_user_id=auth.uid()
  ) or exists(
    select 1 from public.shared_account_members m where m.shared_account_id=p_shared_account_id and m.user_id=auth.uid()
  );
$$;

drop policy if exists participant_read on public.shared_accounts;
create policy participant_read on public.shared_accounts for select to authenticated
  using (owner_user_id=auth.uid() or public.is_shared_account_participant(id));
drop policy if exists owner_write on public.shared_accounts;
create policy owner_write on public.shared_accounts for all to authenticated
  using (owner_user_id=auth.uid()) with check (owner_user_id=auth.uid());

drop policy if exists participant_read on public.shared_account_members;
create policy participant_read on public.shared_account_members for select to authenticated
  using (user_id=auth.uid() or exists(select 1 from public.shared_accounts sa where sa.id=shared_account_id and sa.owner_user_id=auth.uid()));
drop policy if exists owner_or_self_remove on public.shared_account_members;
create policy owner_or_self_remove on public.shared_account_members for delete to authenticated
  using (user_id=auth.uid() or exists(select 1 from public.shared_accounts sa where sa.id=shared_account_id and sa.owner_user_id=auth.uid()));

drop policy if exists participant_read on public.shared_account_transactions;
create policy participant_read on public.shared_account_transactions for select to authenticated
  using (public.is_shared_account_participant(shared_account_id));
drop policy if exists participant_insert on public.shared_account_transactions;
create policy participant_insert on public.shared_account_transactions for insert to authenticated
  with check (creator_user_id=auth.uid() and public.is_shared_account_participant(shared_account_id));
drop policy if exists creator_update on public.shared_account_transactions;
create policy creator_update on public.shared_account_transactions for update to authenticated
  using (creator_user_id=auth.uid()) with check (creator_user_id=auth.uid());
drop policy if exists creator_delete on public.shared_account_transactions;
create policy creator_delete on public.shared_account_transactions for delete to authenticated
  using (creator_user_id=auth.uid());

revoke all on public.shared_accounts, public.shared_account_members, public.shared_account_transactions from anon, authenticated;
grant select, insert, update, delete on public.shared_accounts to authenticated;
grant select, delete on public.shared_account_members to authenticated;
grant select, insert, update, delete on public.shared_account_transactions to authenticated;

-- La persona invitada no puede ver shared_accounts por código bajo las políticas de
-- arriba (todavía no es ni dueña ni miembro), así que unirse pasa por esta función con
-- permisos elevados: valida el código y, si es válido, la agrega como miembro.
create or replace function public.join_shared_account(p_code text)
returns table(id uuid, owner_user_id uuid, account_id text, name text, type text, currency text, color text, base_balance bigint)
language plpgsql security definer set search_path='' as $$
declare v_row public.shared_accounts;
begin
  if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
  select * into v_row from public.shared_accounts where share_code=lower(trim(p_code)) and not revoked;
  if v_row.id is null then raise exception 'CODIGO_INVALIDO'; end if;
  if v_row.owner_user_id=auth.uid() then raise exception 'ES_TU_PROPIA_CUENTA'; end if;
  insert into public.shared_account_members(shared_account_id,user_id) values(v_row.id,auth.uid())
    on conflict do nothing;
  return query select v_row.id,v_row.owner_user_id,v_row.account_id,v_row.name,v_row.type,v_row.currency,v_row.color,v_row.base_balance;
end $$;
revoke all on function public.join_shared_account(text) from public,anon;
grant execute on function public.join_shared_account(text) to authenticated;

do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='shared_accounts') then
  alter publication supabase_realtime add table public.shared_accounts;
 end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='shared_account_transactions') then
  alter publication supabase_realtime add table public.shared_account_transactions;
 end if;
end $$;
