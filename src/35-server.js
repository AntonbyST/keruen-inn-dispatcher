/* ---------- общая база Supabase: вход, роли, снимок данных, отметки ---------- */
const SRV={url:'__SB_URL__',key:'__SB_KEY__'};SRV.on=!!(SRV.url&&SRV.key&&!/^__/.test(SRV.url));
let AUTH=null;try{AUTH=JSON.parse(localStorage.getItem('kom_auth')||'null')}catch(e){}
let SB=null,SNAPID=null,pollT=null;
const ROLES={admin:'администратор',manager:'руководитель',tech:'техник',buyer:'снабженец',finance:'финансист',viewer:'просмотр'};
const canWrite=()=>!SRV.on||!!(AUTH&&AUTH.role&&AUTH.role!=='viewer');
const SECS=[['buy','Закупки'],['ved','Ведомость'],['prod','Производство'],['docs','Документация']];
const canSec=k=>!SRV.on||!!(AUTH&&(['admin','manager'].includes(AUTH.role)||(AUTH.sections||[]).includes(k)));
const canPublish=()=>!!(SRV.on&&AUTH&&(AUTH.role==='admin'||AUTH.role==='manager'));
const authSave=()=>{try{AUTH?localStorage.setItem('kom_auth',JSON.stringify(AUTH)):localStorage.removeItem('kom_auth')}catch(e){}};
const srvSetSB=()=>{SB=SRV.on&&AUTH?{}:null};
const rb=p=>SRV.url.replace(/\/$/,'')+p;
async function srvToken(){if(!AUTH)return null;if(AUTH.exp-60>Date.now()/1000)return AUTH.access;
  try{const r=await fetch(rb('/auth/v1/token?grant_type=refresh_token'),{method:'POST',headers:{apikey:SRV.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:AUTH.refresh})});if(!r.ok)throw new Error('refresh');
    const j=await r.json();Object.assign(AUTH,{access:j.access_token,refresh:j.refresh_token,exp:Math.floor(Date.now()/1000)+j.expires_in});authSave();return AUTH.access}
  catch(e){AUTH=null;authSave();srvSetSB();return null}}
async function srvFetch(path,opt={}){const t=await srvToken();if(!t)throw new Error('нужен вход');
  const r=await fetch(rb(path),{...opt,headers:{apikey:SRV.key,Authorization:'Bearer '+t,'Content-Type':'application/json',...(opt.headers||{})}});
  if(!r.ok){const tx=await r.text().catch(()=>'');throw new Error(r.status+(tx?' '+tx.slice(0,160):''))}return r}
async function srvFinish(j){
  AUTH={access:j.access_token,refresh:j.refresh_token,exp:Math.floor(Date.now()/1000)+j.expires_in,id:j.user.id,email:j.user.email,name:'',role:''};
  await srvMe(true)}
async function srvMe(strict){const p=await (await srvFetch('/rest/v1/profiles?select=name,role,active,sections,can_delete&id=eq.'+AUTH.id)).json();
  if(!p.length||!p[0].active||!p[0].role){AUTH=null;authSave();if(strict)throw new Error('Доступ ещё не выдан. Обратитесь к администратору.');srvSetSB();return false}
  AUTH.name=p[0].name||AUTH.email;AUTH.role=p[0].role;AUTH.sections=p[0].sections||[];AUTH.canDel=!!p[0].can_delete;authSave();return true}
const jh=()=>({apikey:SRV.key,'Content-Type':'application/json'});
// вход по почте: на адрес приходит код, вводим его на странице; пароль остаётся запасным способом
async function srvSendCode(email){
  const r=await fetch(rb('/auth/v1/otp'),{method:'POST',headers:jh(),body:JSON.stringify({email,create_user:false})});
  if(r.ok)return;let m='';try{const j=await r.json();m=String(j.msg||j.message||j.error_description||'')}catch(e){}
  if(r.status===429||/rate limit|seconds|too many/i.test(m))throw new Error('Письмо уже отправлено. Подождите минуту и повторите.');
  if(/signups not allowed|not found|user/i.test(m))throw new Error('Эта почта не зарегистрирована. Обратитесь к администратору.');
  throw new Error('Не удалось отправить письмо. Проверьте адрес и повторите позже.')}
async function srvVerify(email,code){
  const r=await fetch(rb('/auth/v1/verify'),{method:'POST',headers:jh(),body:JSON.stringify({type:'email',email,token:code})});
  if(!r.ok)throw new Error('Неверный или просроченный код');await srvFinish(await r.json())}
async function srvLogin(email,pass){
  const r=await fetch(rb('/auth/v1/token?grant_type=password'),{method:'POST',headers:jh(),body:JSON.stringify({email,password:pass})});
  if(!r.ok)throw new Error('Неверная почта или пароль');await srvFinish(await r.json())}
function srvLogout(){AUTH=null;authSave();srvSetSB();CK={};try{localStorage.removeItem('kom_ck')}catch(e){}S.Z=[];S.R=[];S.at=null;SNAPID=null;PAY.rows=[];PAY.on=false;PAY.at='';PAY.merged=null;PAY.base=null;MARKU='';S.local=false;S.msg='';render()}
/* отметки и настройки (таблица marks): страницы «Заявки», этапы, чек-листы */
let MARKU='',pollN=0;
// после первой загрузки забираем только новые записи (по времени на сервере), раз в ~10 минут сверяем всё заново
async function sbPull(full=true){if(!SB)return false;try{const o={};let from=0,mx=full?'':MARKU;const flt=(!full&&MARKU)?'&upd=gt.'+encodeURIComponent(MARKU):'';
    for(;;){const r=await srvFetch('/rest/v1/marks?select=k,v,u,d,t,upd&order=upd'+flt,{headers:{'Range-Unit':'items',Range:from+'-'+(from+999)}});const a=await r.json();for(const x of a){o[x.k]={v:x.v,u:x.u,d:x.d,t:+x.t};if(x.upd&&x.upd>mx)mx=x.upd}if(a.length<1000)break;from+=1000}
    MARKU=mx;const ch=ckMerge(o);if(ch)ckSave();S.ckSync='общая база Supabase';S.sbErr='';return ch}
  catch(e){S.ckSync='база недоступна, отметки пока только здесь';S.sbErr=String(e.message||e);return false}}
async function sbPush(keys){if(!SB)return;try{const rows=keys.map(k=>({k,v:CK[k].v,u:CK[k].u||'',d:CK[k].d||'',t:CK[k].t||0}));
    for(let i=0;i<rows.length;i+=500)await srvFetch('/rest/v1/marks',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows.slice(i,i+500))});
    S.ckSync='общая база Supabase';S.sbErr=''}catch(e){S.ckSync='база недоступна, отметки пока только здесь';S.sbErr=String(e.message||e)}}
function sbWatch(){}
function srvOv(k){if(!SRV.on)return;const kk='ov|'+k;CK[kk]={v:OV[k]?OV[k][0]:'',u:CKUSER,d:ckStamp(),t:Date.now()};ckSave();sbPush([kk])}
function srvRate(v){if(!SRV.on)return;CK['cfg|rate']={v:String(v),u:CKUSER,d:ckStamp(),t:Date.now()};ckSave();sbPush(['cfg|rate'])}
function srvApply(){if(!SRV.on)return;const ov={};for(const k in CK)if(k.startsWith('ov|')&&CK[k].v)ov[k.slice(3)]=[String(CK[k].v)];
  OV=ov;const r=CK['cfg|rate'];if(r&&+r.v>0)RATE=+r.v;if(S.Z.length)relate()}
/* снимок данных: папки читает руководитель, остальные получают результат */
async function srvSnap(force){const r=await srvFetch('/rest/v1/snapshots?select=id,at,note&order=id.desc&limit=1');const a=await r.json();
  if(!a.length){if(!S.Z.length)S.msg=canPublish()?'':'Данные ещё не опубликованы. Дождитесь, пока руководитель выложит заявки и реестры.';return false}
  if(!force&&(a[0].id===SNAPID||S.local))return false;if(S.local&&force&&S.Z.length)return false;
  const d=(await (await srvFetch('/rest/v1/snapshots?select=data&id=eq.'+a[0].id)).json())[0].data;
  S.Z=d.Z;S.R=d.R;S.at=new Date(a[0].at);S.snap=a[0].note||'';SNAPID=a[0].id;S.msg='';relate();pushLive();return true}
async function srvPublish(){if(!canPublish()||!S.Z.length)return;const b=$('#pub');b.disabled=true;b.textContent='Публикую…';
  try{const R=S.R.map(r=>{const o={...r};delete o.cand;delete o.zs;delete o.manual;delete o.eta;return o});
    await srvFetch('/rest/v1/snapshots',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({at:(S.at||new Date()).toISOString(),note:'опубликовал(а) '+AUTH.name,data:{Z:S.Z,R}})});
    S.local=false;SNAPID=null;S.msg='Опубликовано: теперь данные видят все, кому выдан доступ.'}
  catch(e){S.msg='Не удалось опубликовать: '+e.message}
  b.disabled=false;b.textContent='Опубликовать для всех';render()}
async function srvProd(){if(!SRV.on||PROD_HTML)return;try{const t=await srvToken();const r=await fetch(rb('/storage/v1/object/authenticated/assets/prod.html'),{headers:{apikey:SRV.key,Authorization:'Bearer '+t}});if(!r.ok)return;
  PROD_HTML=await r.text();const m=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(PROD_HTML);if(m)PD=JSON.parse(m[1]);fixPD();blobUrl=null;const ph=$('#prodhost');if(ph)ph.innerHTML=''}catch(e){}}
async function srvBoot(){srvSetSB();if(!SRV.on||!AUTH){render();return}
  CKUSER=AUTH.name||AUTH.email;
  try{if(!(await srvMe(false))){render();return}
    const f=SECS.map(x=>x[0]).find(canSec);if(!canSec(S.sec)&&f)S.sec=f;if(AUTH.role==='buyer'&&canSec('buy')){S.sec='buy';S.tab.buy='r'}
    await sbPull();if(canSec('buy')||canSec('ved'))await srvSnap(true);if(canSec('buy')){await payLoad(true);payPoll()}if(canSec('prod'))await srvProd()}catch(e){S.msg='Нет связи с базой: '+e.message}
  srvApply();render();srvPoll()}
function srvPoll(){if(pollT)return;pollT=setInterval(async()=>{if(document.hidden||!AUTH)return;const a=document.activeElement;if(a&&(a.tagName==='INPUT'||a.tagName==='SELECT'))return;
  try{const c1=await sbPull(++pollN%30===0);const c2=(canSec('buy')||canSec('ved'))?await srvSnap(false):false;srvApply();if(c1||c2)render()}catch(e){}},20000)}
function srvHeader(){const w=$('#who');if(!w)return;
  if(!SRV.on){w.hidden=true;$('#pub').hidden=true;return}
  const ok=!!AUTH;for(const id of ['secs','hot','sub'])$('#'+id).style.display=ok?'':'none';
  w.hidden=!ok;w.innerHTML=ok?`${esc(AUTH.name)} · <span class="mut">${esc(ROLES[AUTH.role]||AUTH.role)}</span> <button class="act" id="out">Выйти</button>`:'';
  $('#pub').hidden=!(canPublish()&&S.Z.length&&S.local);
  $('#pick').hidden=!(ok&&canPublish());if(!(ok&&canPublish()))$('#reload').hidden=true;
  const o=$('#out');if(o)o.onclick=srvLogout}
function loginView(){const st=S.lstep||'email',err=`<p class="red" id="lerr">${esc(S.lerr||'')}</p>`;let h;
  if(st==='code')h=`<h2 style="margin-top:0">Введите код из письма</h2><p class="mut">Код отправлен на <b>${esc(S.lem)}</b>. Он действует недолго.</p>
    <form id="lc"><label>Код<br><input id="lcode" inputmode="numeric" autocomplete="one-time-code" maxlength="10" required autofocus></label>${err}<button class="act p" type="submit" id="lgo">Войти</button></form>
    <p><button class="chip" type="button" data-lx="resend">Отправить код ещё раз</button> <button class="chip" type="button" data-lx="email">Другая почта</button></p>`;
  else if(st==='pass')h=`<h2 style="margin-top:0">Вход по паролю</h2><form id="lp"><label>Почта<br><input id="lem" type="email" autocomplete="username" required value="${esc(S.lem||'')}"></label><br><br><label>Пароль<br><input id="lpw" type="password" autocomplete="current-password" required></label>${err}<button class="act p" type="submit" id="lgo">Войти</button></form>
    <p><button class="chip" type="button" data-lx="email">Войти по коду из письма</button></p>`;
  else h=`<h2 style="margin-top:0">Вход</h2><p class="mut">Укажите рабочую почту. Мы отправим на неё код для входа.</p>
    <form id="lf"><label>Почта<br><input id="lem" type="email" autocomplete="username" required value="${esc(S.lem||'')}"></label>${err}<button class="act p" type="submit" id="lgo">Отправить код</button></form>
    <p><button class="chip" type="button" data-lx="pass">Войти по паролю</button></p>`;
  return `<div class="hello"><div class="card" style="padding:28px;max-width:420px">${h}<p class="mut">Доступ выдаёт администратор.</p></div></div>`}
document.addEventListener('submit',async e=>{const id=e.target.id;if(!['lf','lc','lp'].includes(id))return;e.preventDefault();const b=$('#lgo');b.disabled=true;S.lerr='';
  try{
    if(id==='lf'){const em=$('#lem').value.trim().toLowerCase();S.lem=em;await srvSendCode(em);S.lstep='code';render()}
    else if(id==='lc'){await srvVerify(S.lem,$('#lcode').value.replace(/\s/g,''));S.lstep='email';await srvBoot()}
    else{S.lem=$('#lem').value.trim().toLowerCase();await srvLogin(S.lem,$('#lpw').value);S.lstep='email';await srvBoot()}
  }catch(er){S.lerr=String(er.message||er);render()}});
document.addEventListener('click',async e=>{const t=e.target.closest('[data-lx]');if(!t)return;const x=t.dataset.lx;S.lerr='';
  if(x==='email'){S.lstep='email';render()}else if(x==='pass'){S.lstep='pass';render()}
  else if(x==='resend'){t.disabled=true;try{await srvSendCode(S.lem);S.lerr='Код отправлен ещё раз.'}catch(er){S.lerr=String(er.message||er)}render()}});
{const p=$('#pub');if(p)p.onclick=srvPublish}
