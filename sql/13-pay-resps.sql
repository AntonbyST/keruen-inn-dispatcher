-- 13 (v0.0.15): список ответственных (фамилии). Наполняется из реестра и вручную
create table if not exists public.pay_resps(
  name text primary key,
  created timestamptz not null default now(),
  by_id uuid default auth.uid());
alter table public.pay_resps enable row level security;
drop policy if exists presp_read on public.pay_resps;
create policy presp_read on public.pay_resps for select using (private.has_section('buy'));
drop policy if exists presp_ins on public.pay_resps;
create policy presp_ins on public.pay_resps for insert with check (private.has_section('buy') and private.app_role() in ('admin','manager','tech','buyer','finance'));
drop policy if exists presp_del on public.pay_resps;
create policy presp_del on public.pay_resps for delete using (private.app_role()='admin');
insert into public.pay_resps(name) select distinct trim(resp) from public.payments where coalesce(trim(resp),'')<>'' on conflict do nothing;
