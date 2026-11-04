-- Keruen Inn · реестр платежей в базе (вместо файлов «Реестр платежей (Мотель N).xlsm»).
-- Выполнить один раз после 01-schema.sql. Повторный запуск безопасен.

-- 1. Строки реестра ---------------------------------------------------------
create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  hotel       text not null,                       -- 10, 11, 12 …
  month       text not null,                       -- лист: «окт 26» … «сен 27»
  entity      text not null default 'svk' check (entity in ('svk','tdv','vdskz')),  -- ИНДУСТРИЯ СВК (РБ) / ТД ВДС (РФ) / ТОО VDS KAZAKHSTAN
  pos         double precision not null default 0, -- порядок строк внутри юрлица
  code        text not null default '',            -- шифр лота / № позиции
  sup         text not null default '',            -- B Поставщик
  basis       text not null default '',            -- C Обоснование платежа
  cur         text not null default 'BYN',         -- D Валюта
  amt         numeric,                             -- E Сумма оплаты с НДС
  vat         text not null default 'с НДС',       -- F НДС
  descr       text not null default '',            -- G Описание
  week        int,                                 -- H Неделя платежа
  art         text not null default '',            -- K Статья бюджета
  erp         text not null default '',            -- L ERP
  ok          boolean not null default false,      -- M Согл (ставит руководитель)
  term        text not null default '',            -- N Срок поставки
  resp        text not null default '',            -- O Ответственный
  note        text not null default '',            -- P Примечание
  status      text not null default 'plan' check (status in ('persp','plan','paid','pause','budget','defer')),
  inv_amt     numeric,                             -- R Сумма счёта
  erp_order   text not null default '',            -- S ERP заказ поставщику
  erp_order_amt numeric,                           -- T Сумма заказа в ERP
  erp_buy     text not null default '',            -- U ERP закупка
  erp_recv_amt numeric,                            -- V Сумма поступления ТМЦ в ERP
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  upd_by      uuid,
  upd         timestamptz not null default now()
);
create index if not exists payments_hotel_idx on public.payments (hotel, month);
create index if not exists payments_upd_idx on public.payments (upd);

-- 2. Курсы по месяцам (свои для каждого листа, как ячейки A103:A105) ------------
create table if not exists public.pay_rates (
  hotel    text not null,
  month    text not null,
  byn_rub  numeric, rub_kzt numeric, byn_kzt numeric, usd_kzt numeric, cny_kzt numeric,
  upd      timestamptz not null default now(),
  primary key (hotel, month)
);

-- 3. История изменений (то, для чего в файле был лист _Audit) ---------------------
create table if not exists public.pay_log (
  id       bigint generated always as identity primary key,
  pid      uuid not null,
  at       timestamptz not null default now(),
  by_user  uuid,
  by_name  text not null default '',
  action   text not null,          -- insert / update / delete
  diff     jsonb                   -- {поле: [было, стало]}
);
create index if not exists pay_log_pid_idx on public.pay_log (pid, at);

-- отметку «Согл» ставит или снимает только руководитель или администратор; кто и когда — ставит сервер
create or replace function public.payments_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT' and new.ok) or (tg_op = 'UPDATE' and new.ok is distinct from old.ok) then
    if coalesce(private.app_role(),'') not in ('admin','manager') then
      raise exception 'Согласовать платёж может только руководитель';
    end if;
  end if;
  new.upd_by := auth.uid();
  new.upd := now();
  return new;
end $$;
drop trigger if exists payments_stamp on public.payments;
create trigger payments_stamp before insert or update on public.payments for each row execute function public.payments_stamp();
revoke all on function public.payments_stamp() from public, anon, authenticated;

create or replace function public.payments_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare d jsonb := '{}'::jsonb; k text; o jsonb; n jsonb; nm text;
begin
  select coalesce(nullif(name,''), email, '') into nm from public.profiles where id = auth.uid();
  if tg_op = 'UPDATE' then
    o := to_jsonb(old); n := to_jsonb(new);
    for k in select jsonb_object_keys(n) loop
      if k not in ('upd','upd_by') and (o->k) is distinct from (n->k) then d := d || jsonb_build_object(k, jsonb_build_array(o->k, n->k)); end if;
    end loop;
    if d = '{}'::jsonb then return new; end if;
    insert into public.pay_log (pid, by_user, by_name, action, diff) values (new.id, auth.uid(), coalesce(nm,''), 'update', d);
    return new;
  elsif tg_op = 'INSERT' then
    insert into public.pay_log (pid, by_user, by_name, action, diff) values (new.id, auth.uid(), coalesce(nm,''), 'insert', null);
    return new;
  else
    insert into public.pay_log (pid, by_user, by_name, action, diff) values (old.id, auth.uid(), coalesce(nm,''), 'delete', to_jsonb(old));
    return old;
  end if;
end $$;
drop trigger if exists payments_log on public.payments;
create trigger payments_log after insert or update or delete on public.payments for each row execute function public.payments_log();
revoke all on function public.payments_log() from public, anon, authenticated;

-- 4. Права доступа -------------------------------------------------------------
alter table public.payments  enable row level security;
alter table public.pay_rates enable row level security;
alter table public.pay_log   enable row level security;

drop policy if exists pay_read on public.payments;
drop policy if exists pay_ins  on public.payments;
drop policy if exists pay_upd  on public.payments;
drop policy if exists pay_del  on public.payments;
create policy pay_read on public.payments for select to authenticated using (private.app_role() is not null and private.has_section('buy'));
create policy pay_ins  on public.payments for insert to authenticated with check (private.app_role() in ('admin','manager','tech') and private.has_section('buy'));
create policy pay_upd  on public.payments for update to authenticated using (private.app_role() in ('admin','manager','tech') and private.has_section('buy')) with check (private.app_role() in ('admin','manager','tech'));
create policy pay_del  on public.payments for delete to authenticated using (private.app_role() in ('admin','manager'));

drop policy if exists rate_read on public.pay_rates;
drop policy if exists rate_w    on public.pay_rates;
create policy rate_read on public.pay_rates for select to authenticated using (private.app_role() is not null and private.has_section('buy'));
create policy rate_w    on public.pay_rates for all    to authenticated using (private.app_role() in ('admin','manager','tech') and private.has_section('buy')) with check (private.app_role() in ('admin','manager','tech') and private.has_section('buy'));

drop policy if exists plog_read on public.pay_log;
create policy plog_read on public.pay_log for select to authenticated using (private.app_role() is not null and private.has_section('buy'));
-- в журнал пишут только триггеры: прямых прав на запись нет
