/* ---------- команда: доступ и роли (только администратор) ---------- */
const isAdmin=()=>!!(SRV.on&&AUTH&&AUTH.role==='admin');
const ROLEHINT={admin:'всё, включая команду',manager:'публикует данные, правит отметки',tech:'правит отметки и привязки',buyer:'ведёт реестр платежей, открывается сразу он',finance:'ставит «Оплачен» (как руководитель), ведёт реестр',viewer:'только просмотр'};
async function teamLoad(){try{S.team=await (await srvFetch('/rest/v1/profiles?select=id,email,name,role,active,sections,can_delete&order=created_at')).json()}catch(e){S.tmsg='Не удалось загрузить список: '+e.message}render();actLoad()}
function teamView(){
  const rows=(S.team||[]).map(p=>{const me=AUTH&&p.id===AUTH.id,dis=me?' disabled title="Свой доступ менять нельзя"':'';
    return `<tr><td><input class="dt" data-tm="name|${p.id}" value="${esc(p.name||'')}" aria-label="Имя"></td><td>${esc(p.email||'')}</td>
    <td><select data-tm="role|${p.id}" aria-label="Роль"${dis}>${Object.entries(ROLES).map(([k,l])=>`<option value="${k}"${p.role===k?' selected':''}>${l}</option>`).join('')}</select></td>
    <td>${p.role==='admin'?'<span class="mut">все</span>':SECS.map(([k,l])=>`<label style="margin-right:10px"><input type="checkbox" data-tm="sec|${k}|${p.id}"${(p.sections||[]).includes(k)?' checked':''}> ${l}</label>`).join('')}</td>
    <td><label title="Может удалять счета в реестре платежей"><input type="checkbox" data-tm="candel|${p.id}"${p.role==='admin'||p.can_delete?' checked':''}${p.role==='admin'?' disabled':''}> удалять счета</label></td><td><label><input type="checkbox" data-tm="active|${p.id}"${p.active?' checked':''}${dis}> доступ открыт</label></td><td><button type="button" class="chip" data-tpw="${p.id}">Задать пароль</button></td></tr>`}).join('');
  return `<div class="page"><div class="card" style="padding:20px;margin-bottom:16px"><h2 style="margin-top:0">Добавить сотрудника</h2>
   <form id="tmf" style="display:flex;flex-wrap:wrap;gap:10px;align-items:end"><label>Почта<br><input class="dt" id="tme" type="email" required style="min-width:240px"></label>
   <label>Имя<br><input class="dt" id="tmn" style="min-width:180px"></label>
   <label>Роль<br><select id="tmr">${Object.entries(ROLES).filter(([k])=>k!=='admin').map(([k,l])=>`<option value="${k}"${k==='tech'?' selected':''}>${l}</option>`).join('')}<option value="admin">администратор</option></select></label>
   <fieldset style="border:0;padding:0;margin:0"><legend style="padding:0">Разделы</legend>${SECS.map(([k,l])=>`<label style="margin-right:10px"><input type="checkbox" class="tms" value="${k}" checked> ${l}</label>`).join('')}</fieldset>
   <button class="act p" type="submit" id="tmgo">Добавить</button></form>
   <p class="mut">Сотрудник открывает сайт, вводит свою почту и получает код для входа. Пароли не нужны.</p>
   <p class="mut">${Object.entries(ROLES).map(([k,l])=>`<b>${l}</b>: ${ROLEHINT[k]}`).join(' · ')}</p>
   ${S.tmsg?`<p class="note ${/Не удалось|уже|Только|Проверьте/.test(S.tmsg)?'red':''}" id="tmmsg">${esc(S.tmsg)}</p>`:''}</div>
   <div class="card" style="padding:12px;overflow:auto"><table><thead><tr><th>Имя</th><th>Почта</th><th>Роль</th><th>Разделы</th><th>Права</th><th>Доступ</th><th>Пароль</th></tr></thead><tbody>${rows||'<tr><td colspan="7">Загрузка…</td></tr>'}</tbody></table></div>${S.tpw?tpwView():''}${actView()}</div>`}
document.addEventListener('click',e=>{if(e.target.closest('[data-sec="team"]')){S.tmsg='';teamLoad()}});
document.addEventListener('change',async e=>{const t=e.target.dataset&&e.target.dataset.tm;if(!t||!isAdmin())return;const q=t.split('|'),f=q[0]==='sec'?'sections':q[0]==='candel'?'can_delete':q[0],id=q[q.length-1];
  let v=f==='active'||f==='can_delete'?e.target.checked:f==='name'?e.target.value.trim():e.target.value;
  if(f==='sections'){const u=(S.team||[]).find(x=>x.id===id),cur=new Set(u&&u.sections||[]);e.target.checked?cur.add(q[1]):cur.delete(q[1]);v=SECS.map(x=>x[0]).filter(x=>cur.has(x))}
  try{await srvFetch('/rest/v1/profiles?id=eq.'+id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({[f]:v})});S.tmsg='Сохранено.'}catch(er){S.tmsg='Не удалось сохранить: '+er.message}
  await teamLoad()});
document.addEventListener('submit',async e=>{if(e.target.id!=='tmf')return;e.preventDefault();if(!isAdmin())return;const b=$('#tmgo');b.disabled=true;
  try{const t=await srvToken();const r=await fetch(rb('/functions/v1/team-invite'),{method:'POST',headers:{apikey:SRV.key,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({email:$('#tme').value,name:$('#tmn').value,role:$('#tmr').value,sections:[...document.querySelectorAll('.tms:checked')].map(x=>x.value)})});
    const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||('ошибка '+r.status));S.tmsg='Добавлено. Пусть откроет сайт и войдёт по коду из письма.'}
  catch(er){S.tmsg=String(er.message||er)}
  await teamLoad()});

/* ---- администратор задаёт пароль сотруднику ---- */
const tpwGen=()=>{const a='abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';const r=new Uint32Array(10);crypto.getRandomValues(r);return [...r].map(x=>a[x%a.length]).join('')};
function tpwView(){const T=S.tpw,u=(S.team||[]).find(x=>x.id===T.id)||{};
  return `<div class="pmodal"><div class="card pimpc pnmod" role="dialog" aria-modal="true" aria-labelledby="tpw-h"><h3 id="tpw-h">Пароль · ${esc(u.name||u.email||'')}<small>${esc(u.email||'')}</small></h3><div class="pnbody">
   ${T.ok?`<p><b>Пароль задан.</b> Передайте его сотруднику отдельно от логина. Вход: «Войти по паролю» на странице входа.</p><p class="num" style="font-size:18px">${esc(T.pw)}</p><div class="pnr pnbt"><span class="sp"></span><button class="act p" type="button" data-tpw="close">Закрыть</button></div>`
   :`<div class="pnr"><div class="pnf"><span class="lab">Новый пароль (не короче 8 символов)</span><input id="tpw-pw" autocomplete="off" value="${esc(T.pw)}"></div><button class="chip" type="button" data-tpw="gen" style="align-self:flex-end">Придумать</button></div>
   ${T.err?`<p class="red">${esc(T.err)}</p>`:''}<p class="mut">Прежний пароль перестанет действовать. Вход по коду из письма останется.</p>
   <div class="pnr pnbt"><span class="sp"></span><button class="chip" type="button" data-tpw="close">Отмена</button><button class="act p" type="button" data-tpw="go"${T.busy?' disabled':''}>${T.busy?'Сохраняю…':'Задать пароль'}</button></div>`}
   </div></div></div>`}
async function tpwGo(){const T=S.tpw;if(!T||T.busy)return;if(String(T.pw).length<8){T.err='Пароль должен быть не короче 8 символов';render();return}
  T.busy=true;T.err='';render();
  try{const t=await srvToken();const r=await fetch(rb('/functions/v1/team-password'),{method:'POST',headers:{apikey:SRV.key,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({id:T.id,password:T.pw})});
    const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||('ошибка '+r.status));T.ok=true}
  catch(er){T.err=String(er.message||er)}T.busy=false;render()}
document.addEventListener('click',e=>{const t=e.target.closest('[data-tpw]');if(!t||!isAdmin())return;const v=t.dataset.tpw;
  if(v==='close'){S.tpw=null;render()}else if(v==='gen'){S.tpw.pw=tpwGen();render()}else if(v==='go')tpwGo();else{S.tpw={id:v,pw:'',err:'',ok:false,busy:false};render()}});
document.addEventListener('input',e=>{if(e.target.id==='tpw-pw'&&S.tpw)S.tpw.pw=e.target.value});
document.addEventListener('keydown',e=>{if(!S.tpw)return;if(e.key==='Escape'){S.tpw=null;render()}else if(e.key==='Enter'&&e.target.id==='tpw-pw'){e.preventDefault();tpwGo()}});

/* ---- активность по людям: последний вход, число действий, лента (только администратор) ---- */
const TACT={sum:null,ev:null,who:'',per:'30',err:''};
async function actLoad(){if(!isAdmin())return;
  try{const [a,b]=await Promise.all([srvFetch('/rest/v1/rpc/team_summary',{method:'POST',body:'{}'}).then(r=>r.json()),srvFetch('/rest/v1/rpc/team_activity',{method:'POST',body:JSON.stringify({p_limit:1000})}).then(r=>r.json())]);
    TACT.sum=Array.isArray(a)?a:[];TACT.ev=Array.isArray(b)?b:[];TACT.err=''}catch(e){TACT.err='Не удалось загрузить активность: '+e.message}
  if(S.sec==='team')render()}
const tfmt=t=>{if(!t)return '—';const d=new Date(t);return isNaN(d)?'—':d.toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})};
const tact_val=v=>v===true?'да':v===false?'нет':v==null||v===''?'пусто':String(v);
function actText(e){
  if(e.kind==='snap')return 'Опубликовал(а) данные'+(e.ref?': '+e.ref:'');
  if(e.kind==='mark'){const v=e.diff&&e.diff.v;return 'Отметка: '+String(e.ref||'').replace(/\|/g,' · ')+' → '+tact_val(v)}
  const nm=f=>{const c=typeof PCOL!=='undefined'?PCOL.find(x=>x[0]===f):null;return c?c[1]:({ok:'Согл',status:'Статус',entity:'Юрлицо',hotel:'Отель',month:'Месяц',inv_amt:'Сумма счёта',note:'Примечание'}[f]||f)};
  if(e.act==='insert')return 'Добавил(а) строку реестра: '+e.ref;
  if(e.act==='delete')return 'Удалил(а) строку реестра: '+e.ref;
  const d=e.diff||{};return 'Реестр: '+e.ref+' — '+Object.keys(d).slice(0,4).map(k=>nm(k)+': '+tact_val(d[k][0])+' → '+tact_val(d[k][1])).join('; ')+(Object.keys(d).length>4?' …':'')}
function actView(){
  if(TACT.err)return `<div class="card" style="padding:20px;margin-top:16px"><h2 style="margin-top:0">Активность по людям</h2><p class="note red">${esc(TACT.err)}</p></div>`;
  if(!TACT.sum)return `<div class="card" style="padding:20px;margin-top:16px"><h2 style="margin-top:0">Активность по людям</h2><p class="mut">Загрузка…</p></div>`;
  const team=S.team||[],by=Object.fromEntries(team.map(p=>[p.id,p])),sm=Object.fromEntries(TACT.sum.map(x=>[x.uid,x]));
  const lim=TACT.per==='all'?0:Date.now()-(+TACT.per)*864e5;
  const ev=TACT.ev.filter(e=>(!TACT.who||e.uid===TACT.who)&&(!lim||new Date(e.at)>=lim));
  const nm=id=>{const p=by[id];return p?(p.name||p.email||''):'—'};
  const rows=team.map(p=>{const x=sm[p.id]||{};return `<tr class="tact-r${TACT.who===p.id?' on':''}" data-tact="${p.id}" tabindex="0"><td><b>${esc(p.name||p.email||'')}</b><br><span class="mut">${esc(ROLES[p.role]||'')}</span></td><td>${tfmt(x.last_login)}</td><td>${tfmt(x.last_act)}</td><td class="n">${x.n7||0}</td><td class="n">${x.n30||0}</td><td class="n">${x.n_all||0}</td></tr>`}).join('');
  return `<div class="card" id="tact" style="padding:20px;margin-top:16px"><h2 style="margin-top:0">Активность по людям</h2>
   <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin-bottom:12px">
    <label>Сотрудник<br><select id="tact-who"><option value="">все сотрудники</option>${team.map(p=>`<option value="${p.id}"${TACT.who===p.id?' selected':''}>${esc(p.name||p.email||'')}</option>`).join('')}</select></label>
    <label>Период<br><select id="tact-per">${[['7','7 дней'],['30','30 дней'],['all','всё время']].map(([k,l])=>`<option value="${k}"${TACT.per===k?' selected':''}>${l}</option>`).join('')}</select></label>
    <span class="mut">Действия: реестр платежей, отметки в комплектации, публикации. Вход — последний вход на сайт.</span></div>
   <div style="overflow:auto"><table><thead><tr><th>Сотрудник</th><th>Последний вход</th><th>Последнее действие</th><th>7 дней</th><th>30 дней</th><th>Всего</th></tr></thead><tbody>${rows}</tbody></table></div>
   <h3 style="margin:18px 0 8px">${TACT.who?esc(nm(TACT.who)):'Все сотрудники'} · действий: ${ev.length}${ev.length>150?' (показаны последние 150)':''}</h3>
   <div style="overflow:auto"><table class="tact-ev"><thead><tr><th>Когда</th>${TACT.who?'':'<th>Кто</th>'}<th>Что сделано</th></tr></thead><tbody>${ev.slice(0,150).map(e=>`<tr><td style="white-space:nowrap">${tfmt(e.at)}</td>${TACT.who?'':`<td>${esc(nm(e.uid))}</td>`}<td>${esc(actText(e))}</td></tr>`).join('')||`<tr><td colspan="3" class="mut">За выбранный период действий нет</td></tr>`}</tbody></table></div></div>`}
document.addEventListener('change',e=>{if(e.target.id==='tact-who'){TACT.who=e.target.value;render()}else if(e.target.id==='tact-per'){TACT.per=e.target.value;render()}});
document.addEventListener('click',e=>{const r=e.target.closest('[data-tact]');if(r){TACT.who=TACT.who===r.dataset.tact?'':r.dataset.tact;render()}});
