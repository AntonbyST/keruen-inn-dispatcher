-- 07: файл счёта у платежа, снабженец и финансист грузят счета, ночной перенос неоплаченного на следующий месяц
alter table public.payments add column if not exists inv_file text;   -- путь в хранилище (бакет invoices)
alter table public.payments add column if not exists inv_name text;   -- исходное имя файла

drop policy if exists st_inv_ins on storage.objects;
create policy st_inv_ins on storage.objects for insert to authenticated with check (bucket_id = 'invoices' and private.app_role() in ('admin','manager','tech','buyer','finance'));
drop policy if exists st_inv_upd on storage.objects;
create policy st_inv_upd on storage.objects for update to authenticated using (bucket_id = 'invoices' and private.app_role() in ('admin','manager','tech','buyer','finance')) with check (bucket_id = 'invoices' and private.app_role() in ('admin','manager','tech','buyer','finance'));

-- Платежи в статусах «Запланирован» и «Перспективный», не оплаченные к концу месяца, переходят в текущий месяц.
-- Неделя сбрасывается (она относилась к прошлому месяцу), в примечание пишется, откуда перенесено.
create or replace function public.pay_roll() returns integer
language plpgsql security definer set search_path = public as $$
declare
  mn text[] := array['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  now_d date := (now() at time zone 'Asia/Almaty')::date;
  cur_lab text; cur_n int; r record; n int := 0; mx numeric;
begin
  cur_lab := mn[extract(month from now_d)::int] || ' ' || to_char(now_d, 'YY');
  cur_n := extract(year from now_d)::int * 12 + extract(month from now_d)::int;
  for r in
    select * from public.payments
    where status in ('plan','persp')
      and (2000 + substring(month from 5)::int) * 12 + array_position(mn, substring(month from 1 for 3)) < cur_n
    order by month, entity, pos
  loop
    select coalesce(max(pos), 0) + 1 into mx from public.payments where hotel = r.hotel and month = cur_lab and entity = r.entity;
    update public.payments
       set month = cur_lab, pos = mx, week = null,
           note = trim(both ' ·' from coalesce(nullif(note, ''), '') || ' · перенос с ' || r.month || case when r.week is not null then ' (нед. ' || r.week || ')' else '' end)
     where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.pay_roll() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'pay-roll';
select cron.schedule('pay-roll', '5 19 * * *', $$select public.pay_roll()$$);
