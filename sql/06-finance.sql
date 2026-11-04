-- 06: роль «Финансист» (finance). Статус «Оплачен» ставят только финансист, руководитель и администратор.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin','manager','tech','buyer','finance','viewer'));

drop policy if exists pay_ins on public.payments;
drop policy if exists pay_upd on public.payments;
create policy pay_ins on public.payments for insert to authenticated with check (private.app_role() in ('admin','manager','tech','buyer','finance') and private.has_section('buy'));
create policy pay_upd on public.payments for update to authenticated using (private.app_role() in ('admin','manager','tech','buyer','finance') and private.has_section('buy')) with check (private.app_role() in ('admin','manager','tech','buyer','finance'));

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
  new.upd_by := auth.uid();
  new.upd := now();
  return new;
end $$;
