-- Keruen Inn · активность по людям (страница «Команда», только администратор).
-- Выполнить после 02-payments.sql. Повторный запуск безопасен.

-- сводка по каждому сотруднику: последний вход на сайт и число действий
create or replace function public.team_summary()
returns table(uid uuid, last_login timestamptz, last_act timestamptz, n7 bigint, n30 bigint, n_all bigint)
language plpgsql security definer set search_path = public, auth as $$
begin
  if coalesce(private.app_role(),'') <> 'admin' then raise exception 'только администратор'; end if;
  return query
  with ev as (
    select by_user as u, at as t from public.pay_log where by_user is not null
    union all select by_user, upd from public.marks where by_user is not null
    union all select by_user, created from public.snapshots where by_user is not null
  )
  select p.id, au.last_sign_in_at,
         (select max(t) from ev where u = p.id),
         (select count(*) from ev where u = p.id and t > now() - interval '7 days'),
         (select count(*) from ev where u = p.id and t > now() - interval '30 days'),
         (select count(*) from ev where u = p.id)
  from public.profiles p left join auth.users au on au.id = p.id;
end $$;

-- лента действий: кто, когда, что сделал (последние p_limit)
create or replace function public.team_activity(p_limit int default 500)
returns table(at timestamptz, uid uuid, kind text, act text, ref text, diff jsonb)
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(private.app_role(),'') <> 'admin' then raise exception 'только администратор'; end if;
  return query
  select * from (
    select l.at, l.by_user, 'pay'::text, l.action,
           coalesce(nullif(concat_ws(' · ', 'Мотель ' || coalesce(p.hotel, l.diff->>'hotel'), coalesce(p.month, l.diff->>'month'), nullif(coalesce(p.sup, l.diff->>'sup'),'')), ''), 'платёж') as ref,
           l.diff
    from public.pay_log l left join public.payments p on p.id = l.pid
    union all
    select m.upd, m.by_user, 'mark'::text, 'set'::text, m.k, jsonb_build_object('v', m.v) from public.marks m where m.by_user is not null
    union all
    select s.created, s.by_user, 'snap'::text, 'publish'::text, nullif(s.note,''), null::jsonb from public.snapshots s where s.by_user is not null
  ) x order by 1 desc limit least(greatest(p_limit,1), 2000);
end $$;

revoke all on function public.team_summary() from public, anon;
revoke all on function public.team_activity(int) from public, anon;
grant execute on function public.team_summary() to authenticated;
grant execute on function public.team_activity(int) to authenticated;
