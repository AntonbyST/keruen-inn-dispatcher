-- 11: разделы, добавленные администратором (к списку заявок З-01…З-22 и прочих разделов в коде)
create table if not exists public.pay_sections(
  name text primary key,
  created timestamptz not null default now(),
  by_id uuid default auth.uid());
alter table public.pay_sections enable row level security;
drop policy if exists psec_read on public.pay_sections;
create policy psec_read on public.pay_sections for select using (private.has_section('buy'));
drop policy if exists psec_ins on public.pay_sections;
create policy psec_ins on public.pay_sections for insert with check (private.app_role()='admin');
drop policy if exists psec_del on public.pay_sections;
create policy psec_del on public.pay_sections for delete using (private.app_role()='admin');
