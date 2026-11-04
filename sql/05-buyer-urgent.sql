-- 05: роль «Снабженец» (buyer) и признак «срочно» у платежа
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin','manager','tech','buyer','viewer'));

-- снабженец правит реестр платежей, ставки, отметки и счета так же, как техник (согласовывать и публиковать не может)
drop policy if exists pay_ins on public.payments;
drop policy if exists pay_upd on public.payments;
drop policy if exists rate_w  on public.pay_rates;
create policy pay_ins on public.payments for insert to authenticated with check (private.app_role() in ('admin','manager','tech','buyer') and private.has_section('buy'));
create policy pay_upd on public.payments for update to authenticated using (private.app_role() in ('admin','manager','tech','buyer') and private.has_section('buy')) with check (private.app_role() in ('admin','manager','tech','buyer'));
create policy rate_w  on public.pay_rates for all to authenticated using (private.app_role() in ('admin','manager','tech','buyer') and private.has_section('buy')) with check (private.app_role() in ('admin','manager','tech','buyer') and private.has_section('buy'));
drop policy if exists marks_write on public.marks;
drop policy if exists marks_upd   on public.marks;
create policy marks_write on public.marks for insert to authenticated with check (private.app_role() in ('admin','manager','tech','buyer'));
create policy marks_upd   on public.marks for update to authenticated using (private.app_role() in ('admin','manager','tech','buyer')) with check (private.app_role() in ('admin','manager','tech','buyer'));

-- «срочно» — отдельный признак, а не слово в примечании
alter table public.payments add column if not exists urgent boolean not null default false;
update public.payments set urgent = true where note ~* 'срочн';
update public.payments set note = coalesce(nullif(regexp_replace(regexp_replace(note, '\s*·?\s*СРОЧНО!?', '', 'gi'), '^\s*·\s*', ''), ''), '') where note ~* 'срочн';
