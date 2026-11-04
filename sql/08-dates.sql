-- 08: даты «счёт подан» (inv_date, по умолчанию — день создания) и «оплачен» (paid_date, ставится при смене статуса на «Оплачен»)
alter table public.payments add column if not exists inv_date date;
alter table public.payments add column if not exists paid_date date;
alter table public.payments alter column inv_date set default ((now() at time zone 'Asia/Almaty')::date);
-- функция payments_stamp() обновлена: см. миграцию invoice_and_paid_dates (права на «Оплачен» + автодата оплаты)
create or replace function public.payments_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT' and new.ok) or (tg_op = 'UPDATE' and new.ok is distinct from old.ok) then
    if coalesce(private.app_role(),'') not in ('admin','manager') then
      raise exception 'Согласовать платёж может только руководитель';
    end if;
  end if;
  if auth.uid() is not null and ((tg_op = 'INSERT' and new.status = 'paid') or (tg_op = 'UPDATE' and new.status = 'paid' and old.status is distinct from 'paid')) then
    if coalesce(private.app_role(),'') not in ('admin','manager','finance') then
      raise exception 'Отметить оплаченным может финансист или руководитель';
    end if;
  end if;
  if tg_op = 'UPDATE' then
    if new.status = 'paid' and old.status is distinct from 'paid' and new.paid_date is null then
      new.paid_date := (now() at time zone 'Asia/Almaty')::date;
    elsif new.status <> 'paid' and old.status = 'paid' and new.paid_date is not distinct from old.paid_date then
      new.paid_date := null;
    end if;
  end if;
  new.upd_by := auth.uid();
  new.upd := now();
  return new;
end $$;
