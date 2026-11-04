-- Keruen Inn · комплектация. Схема для нового проекта Supabase.
-- Выполнить один раз целиком в SQL Editor. Повторный запуск безопасен.

-- 1. Сотрудники и роли -------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  name       text not null default '',
  role       text not null default 'viewer' check (role in ('admin','manager','tech','viewer')),
  active     boolean not null default true,
  sections   text[] not null default '{buy,ved,prod}',  -- доступные разделы: buy, ved, prod
  created_at timestamptz not null default now()
);

-- при создании пользователя в Authentication автоматически появляется профиль с ролью «просмотр»
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name) values (new.id, new.email, split_part(new.email,'@',1))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
revoke all on function public.handle_new_user() from public, anon, authenticated;  -- только для триггера, через API не вызывается

-- роль текущего пользователя (null, если нет профиля или доступ отключён).
-- Лежит в схеме private, чтобы её нельзя было вызвать через API, но политики доступа её используют.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create or replace function private.app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;
revoke all on function private.app_role() from public, anon;
grant execute on function private.app_role() to authenticated;

create or replace function private.has_section(s text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' or s = any(sections) from public.profiles where id = auth.uid() and active), false)
$$;
revoke all on function private.has_section(text) from public, anon;
grant execute on function private.has_section(text) to authenticated;

-- 2. Отметки и настройки (чек-листы, даты подачи, этапы, курс, привязки платежей) ---
create table if not exists public.marks (
  k        text primary key,          -- ключ: отель|модуль|код|з/с/к, cfg|…, ov|…
  v        jsonb,                     -- значение: true/false или строка
  u        text not null default '',  -- имя, как показано на экране
  d        text not null default '',  -- время для экрана
  t        bigint not null default 0, -- время в мс: побеждает более поздняя запись
  by_user  uuid,                      -- кто на самом деле (ставит сервер, подделать нельзя)
  upd      timestamptz not null default now()
);
create index if not exists marks_upd_idx on public.marks (upd);
create or replace function public.marks_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.by_user := auth.uid();
  new.upd := now();
  return new;
end $$;
drop trigger if exists marks_stamp on public.marks;
create trigger marks_stamp before insert or update on public.marks for each row execute function public.marks_stamp();
revoke all on function public.marks_stamp() from public, anon, authenticated;

-- 3. Снимок данных: результат чтения заявок и реестров, который публикует руководитель ---
create table if not exists public.snapshots (
  id       bigint generated always as identity primary key,
  at       timestamptz not null,
  note     text not null default '',
  data     jsonb not null,
  by_user  uuid default auth.uid(),
  created  timestamptz not null default now()
);
create index if not exists snapshots_id_desc on public.snapshots (id desc);

-- 4. Счета (задел на разбор PDF: таблицы готовы, экран будет позже) -----------------
create table if not exists public.invoices (
  id            uuid primary key default gen_random_uuid(),
  hotel         text not null,
  registry_key  text,                 -- ключ платежа в реестре
  supplier      text, doc_no text, doc_date date,
  currency      text, total numeric,
  file_path     text,                 -- путь в бакете invoices
  status        text not null default 'new' check (status in ('new','parsed','confirmed','rejected')),
  uploaded_by   uuid default auth.uid(),
  created_at    timestamptz not null default now(),
  confirmed_by  uuid, confirmed_at timestamptz
);
create table if not exists public.invoice_lines (
  id            uuid primary key default gen_random_uuid(),
  invoice_id    uuid not null references public.invoices(id) on delete cascade,
  pos           int,
  article       text, name text, unit text,
  qty numeric, price numeric, amount numeric,
  item_code     text,                 -- код компонента из заявки
  request_no    text,                 -- номер заявки
  match_status  text not null default 'none' check (match_status in ('matched','uncertain','none')),
  confirmed_by  uuid, confirmed_at timestamptz
);

-- 5. Права доступа (RLS) ---------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.marks          enable row level security;
alter table public.snapshots      enable row level security;
alter table public.invoices       enable row level security;
alter table public.invoice_lines  enable row level security;

drop policy if exists profiles_self_read   on public.profiles;
drop policy if exists profiles_admin_all   on public.profiles;
create policy profiles_self_read on public.profiles for select to authenticated using (id = auth.uid() or private.app_role() = 'admin');
create policy profiles_admin_all on public.profiles for all    to authenticated using (private.app_role() = 'admin') with check (private.app_role() = 'admin');

drop policy if exists marks_read  on public.marks;
drop policy if exists marks_write on public.marks;
drop policy if exists marks_upd   on public.marks;
create policy marks_read  on public.marks for select to authenticated using (private.app_role() is not null);
create policy marks_write on public.marks for insert to authenticated with check (private.app_role() in ('admin','manager','tech'));
create policy marks_upd   on public.marks for update to authenticated using (private.app_role() in ('admin','manager','tech')) with check (private.app_role() in ('admin','manager','tech'));

drop policy if exists snap_read  on public.snapshots;
drop policy if exists snap_write on public.snapshots;
create policy snap_read  on public.snapshots for select to authenticated using (private.app_role() is not null and (private.has_section('buy') or private.has_section('ved')));
create policy snap_write on public.snapshots for insert to authenticated with check (private.app_role() in ('admin','manager'));

drop policy if exists inv_read  on public.invoices;
drop policy if exists inv_ins   on public.invoices;
drop policy if exists inv_upd   on public.invoices;
create policy inv_read on public.invoices for select to authenticated using (private.app_role() is not null);
create policy inv_ins  on public.invoices for insert to authenticated with check (private.app_role() in ('admin','manager','tech'));
-- подтверждённый счёт правит только руководитель или администратор
create policy inv_upd  on public.invoices for update to authenticated
  using (private.app_role() in ('admin','manager') or (private.app_role() = 'tech' and status <> 'confirmed'))
  with check (private.app_role() in ('admin','manager','tech'));

drop policy if exists invl_read on public.invoice_lines;
drop policy if exists invl_ins  on public.invoice_lines;
drop policy if exists invl_upd  on public.invoice_lines;
create policy invl_read on public.invoice_lines for select to authenticated using (private.app_role() is not null);
create policy invl_ins  on public.invoice_lines for insert to authenticated with check (private.app_role() in ('admin','manager','tech'));
create policy invl_upd  on public.invoice_lines for update to authenticated
  using (private.app_role() in ('admin','manager') or (private.app_role() = 'tech' and not exists (select 1 from public.invoices i where i.id = invoice_id and i.status = 'confirmed')))
  with check (private.app_role() in ('admin','manager','tech'));

-- 6. Файлы (Storage) -----------------------------------------------------------
insert into storage.buckets (id, name, public) values ('invoices','invoices',false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('assets','assets',false)     on conflict (id) do nothing;

drop policy if exists st_read     on storage.objects;
drop policy if exists st_inv_ins  on storage.objects;
drop policy if exists st_assets_w on storage.objects;
create policy st_read    on storage.objects for select to authenticated using (private.app_role() is not null and ((bucket_id = 'assets' and private.has_section('prod')) or (bucket_id = 'invoices' and private.has_section('buy'))));
create policy st_inv_ins on storage.objects for insert to authenticated with check (bucket_id = 'invoices' and private.app_role() in ('admin','manager','tech'));
create policy st_assets_w on storage.objects for all    to authenticated using (bucket_id = 'assets' and private.app_role() = 'admin') with check (bucket_id = 'assets' and private.app_role() = 'admin');

-- 7. Первый администратор: создайте пользователя в Authentication → Users, затем выполните
--    (подставьте свою почту и имя):
-- update public.profiles set role = 'admin', name = 'Антон' where email = 'you@example.com';
