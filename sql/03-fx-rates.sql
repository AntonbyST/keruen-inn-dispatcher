-- Keruen Inn · курсы валют на 1-е число месяца, автоматически.
-- BYN/RUB — Национальный банк Республики Беларусь (api.nbrb.by),
-- RUB/KZT, BYN/KZT, USD/KZT, CNY/KZT — Национальный банк Республики Казахстан (nationalbank.kz).
-- Выполнить после 02-payments.sql. Повторный запуск безопасен.

create extension if not exists http with schema extensions;

create table if not exists public.fx_rates (
  month    text primary key,            -- «окт 26»
  d        date not null,               -- 1-е число месяца
  byn_rub  numeric, rub_kzt numeric, byn_kzt numeric, usd_kzt numeric, cny_kzt numeric,
  src      text not null default '',
  at       timestamptz not null default now()
);
alter table public.fx_rates enable row level security;
drop policy if exists fx_read on public.fx_rates;
create policy fx_read on public.fx_rates for select to authenticated using (private.app_role() is not null);
-- писать в fx_rates может только функция ниже

alter table public.pay_rates add column if not exists src text not null default 'manual';

-- курс месяца: если уже скачан — из таблицы, иначе берётся у нацбанков на 1-е число и сохраняется.
-- Для месяца, который ещё не начался, возвращает пусто.
create or replace function public.fx_month(m text) returns public.fx_rates
language plpgsql security definer set search_path = public, extensions as $$
declare r public.fx_rates; mo int; yr int; dd date; j jsonb; x xml; c text; st int;
  kz numeric[];
begin
  if private.app_role() is null then raise exception 'нет доступа'; end if;
  select * into r from public.fx_rates where month = m;
  if found then return r; end if;
  mo := array_position(array['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'], split_part(m,' ',1));
  yr := 2000 + nullif(split_part(m,' ',2),'')::int;
  if mo is null or yr is null then raise exception 'неизвестный месяц %', m; end if;
  dd := make_date(yr, mo, 1);
  if dd > current_date then return null; end if;
  select status, content into st, c from extensions.http_get('https://api.nbrb.by/exrates/rates/RUB?parammode=2&ondate=' || to_char(dd,'YYYY-MM-DD'));
  if st <> 200 then raise exception 'НБ РБ не ответил (%)', st; end if;
  j := c::jsonb;
  select status, content into st, c from extensions.http_get('https://nationalbank.kz/rss/get_rates.cfm?fdate=' || to_char(dd,'DD.MM.YYYY'));
  if st <> 200 then raise exception 'НБ РК не ответил (%)', st; end if;
  x := c::xml;
  r.month := m; r.d := dd;
  r.byn_rub := round((j->>'Cur_Scale')::numeric / nullif((j->>'Cur_OfficialRate')::numeric,0), 4);
  r.rub_kzt := round((xpath('/rates/item[title="RUB"]/description/text()', x))[1]::text::numeric / coalesce((xpath('/rates/item[title="RUB"]/quant/text()', x))[1]::text::numeric,1), 4);
  r.byn_kzt := round((xpath('/rates/item[title="BYN"]/description/text()', x))[1]::text::numeric / coalesce((xpath('/rates/item[title="BYN"]/quant/text()', x))[1]::text::numeric,1), 4);
  r.usd_kzt := round((xpath('/rates/item[title="USD"]/description/text()', x))[1]::text::numeric / coalesce((xpath('/rates/item[title="USD"]/quant/text()', x))[1]::text::numeric,1), 4);
  r.cny_kzt := round((xpath('/rates/item[title="CNY"]/description/text()', x))[1]::text::numeric / coalesce((xpath('/rates/item[title="CNY"]/quant/text()', x))[1]::text::numeric,1), 4);
  r.src := 'НБ РБ и НБ РК на ' || to_char(dd,'DD.MM.YYYY');
  r.at := now();
  insert into public.fx_rates values (r.*) on conflict (month) do nothing;
  return r;
end $$;
revoke all on function public.fx_month(text) from public, anon;
grant execute on function public.fx_month(text) to authenticated;
