-- 09: план затрат по Уставу (USD без НДС; «План отвлечений», Бюджет программы 2027 вер 1.2) + руководитель видит все разделы
create table if not exists public.budget_plan(
  hotel text not null, month text not null, total numeric not null default 0, purch numeric not null default 0,
  upd timestamptz default now(), primary key(hotel,month));
alter table public.budget_plan enable row level security;
drop policy if exists bp_read on public.budget_plan;
create policy bp_read on public.budget_plan for select using (private.app_role() is not null and private.has_section('buy'));
drop policy if exists bp_w on public.budget_plan;
create policy bp_w on public.budget_plan for all
  using (private.app_role() in ('admin','manager')) with check (private.app_role() in ('admin','manager'));
create or replace function private.has_section(s text) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select coalesce((select role in ('admin','manager') or s = any(sections) from public.profiles where id = auth.uid() and active), false)
$$;
insert into public.budget_plan(hotel,month,total,purch) values
('11','окт 26',385622.18,240622.18),
('11','ноя 26',557063.55,200131.99),
('11','дек 26',640334.12,221964.57),
('11','янв 27',22500.00,0.00),
('11','фев 27',225068.56,72775.27),
('11','мар 27',344412.41,0.00),
('11','апр 27',87121.73,0.00),
('11','май 27',44000.00,0.00),
('11','июн 27',0.00,0.00),
('11','июл 27',0.00,0.00),
('11','авг 27',0.00,0.00),
('11','сен 27',0.00,0.00),
('10','окт 26',324238.51,274238.51),
('10','ноя 26',50000.00,0.00),
('10','дек 26',80000.00,0.00),
('10','янв 27',323129.06,116440.43),
('10','фев 27',817920.42,294739.83),
('10','мар 27',424106.89,152828.06),
('10','апр 27',242649.04,0.00),
('10','май 27',210507.52,0.00),
('10','июн 27',0.00,0.00),
('10','июл 27',50147.06,0.00),
('10','авг 27',0.00,0.00),
('10','сен 27',0.00,0.00),
('12','окт 26',240622.18,240622.18),
('12','ноя 26',30000.00,0.00),
('12','дек 26',435522.41,156466.83),
('12','янв 27',739375.26,265629.73),
('12','фев 27',0.00,0.00),
('12','мар 27',202568.56,72775.27),
('12','апр 27',0.00,0.00),
('12','май 27',0.00,0.00),
('12','июн 27',300449.48,0.00),
('12','июл 27',108584.67,0.00),
('12','авг 27',44000.00,0.00),
('12','сен 27',0.00,0.00)
on conflict (hotel,month) do update set total=excluded.total, purch=excluded.purch;
