-- 15: раздел «Документация» — общее ТЗ по отелю и протоколы по модулям. Файлы лежат в закрытом хранилище docs, список — в таблице docs.
insert into storage.buckets (id, name, public) values ('docs','docs',false) on conflict (id) do nothing;

create table if not exists public.docs(
  id uuid primary key default gen_random_uuid(),
  hotel text not null,
  kind text not null check (kind in ('tz','protocol')),
  module text,
  name text not null,
  path text not null,
  size bigint,
  by_id uuid default auth.uid(),
  by_name text,
  created timestamptz not null default now());
create index if not exists docs_hotel_idx on public.docs(hotel, kind);
alter table public.docs enable row level security;
drop policy if exists docs_read on public.docs;
create policy docs_read on public.docs for select to authenticated
  using (private.app_role() is not null and private.has_section('docs'));
drop policy if exists docs_ins on public.docs;
create policy docs_ins on public.docs for insert to authenticated
  with check (private.app_role() in ('admin','manager','tech') and private.has_section('docs'));
drop policy if exists docs_del on public.docs;
create policy docs_del on public.docs for delete to authenticated
  using (private.app_role() in ('admin','manager','tech') and private.has_section('docs'));

drop policy if exists st_docs_read on storage.objects;
create policy st_docs_read on storage.objects for select to authenticated
  using (bucket_id = 'docs' and private.app_role() is not null and private.has_section('docs'));
drop policy if exists st_docs_ins on storage.objects;
create policy st_docs_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'docs' and private.app_role() in ('admin','manager','tech') and private.has_section('docs'));
drop policy if exists st_docs_del on storage.objects;
create policy st_docs_del on storage.objects for delete to authenticated
  using (bucket_id = 'docs' and private.app_role() in ('admin','manager','tech') and private.has_section('docs'));
notify pgrst, 'reload schema';

-- «Документация» открывается тем, кто её ведёт: администратор, руководитель, техник (остальным раздел можно открыть в «Команде»)
alter table public.profiles alter column sections set default '{buy,ved,prod,docs}';
update public.profiles set sections = array_append(sections,'docs') where role in ('admin','manager','tech') and not ('docs' = any(sections));
