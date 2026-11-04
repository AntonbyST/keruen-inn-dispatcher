-- 10: запросы на платёж (финансист → бухгалтер): сохранённые выборки платежей с суммами оплаты
create table if not exists public.pay_requests(
  id uuid primary key default gen_random_uuid(),
  hotel text not null,
  created timestamptz not null default now(),
  by_id uuid default auth.uid(),
  by_name text,
  to_email text,
  note text,
  items jsonb not null default '[]'::jsonb);
alter table public.pay_requests enable row level security;
drop policy if exists preq_read on public.pay_requests;
create policy preq_read on public.pay_requests for select
  using (private.app_role() in ('admin','manager','finance') and private.has_section('buy'));
drop policy if exists preq_ins on public.pay_requests;
create policy preq_ins on public.pay_requests for insert
  with check (private.app_role() in ('admin','manager','finance') and private.has_section('buy'));
drop policy if exists preq_del on public.pay_requests;
create policy preq_del on public.pay_requests for delete using (private.app_role() in ('admin','manager'));
