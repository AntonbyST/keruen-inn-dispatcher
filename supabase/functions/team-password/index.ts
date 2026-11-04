import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const out = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Задать пароль сотруднику: только для администратора.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return out({ error: 'method' }, 405);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: u } = await admin.auth.getUser(jwt);
  if (!u?.user) return out({ error: 'Нужен вход' }, 401);
  const { data: me } = await admin.from('profiles').select('role,active').eq('id', u.user.id).maybeSingle();
  if (!me || !me.active || me.role !== 'admin') return out({ error: 'Только администратор может задавать пароли' }, 403);

  let b: any = null;
  try { b = await req.json(); } catch (_) { /* ignore */ }
  const id = String(b?.id || '');
  const password = String(b?.password || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return out({ error: 'Не указан сотрудник' }, 400);
  if (password.length < 8) return out({ error: 'Пароль должен быть не короче 8 символов' }, 400);
  const { data: t } = await admin.from('profiles').select('id').eq('id', id).maybeSingle();
  if (!t) return out({ error: 'Сотрудник не найден' }, 404);
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) return out({ error: 'Не удалось задать пароль: ' + error.message }, 400);
  return out({ ok: true });
});
