-- Ejecutar una vez en el SQL Editor de tu proyecto Supabase (después de supabase.sql y
-- supabase-cuentas-compartidas.sql, que deben haberse corrido ya).
--
-- Agrega el perfil de usuario: nombre, apellido, teléfono (con código de país) y foto de
-- perfil. El correo y la contraseña NO viven aquí — el correo ya está en tu sesión
-- (auth.users) y la contraseña se cambia con auth.updateUser(), que ya usábamos para
-- "recuperar contraseña"; esta tabla es solo para los datos nuevos.
--
-- Por qué una tabla aparte y no solo "user_metadata" de Supabase Auth: tus propios datos
-- los podrías guardar directo en tu metadata de auth.users, pero esa tabla no se puede
-- consultar sobre OTRA persona desde el cliente (por diseño, para seguridad). Cuando en el
-- siguiente lote mostremos en "Movimientos compartidos" la foto/nombre de quien agregó
-- cada movimiento, vamos a necesitar leer el perfil de otra persona — por eso esta tabla
-- vive en public con sus propios permisos: cada quien ve y edita su propio perfil, y
-- además puede ver (solo lectura) el perfil de alguien con quien comparte al menos una
-- cuenta (ver is_shared_account_participant en supabase-cuentas-compartidas.sql). Nadie
-- más puede ver tu nombre, teléfono o foto.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  phone_country_code text not null default '+52',
  phone_number text not null default '',
  avatar_url text,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- true si auth.uid() y p_other comparten al menos una cuenta compartida (cualquiera sea
-- dueño y el otro miembro, o viceversa, o ambos miembros de la misma cuenta).
create or replace function public.shares_an_account_with(p_other uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.shared_accounts sa
    where (sa.owner_user_id=auth.uid() or exists(select 1 from public.shared_account_members m1 where m1.shared_account_id=sa.id and m1.user_id=auth.uid()))
      and (sa.owner_user_id=p_other or exists(select 1 from public.shared_account_members m2 where m2.shared_account_id=sa.id and m2.user_id=p_other))
  );
$$;

drop policy if exists self_or_participant_read on public.profiles;
create policy self_or_participant_read on public.profiles for select to authenticated
  using (id=auth.uid() or public.shares_an_account_with(id));
drop policy if exists self_write on public.profiles;
create policy self_write on public.profiles for insert to authenticated with check (id=auth.uid());
drop policy if exists self_update on public.profiles;
create policy self_update on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());

revoke all on public.profiles from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;

-- Crea automáticamente una fila de perfil (vacía) para cada cuenta nueva que se registre.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id) values(new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Para tu(s) cuenta(s) que ya existían antes de correr esto.
insert into public.profiles(id) select id from auth.users on conflict do nothing;

-- Bucket de Storage para las fotos de perfil. Es de lectura pública (como el avatar de
-- casi cualquier app: la URL no es adivinable porque usa tu id de usuario, y así quien
-- comparte una cuenta contigo puede ver tu foto sin necesitar permisos más complejos de
-- Storage); solo tú puedes subir/reemplazar/borrar la tuya (la carpeta del archivo debe
-- ser exactamente tu propio id de usuario).
insert into storage.buckets (id, name, public) values ('avatars','avatars',true)
  on conflict (id) do nothing;

drop policy if exists avatar_public_read on storage.objects;
create policy avatar_public_read on storage.objects for select to public
  using (bucket_id='avatars');
drop policy if exists avatar_owner_insert on storage.objects;
create policy avatar_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists avatar_owner_update on storage.objects;
create policy avatar_owner_update on storage.objects for update to authenticated
  using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists avatar_owner_delete on storage.objects;
create policy avatar_owner_delete on storage.objects for delete to authenticated
  using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
