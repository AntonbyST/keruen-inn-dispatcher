/* ---------- реестр платежей в базе (вариант Д: таблица как в Excel + карточка) ---------- */
const PMON=['окт 26','ноя 26','дек 26','янв 27','фев 27','мар 27','апр 27','май 27','июн 27','июл 27','авг 27','сен 27'];
const PENT=[['svk','ООО ИНДУСТРИЯ СВК (РБ)','ИНДУСТРИЯ СВК'],['tdv','ТОРГОВЫЙ ДОМ ВДС (РФ)','ТОРГОВЫЙ ДОМ ВДС'],['vdskz','ТОО VDS KAZAKHSTAN','ТОО VDS KAZAKHSTAN']];
const PST=[['persp','Перспективный'],['plan','Запланирован к оплате'],['paid','Оплачен'],['pause','На паузе'],['budget','Согласован бюджетом сборки и монтажа'],['defer','Отсрочка']];
const PSTN=Object.fromEntries(PST);
const PCUR=['BYN','RUB','KZT','USD','CNY'];
/* разделы: 22 заявки на комплектацию (З-01…З-22) + прочие статьи Устава + разделы, созданные администратором */
const PSEC_REQ=['З-01 Оборудование','З-02 Слаботочные сети','З-03 Металл','З-04 Стройматериалы','З-05 Черновая электрика','З-06 Вентиляция и кондиционирование','З-07 Котельная','З-08 Остекление','З-09 Отделка','З-10 Потолки','З-11 Черновая сантехника','З-12 Декор','З-13 Мебель','З-14 Текстиль','З-15 Фурнитура','З-16 Чистовая сантехника','З-17 Чистовая электрика и светотехника','З-18 Двери','З-19 Упаковка','З-20 СМР (материалы на объект)','З-21 Прочее по ведомости','З-22 Собственное производство'];
const PSEC_OTH=['дизайн','проектирование','логистика + упаковка (модуль)','комплектация СМР','сборка (сопровождение)','сборка (подрячики + сс)','сборка (инвестиции)','сборка (накладные/вспом пр-во)','сборка (оснащение)','монтаж (сопровождение)','монтаж (подрядные пакеты + сс)','монтаж (машины механизмы)','монтаж (материалы оборудование)','монтаж (транспорт)','монтаж (оснащение)','монтаж (инвестиции)'];
const psecCus=()=>(PAY.secs||[]).map(x=>x.name);
const psecList=()=>PSEC_REQ.concat(PSEC_OTH,psecCus());
const psecOpts=cur=>{const o=x=>`<option${x===cur?' selected':''}>${esc(x)}</option>`;const cs=psecCus();
  return `<optgroup label="Заявки на комплектацию">${PSEC_REQ.map(o).join('')}</optgroup><optgroup label="Прочие разделы">${PSEC_OTH.map(o).join('')}</optgroup>${cs.length?`<optgroup label="Созданные администратором">${cs.map(o).join('')}</optgroup>`:''}${cur&&!psecList().includes(cur)?`<optgroup label="Устарело — выберите раздел"><option selected>${esc(cur)}</option></optgroup>`:''}`};
const PRF=['byn_rub','rub_kzt','byn_kzt','usd_kzt','cny_kzt'];
const PAY={rows:[],plan:{},part:null,rates:{},fx:{},fxReq:{},log:{},at:'',on:false,err:'',ver:0,base:null,merged:null,imp:null,del:'',t:null};
// столбцы таблицы, порядок как в листе Excel
const PCOL=[['sup','Поставщик','t',340],['descr','Описание','t',180],['art','Раздел','tag',160],['_pct','%','pct',104],['amt','К оплате','n',178],['week','Нед.','i',54],['ok','Согл.','ok',52],['resp','Ответственный','t',120]];
const PMN=['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const PECUR={svk:'BYN',tdv:'RUB',vdskz:'KZT'};
const canPaid=()=>!SRV.on||!!(AUTH&&['admin','manager','finance'].includes(AUTH.role));
const canPay=()=>!SRV.on||!!(AUTH&&['admin','manager','tech','buyer','finance'].includes(AUTH.role)&&canSec('buy'));
const canOk=()=>!!(AUTH&&['admin','manager'].includes(AUTH.role));
const canDelPay=()=>!!(SRV.on&&AUTH&&(AUTH.role==='admin'||AUTH.canDel));
const canPreq=()=>!!(SRV.on&&AUTH&&['admin','finance'].includes(AUTH.role));
const pnum=v=>{if(v==null||v==='')return null;const x=parseFloat(String(v).replace(/\s| /g,'').replace(',','.'));return isNaN(x)?null:x};
const pf2=n=>n==null||isNaN(n)?'':Number(n).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2});
const pf0=n=>n==null||isNaN(n)?'—':Math.round(n).toLocaleString('ru-RU');
// курс месяца: на 1-е число от нацбанков (fx_rates), поверх — то, что ввели вручную для отеля; месяц ещё не начался — курс прошлого месяца
function prate(h,m,depth){const fx=PAY.fx[m],man=PAY.rates[h+'|'+m];
  if(!fx&&!man){const i=PMON.indexOf(m);if(i>0&&(depth||0)<12){const p=prate(h,PMON[i-1],(depth||0)+1);return{...p,src:p.src==='none'?'none':'prev',from:p.src==='prev'?p.from:PMON[i-1]}}return{src:'none'}}
  const r={src:fx?'auto':'manual',label:fx?fx.src:'',man:{}};for(const f of PRF){const mv=man&&man[f]!=null?+man[f]:null;r[f]=mv!=null?mv:fx&&fx[f]!=null?+fx[f]:null;if(mv!=null&&(!fx||+fx[f]!==mv))r.man[f]=true}
  if(Object.keys(r.man).length)r.src='manual';return r}
const pmonFirst=m=>{const i=['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'].indexOf(m.slice(0,3));return new Date(Date.UTC(2000+ +m.slice(-2),i,1))};
async function payFx(m){if(PAY.fx[m]||PAY.fxReq[m]||pmonFirst(m)>TODAY)return false;PAY.fxReq[m]=1;
  try{const r=await (await srvFetch('/rest/v1/rpc/fx_month',{method:'POST',body:JSON.stringify({m})})).json();if(r&&r.month){PAY.fx[m]=r;PAY.ver++;return true}}catch(e){PAY.fxErr='Курс на 1-е число не получен: '+String(e.message||e).slice(0,120)}return false}
async function payFxAll(){let ch=false;for(const m of PMON)if(await payFx(m))ch=true;return ch}
// формулы столбцов I и J из реестра: НДС BYN 20%, KZT 16%, RUB 22%; USD и CNY — через курс к тенге
function pconv(p){const R=prate(p.hotel,p.month),g=+p.amt||0,c=p.cur,w=p.vat!=='без НДС',d=w?({BYN:1.2,KZT:1.16,RUB:1.22}[c]||1):1;
  const n=v=>v==null||isNaN(+v)||!+v?null:+v,rk=n(R.rub_kzt),br=n(R.byn_rub),bk=n(R.byn_kzt),uk=n(R.usd_kzt),ck=n(R.cny_kzt);let rub=null,kzt=null;
  if(c==='BYN'){rub=br?g*br/d:null;kzt=bk?g*bk/d:null}
  else if(c==='KZT'){rub=rk?g/rk/d:null;kzt=g/d}
  else if(c==='RUB'){rub=g/d;kzt=rk?g*rk/d:null}
  else if(c==='USD'){kzt=uk?g*uk:null;rub=kzt!=null&&rk?kzt/rk:null}
  else if(c==='CNY'){kzt=ck?g*ck:null;rub=kzt!=null&&rk?kzt/rk:null}
  return{rub,kzt}}
// платежи одного счёта: тот же поставщик, обоснование и сумма счёта
const pinvKey=p=>p.hotel+'|'+skey(p.sup)+'|'+String(p.basis||'').trim()+'|'+(+p.inv_amt||0);
const pinvRows=p=>+p.inv_amt?PAY.rows.filter(q=>pinvKey(q)===pinvKey(p)):[p];
const pkind=p=>{const n=p.note||'';if(/Доплат/i.test(n))return 'bal';if(/Старт|аванс/i.test(n))return 'adv';return +p.inv_amt>(+p.amt||0)+0.005?'adv':'one'};
const PKL={adv:'аванс',bal:'доплата',one:''};
const ptagc=n=>{if(!n)return '';let h=0;for(const ch of String(n))h=(h*31+ch.charCodeAt(0))>>>0;return ['#6fb7e9','#e9a46f','#7fd6a4','#c59af0','#e9d36f','#f08a8a','#6fd6d0','#e08fc4'][h%8]};
function pnoteSet(note,kind,pc){let n=String(note||'').split(' · ').filter(x=>x&&!/^(Старт|Доплата|Аванс)\s*-?\s*[\d.,]+\s*%?$/i.test(x.trim()));const lab=kind==='adv'?'Старт - '+pc+'%':kind==='bal'?'Доплата - '+pc+'%':'';return [lab,...n].filter(Boolean).join(' · ')}
async function payKind(id,kind){const p=PAY.rows.find(r=>r.id===id);if(!p)return;const pc=ppct(p);await payUpd(id,{note:pnoteSet(p.note,kind,pc)})}
const prest=p=>{const inv=+p.inv_amt||0;if(!inv)return 0;const r=inv-pinvRows(p).reduce((a,q)=>a+(+q.amt||0),0);return r>0.5?Math.round(r*100)/100:0};
const ppct=p=>{const inv=+p.inv_amt||0,a=+p.amt||0;return inv&&a?Math.round(a/inv*1000)/10:100};
function pisoWk(d){const t=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));t.setUTCDate(t.getUTCDate()+4-(t.getUTCDay()||7));const y0=new Date(Date.UTC(t.getUTCFullYear(),0,1));return Math.ceil(((t-y0)/864e5+1)/7)}
function pwarn(p){const w=[];const inv=+p.inv_amt||0,amt=+p.amt||0;
  if(p.status==='paid'&&prest(p)>0)w.push('Остаток по счёту '+pf2(prest(p))+' '+p.cur+' ещё не стоит в плане');
  if(p.status==='persp'&&!p.week&&/Доплата/.test(p.note||''))w.push('Для доплаты не выбрана неделя');
  if(inv&&amt>inv+0.005)w.push('Сумма платежа больше суммы счёта');
  const part=q=>(+q.inv_amt>0&&(+q.amt||0)<+q.inv_amt-0.005)||/Старт|Доплат|аванс|\d\s*%/i.test(q.note||'');
  if(p.basis&&!part(p)&&PAY.rows.some(q=>q.id!==p.id&&!part(q)&&q.hotel===p.hotel&&q.month===p.month&&q.basis===p.basis&&skey(q.sup)===skey(p.sup)&&+q.amt===amt&&amt))w.push('Похоже на повтор: в этом месяце уже есть платёж с тем же поставщиком, обоснованием и суммой');
  return w}
/* ---- связь с базой ---- */
/* на 1-е число нового месяца все неоплаченные платежи прошлых месяцев переезжают в текущий месяц реестра */
const pmKey=m=>{const x=/^(\S+)\s+(\d\d)$/.exec(m||'');const i=x?PMN.indexOf(x[1]):-1;return i<0?null:(2000+ +x[2])*12+i};
async function payRoll(now){if(!SRV.on||!AUTH||!canPay()||PAY.rolling)return;now=now||TODAY;
  const cur=now.getUTCFullYear()*12+now.getUTCMonth();let tgt=null;for(const m of PMON){const k=pmKey(m);if(k!=null&&k<=cur)tgt=m}
  if(!tgt)return;const tk=pmKey(tgt);const mv=PAY.rows.filter(r=>r.status!=='paid'&&pmKey(r.month)!=null&&pmKey(r.month)<tk);if(!mv.length)return;
  PAY.rolling=true;let n=0;const wk=pisoWk(now);const from={};
  try{for(const r of mv.sort((a,b)=>a.pos-b.pos)){const same=PAY.rows.filter(x=>x.hotel===r.hotel&&x.month===tgt&&x.entity===r.entity);const pos=same.length?Math.max(...same.map(x=>x.pos))+1:1;
      const patch={month:tgt,pos,week:r.week?wk:null};const old=r.month;
      const j=await (await srvFetch('/rest/v1/payments?id=eq.'+r.id,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(patch)})).json();
      if(j[0]){Object.assign(r,j[0]);if(j[0].upd>PAY.at)PAY.at=j[0].upd;n++;from[old]=(from[old]||0)+1}}}
  catch(e){PAY.err='Перенос неоплаченных платежей не завершён: '+e.message}
  PAY.rolling=false;if(n){PAY.info='Новый месяц: '+n+' неоплаченных платежей перенесено на «'+tgt+'» (с '+Object.keys(from).join(', ')+').';PAY.ver++;S.pcl=S.pcl||{};S.pcl['m:'+tgt]=true;payRender()}}
async function payLoad(full){if(!SRV.on||!AUTH||!canSec('buy'))return false;
  try{const flt=(!full&&PAY.at)?'&upd=gt.'+encodeURIComponent(PAY.at):'';let ch=false;
    const a=await (await srvFetch('/rest/v1/payments?select=*&order=upd'+flt)).json();
    if(full){PAY.rows=a;ch=true}else for(const x of a){const i=PAY.rows.findIndex(r=>r.id===x.id);if(i>=0)PAY.rows[i]=x;else PAY.rows.push(x);ch=true}
    for(const x of a)if(x.upd>PAY.at)PAY.at=x.upd;
    if(full||!PAY.on){const b=await (await srvFetch('/rest/v1/pay_rates?select=*')).json();PAY.rates={};for(const x of b)PAY.rates[x.hotel+'|'+x.month]=x;
      const f=await (await srvFetch('/rest/v1/fx_rates?select=*')).json();for(const x of f)PAY.fx[x.month]=x;if(await payFxAll())ch=true;
      try{const q=await (await srvFetch('/rest/v1/budget_plan?select=*')).json();PAY.plan={};for(const x of q)PAY.plan[x.hotel+'|'+x.month]=x;ch=true}catch(e){}
      try{PAY.resps=await (await srvFetch('/rest/v1/pay_resps?select=name&order=name')).json()}catch(e){PAY.resps=PAY.resps||[]}
      try{PAY.secs=await (await srvFetch('/rest/v1/pay_sections?select=*&order=name')).json()}catch(e){PAY.secs=PAY.secs||[]}}
    if(full){const ids=new Set(PAY.rows.map(r=>r.id));void ids}
    PAY.on=true;PAY.err='';if(ch)PAY.ver++;if(!PAY.rolled){PAY.rolled=1;setTimeout(()=>payRoll(),50)}return ch}
  catch(e){PAY.err=String(e.message||e);return false}}
async function payUpd(id,patch){const p=PAY.rows.find(r=>r.id===id);if(!p)return;const old={};for(const k in patch)old[k]=p[k];Object.assign(p,patch);PAY.ver++;
  try{const r=await (await srvFetch('/rest/v1/payments?id=eq.'+id,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(patch)})).json();if(r[0]){Object.assign(p,r[0]);if(r[0].upd>PAY.at)PAY.at=r[0].upd}PAY.err='';delete PAY.log[id]}
  catch(e){Object.assign(p,old);PAY.err=/Согласовать/.test(e.message)?'Согласовать платёж может только руководитель':/Отметить оплаченным/.test(e.message)?'Отметить оплаченным может финансист или руководитель':'Не сохранилось: '+e.message}
  PAY.ver++;payRender()}
async function payCreate(ent,after,mo,v){v=v||{};const h=S.hs[0],m=mo||S.pm||PMON[0];S.pm=m;S.pcl=S.pcl||{};S.pcl['m:'+m]=true;const same=PAY.rows.filter(r=>r.hotel===h&&r.month===m&&r.entity===ent).sort((a,b)=>a.pos-b.pos);
  const pos=after?(()=>{const i=same.findIndex(r=>r.id===after);return i>=0&&same[i+1]?(same[i].pos+same[i+1].pos)/2:(same.length?same[same.length-1].pos+1:1)})():(same.length?same[same.length-1].pos+1:1);
  try{const r=await (await srvFetch('/rest/v1/payments',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({hotel:h,month:m,entity:ent,pos,cur:ent==='tdv'?'RUB':ent==='vdskz'?'KZT':'BYN',resp:AUTH&&AUTH.name||'',...v})})).json();
    PAY.rows.push(r[0]);S.psel=r[0].id;PAY.err='';PAY.ver++;payRender();return r[0]}catch(e){PAY.err='Строка не добавлена: '+e.message;payRender();return null}}
/* новый платёж — окно (вариант Н1): строка создаётся только по кнопке «Добавить» */
const psups=()=>{const c={};for(const r of PAY.rows){const s=String(r.sup||'').trim();if(s)c[s]=(c[s]||0)+1}return Object.keys(c).sort((a,b)=>c[b]-c[a]||a.localeCompare(b,'ru'))};
const pcurOf=e=>e==='tdv'?'RUB':e==='vdskz'?'KZT':'BYN';
const piso=d=>d.toISOString().slice(0,10),pdate=s=>new Date(s+'T00:00:00Z');
const pmonday=d=>new Date(d.getTime()-((d.getUTCDay()+6)%7)*DAY);
const ptdays=t=>{t=String(t||'');let m;if(m=/(\d+)\s*(?:дн|дней|день|дня)/i.exec(t))return +m[1];if(m=/(\d+)\s*нед/i.exec(t))return +m[1]*7;return null};
const pnorm=x=>String(x||'').replace(/\s+/g,' ').trim();
/* «Олег Гула» и «Гула» — один человек: если в списке уже есть такая фамилия одним словом, имя с фамилией сводится к ней; регистр и пробелы не важны */
/* закреплённые написания: «Олег Гула» → «Гула», «Екатерина Славская» → «Славская» */
const PRESP_AL={'олег гула':'Гула','екатерина славская':'Славская'};
function prespCanon(n,all){n=pnorm(n);if(!n)return '';const low=x=>x.toLocaleLowerCase('ru');if(PRESP_AL[low(n)])return PRESP_AL[low(n)];const names=all||prespRaw();const hit=names.find(x=>low(x)===low(n));if(hit&&hit.split(' ').length===1)return hit;
  const last=n.split(' ').pop();if(n.includes(' ')){const s1=names.find(x=>!x.includes(' ')&&low(x)===low(last));if(s1)return s1}return hit||n}
const prespRaw=()=>[...new Set([...(PAY.resps||[]).map(x=>pnorm(x.name)),...PAY.rows.map(r=>pnorm(r.resp))].filter(Boolean))];
const prespList=()=>{const raw=prespRaw(),out=new Map();for(const n of raw){const c=prespCanon(n,raw);out.set(c.toLocaleLowerCase('ru'),c)}return [...out.values()].sort((a,b)=>a.localeCompare(b,'ru'))};
async function payRespAdd(n){n=prespCanon(n);if(!n||(PAY.resps||[]).some(x=>x.name===n))return;(PAY.resps=PAY.resps||[]).push({name:n});
  try{await srvFetch('/rest/v1/pay_resps',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify([{name:n}])})}catch(e){}}
function payWeekSet(id,iso){const p=PAY.rows.find(r=>r.id===id);if(!p)return;if(!iso){payUpd(id,{week:null,...(p.status==='plan'?{status:'persp'}:{})});return}
  const d=pdate(iso),patch={week:pisoWk(d)},mo=pmonOf(d,p.month);if(mo!==p.month){const same=PAY.rows.filter(r=>r.hotel===p.hotel&&r.month===mo&&r.entity===p.entity);patch.month=mo;patch.pos=same.length?Math.max(...same.map(r=>r.pos))+1:1}
  if(p.status==='persp'&&!/^Доплата/.test(p.note||''))patch.status='plan';payUpd(id,patch)}
/* неделя не задана — ставим текущую (и переносим строку в месяц этой недели) */
function pwkFill(p,patch){if(p.week||patch.week)return patch;const d=weekMonday(TODAY.getUTCFullYear(),pisoWk(TODAY)),mo=pmonOf(d,p.month);patch.week=pisoWk(d);
  if(mo!==p.month){const same=PAY.rows.filter(r=>r.hotel===p.hotel&&r.month===mo&&r.entity===p.entity);patch.month=mo;patch.pos=same.length?Math.max(...same.map(r=>r.pos))+1:1}return patch}
/* время недели платежа с учётом границы года: неделя 1 в «дек» — это январь следующего года, 52/53 в «янв» — декабрь прошлого */
const pwkT=r=>{if(!r.week)return 0;const y=2000+ +String(r.month).slice(-2),mi=PMON.indexOf(r.month),mid=mi<0?null:Date.UTC(2026,9+mi,15);let t=weekMonday(y,r.week).getTime();if(mid!=null){for(const d of [-1,1]){const t2=weekMonday(y+d,r.week).getTime();if(Math.abs(t2-mid)<Math.abs(t-mid))t=t2}}return t};
function pweekOpts(p){const y=2000+ +p.month.slice(-2),cur=p.week?weekMonday(y,p.week):null,t=new Date(TODAY),b=weekMonday(t.getUTCFullYear(),pisoWk(t)),out=[];
  for(let i=-8;i<=40;i++){const a=new Date(b.getTime()+i*7*DAY);out.push(piso(a))}
  const ci=cur?piso(cur):null;if(ci&&!out.includes(ci)){out.push(ci);out.sort()}
  return `<option value=""${p.week?'':' selected'}>не выбрана</option>`+out.map(i=>`<option value="${i}"${ci===i?' selected':''}>${esc(pwkLab(i))}</option>`).join('')}
function pdeliv(p){const d=ptdays(p.term);if(d==null)return '';const paid=p.status==='paid'&&p.paid_date,wm=p.week?weekMonday(2000+ +p.month.slice(-2),p.week):null,b=paid?pdate(String(p.paid_date).slice(0,10)):wm;if(!b)return `<div class="pdeliv mut">Срок поставки ${esc(p.term)} · выберите неделю оплаты — посчитаю приход</div>`;
  return `<div class="pdeliv">Поставка ≈ <b>${pfdt(piso(new Date(b.getTime()+d*DAY)))}</b> <span class="mut">· ${esc(p.term)} ${paid?'от фактической оплаты':'от плановой недели оплаты'}</span></div>`}
const pwkLab=iso=>{if(!iso)return '';const a=pdate(iso),z=new Date(a.getTime()+6*DAY);return pisoWk(a)+' неделя · '+pfd(a)+' – '+pfd(z)};
const pnFmt=s=>{s=String(s).replace(/[^\d.,]/g,'').replace('.',',');const i=s.indexOf(',');let a=i<0?s:s.slice(0,i),b=i<0?null:s.slice(i+1).replace(/,/g,'').slice(0,2);a=a.replace(/^0+(?=\d)/,'').replace(/\B(?=(\d{3})+(?!\d))/g,' ');return b==null?a:a+','+b};
const plotOpts=h=>{const o=[];for(const z of S.Z){const H=z.h&&z.h[h];if(!H)continue;for(const l of H.lots)for(const c of l.codes)o.push({v:c,lab:(l.sup||'')+' · '+z.n,sup:l.sup||''})}return o};
function pnW2(N){if(N.w2)return N.w2;if(N.w2none||!N.mon)return '';return piso(new Date(pdate(N.mon).getTime()+28*DAY))}
function pnAmt(N){const inv=pnum(N.inv),pc=N.link||N.terms==='adv'?(pnum(String(N.pct).replace('%',''))||100):100;return{inv,pc,amt:inv?Math.round(inv*pc)/100:null}}
function pnDup(N){if(N.link||N.dupNo)return null;const inv=pnum(N.inv),k=skey(N.sup);if(!k||!inv)return null;const h=S.hs[0];
  return PAY.rows.find(q=>q.hotel===h&&skey(q.sup)===k&&(Math.abs((+q.inv_amt||0)-inv)<0.5||Math.abs((+q.amt||0)-inv)<0.5))||null}
function pnDupHtml(N){if(N.link){const q=PAY.rows.find(r=>r.id===N.link);return q?`<div class="pndup ok"><b>Доплата по счёту.</b> ${esc(q.sup)} · ${esc(q.descr||'')} · счёт ${pf2(q.inv_amt)} ${esc(q.cur)}. Сумма и процент подставлены.<div class="pnl"><button class="chip" data-pnx="unlink" type="button">Отвязать</button></div></div>`:''}
  const q=pnDup(N);if(!q)return '';const iv=+q.inv_amt||+q.amt,done=pinvRows(q).filter(x=>x.status==='paid').reduce((a,x)=>a+(+x.amt||0),0),pc=iv?Math.round(done/iv*100):0,rest=prest(q);
  return `<div class="pndup"><b>Возможный дубль.</b> Тот же поставщик и счёт на ту же сумму уже есть в реестре:<br>«${esc(q.descr||'без описания')}» · счёт ${pf2(iv)} ${esc(q.cur)} · ${esc(q.month)}${q.week?', нед. '+q.week:''} · оплачено ${pc}%
   <div class="pnl">${rest>0?`<button class="chip" data-pnx="link:${q.id}" type="button">Это доплата — привязать</button>`:'<span class="mut">остаток по этому счёту уже стоит в плане</span>'}<button class="chip" data-pnx="open:${q.id}" type="button">Открыть строку</button><button class="chip" data-pnx="nodup" type="button">Нет, это другой счёт</button></div></div>`}
function pnCalHtml(N,f){const sel=f==='w2'?pnW2(N):N.mon;const y=N.cy,m=N.cm,h=S.hs[0];const first=new Date(Date.UTC(y,m,1)),last=new Date(Date.UTC(y,m+1,0));let d=pmonday(first);const rows=[];
  while(d<=last){const mo=pmonOf(d,'');const nw=PAY.rows.filter(r=>r.hotel===h&&r.week===pisoWk(d)&&r.month===mo).length,end=new Date(d.getTime()+6*DAY);const iso=piso(d);
    rows.push(`<tr data-pnwk="${iso}" data-pnf="${f}" class="${sel===iso?'s':''}${end<TODAY?' p':''}"><td class="w">${pisoWk(d)}${nw?`<i class="pl" title="уже платежей: ${nw}"></i>`:''}</td>${[0,1,2,3,4,5,6].map(i=>{const x=new Date(d.getTime()+i*DAY);return `<td class="${x.getUTCMonth()!==m?'o':''}">${x.getUTCDate()}</td>`}).join('')}</tr>`);d=new Date(d.getTime()+7*DAY)}
  const MN=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  return `<div class="pncal"><div class="h"><button type="button" class="chip" data-pncm="-1" aria-label="Предыдущий месяц">‹</button><b>${MN[m]} ${y}</b><button type="button" class="chip" data-pncm="1" aria-label="Следующий месяц">›</button></div>
   <table><tr><th></th><th>пн</th><th>вт</th><th>ср</th><th>чт</th><th>пт</th><th>сб</th><th>вс</th></tr>${rows.join('')}</table><div class="note"><i class="pl"></i> на этой неделе уже есть платежи · нажмите на строку, чтобы выбрать неделю</div></div>`}
function pnW2Html(N){const {inv,pc,amt}=pnAmt(N);if(N.link||!inv||pc>=100||pc<=0)return '';const w=pnW2(N),rest=Math.round((inv-amt)*100)/100;
  return `<div class="pnf"><span class="lab">Неделя доплаты · ${pf2(rest)} ${esc(N.cur)} (${Math.round((100-pc)*10)/10}%)</span><button type="button" class="inp pnsel" data-pncal="w2"><span>${w?esc(pwkLab(w))+(N.w2?'':' · предложено, +4 нед.'):'неделя неизвестна — останется в этом месяце'}</span><span class="mut">▾</span></button>
   ${N.cal==='w2'?pnCalHtml(N,'w2')+'<div class="pnl"><button type="button" class="chip" data-pnx="w2none">Неделя неизвестна</button></div>':''}</div>`}
function pnSumHtml(N){const {inv,amt}=pnAmt(N);const l=N.terms==='defer'&&!N.link?'К оплате после отсрочки':'К оплате сейчас';return inv?`<span class="mut">${l}</span> <b class="num">${pf2(amt)} ${esc(N.cur)}</b>`:`<span class="mut">${l}</span> <b>—</b>`}
function pnPaint(){const N=S.pnew;if(!N)return;const L=N._l=N._l||{};const set=(id,h)=>{const e=document.getElementById(id);if(e&&L[id]!==h){L[id]=h;e.innerHTML=h}};set('pn-dup',pnDupHtml(N));set('pn-w2',pnW2Html(N));set('pn-sum',pnSumHtml(N));set('pn-zh',pnZHint(N));{const e=document.getElementById('pn-advsum');if(e&&e!==document.activeElement){const a=pnAmt(N).amt;e.value=a!=null?pf2(a):'';e.disabled=!pnAmt(N).inv}}{const pc=pnAmt(N).pc;document.querySelectorAll('[data-pnpc]').forEach(b=>b.classList.toggle('on',+b.dataset.pnpc===+pc))}
  for(const [id,k] of [['pn-ent','ent'],['pn-cur','cur'],['pn-vat','vat'],['pn-sup','sup'],['pn-descr','descr'],['pn-lot','lot'],['pn-art','art'],['pn-resp','resp'],['pn-ddays','ddays'],['pn-tnum','tnum'],['pn-pct','pct']]){const e=document.getElementById(id);if(e&&e!==document.activeElement&&e.value!==String(N[k]||''))e.value=N[k]||''}}
function payNewOpen(ent,after,mo){const t=new Date(TODAY);S.pnew={ent,after,mo,sup:'',descr:'',inv:'',pct:'30',cur:pcurOf(ent),vat:'с НДС',mon:null,urgent:false,lot:'',art:'',resp:'',tnum:'',tunit:'дн.',terms:'full',ddays:'30',w2:'',w2none:false,cal:null,cy:t.getUTCFullYear(),cm:t.getUTCMonth(),files:[],link:null,dupNo:false,err:''};render();setTimeout(()=>{const i=document.getElementById('pn-sup');if(i)i.focus()},0)}
/* заявки отеля для выбора номера заявки; раздел З-NN подставляется из заявки */
const pzList=h=>S.Z.filter(z=>z.h&&z.h[h]).sort((a,b)=>a.n.localeCompare(b.n,'ru',{numeric:true}));
const pnZ=N=>String(N.art||'').startsWith('z:')?S.Z.find(z=>z.n===N.art.slice(2))||null:null;
const pnSec=N=>{const z=pnZ(N);return z?(psecList().find(x=>x.startsWith(z.sec+' '))||z.sec):String(N.art||'')};
const pnNeedNo=N=>!pnZ(N)&&/^З-\d\d/.test(String(N.art||''));
function pnLot(N){const z=pnZ(N),h=S.hs[0],k=skey(N.sup||'');if(!z||!k||!z.h[h])return '';const l=z.h[h].lots.find(l=>l.skey&&(l.skey===k||(Math.min(l.skey.length,k.length)>=5&&(l.skey.includes(k)||k.includes(l.skey)))));return l&&l.codes&&l.codes[0]||''}
function pnZHint(N){const z=pnZ(N);if(!z)return pnNeedNo(N)?'<span class="mut">Заявки нет в списке — впишите её номер</span>':'';const lot=pnLot(N);
  return `<span class="mut">Выбрана заявка:</span> <span class="pntg">${esc(z.n)}${z.t?' · '+esc(z.t):''}</span>${lot?` <span class="mut">· лот</span> ${esc(lot)} <span class="mut">(по поставщику)</span>`:''}`}
function pnAdvHtml(N){if(N.terms!=='adv'&&!N.link)return '';const {inv,pc,amt}=pnAmt(N);
  return `<div class="pnpan"><div class="pnpc"><span class="mut pnpl">${N.link?'Доплата':'Аванс'}</span>${N.link?'':[30,50,70].map(x=>`<button type="button" class="chip${+pc===x?' on':''}" data-pnpc="${x}">${x}%</button>`).join('')}<input id="pn-pct" inputmode="decimal" value="${esc(String(N.pct).replace('%',''))}" aria-label="Процент аванса"${N.link?' readonly':''}><span class="mut">%</span>${N.link?'':`<span class="mut">или сумма</span><input id="pn-advsum" class="pnas" inputmode="decimal" autocomplete="off" value="${amt!=null?esc(pf2(amt)):''}" aria-label="Сумма аванса"${inv?'':' disabled'}>`}</div>
   <div id="pn-w2">${pnW2Html(N)}</div></div>`}
function payNewView(){const N=S.pnew;N._l={'pn-dup':pnDupHtml(N),'pn-w2':pnW2Html(N),'pn-sum':pnSumHtml(N),'pn-zh':pnZHint(N)};const f=k=>esc(N[k]||''),{pc}=pnAmt(N);const h=S.hs[0],zs=pzList(h).filter(z=>z.st==='appr');
  const zo=zs.length?`<optgroup label="Согласованные заявки">${zs.map(z=>`<option value="z:${esc(z.n)}"${N.art==='z:'+z.n?' selected':''}>${esc(z.n)} · ${esc(z.t||'')}</option>`).join('')}</optgroup>`:'';
  const zold=(()=>{const o=x=>`<option${x===N.art?' selected':''}>${esc(x)}</option>`,cs=psecCus(),cur=String(N.art||'');return `<optgroup label="Прочие разделы">${PSEC_OTH.map(o).join('')}</optgroup>${cs.length?`<optgroup label="Созданные администратором">${cs.map(o).join('')}</optgroup>`:''}${cur&&!cur.startsWith('z:')&&!PSEC_OTH.includes(cur)&&!cs.includes(cur)?`<optgroup label="Прежнее значение"><option selected>${esc(cur)}</option></optgroup>`:''}`})();
  const T=N.link?'adv':N.terms;const seg=(k,l)=>`<button type="button" class="${T===k?'on':''}" data-pnt="${k}"${N.link?' disabled':''}>${l}</button>`;
  return `<div class="pmodal"><div class="card pimpc pnmod" role="dialog" aria-modal="true" aria-labelledby="pn-h"><h3 id="pn-h">Новый платёж<small>${esc(N.mo||S.pm)}</small></h3><div class="pnbody">
   <div class="pnf">${(N.files||[]).length?`${N.files.map((f,i)=>`<div class="pnfile"><b>📎 ${esc(f.name)}</b><span class="mut">${Math.round(f.size/1024)} КБ · <button type="button" class="lnk" data-pnx="openfile" data-i="${i}">открыть</button> · <button type="button" class="lnk" data-pnx="nofile" data-i="${i}">убрать</button></span></div>`).join('')}<label class="lnk">＋ добавить ещё файлы<input type="file" id="pn-file" accept="application/pdf,image/*" multiple hidden></label>`:`<label class="pndrop"><span class="ic">⇪</span><span><b>Прикрепить счёт</b><br><span class="mut">PDF или фото, можно несколько (необязательно)</span></span><input type="file" id="pn-file" accept="application/pdf,image/*" multiple hidden></label>`}</div>
   <div class="pnr pnr2"><div class="pnf"><span class="lab">Юрлицо</span><select id="pn-ent">${PENT.map(([k,,s])=>`<option value="${k}"${k===N.ent?' selected':''}>${s}</option>`).join('')}</select></div>
   <div class="pnf"><span class="lab">Поставщик</span><input id="pn-sup" list="psups" autocomplete="off" value="${f('sup')}" placeholder="начните вводить — подскажу из базы"></div></div>
   <div id="pn-dup">${pnDupHtml(N)}</div>
   <div class="pnf"><span class="lab">Номер заявки <b class="red">*</b></span><select id="pn-art" class="${N.art?'':'pnreq'}"><option value="">— выберите заявку —</option>${zo}${zold}</select>
     <div class="pnzh" id="pn-zh">${pnZHint(N)}</div>${pnNeedNo(N)?`<input id="pn-lot" autocomplete="off" value="${f('lot')}" placeholder="номер заявки, например З-10-02 или Э-259" style="margin-top:6px">`:''}</div>
   <div class="pnf"><span class="lab">Сумма счёта</span><div class="pnbig"><input id="pn-inv" inputmode="decimal" autocomplete="off" value="${f('inv')}" placeholder="0,00"${N.link?' readonly':''}><select id="pn-cur" aria-label="Валюта">${PCUR.map(x=>`<option${x===N.cur?' selected':''}>${x}</option>`).join('')}</select><select id="pn-vat" aria-label="НДС в счёте">${['с НДС','без НДС'].map(x=>`<option${x===N.vat?' selected':''}>${x}</option>`).join('')}</select></div></div>
   <div class="pnf"><span class="lab">Условия оплаты</span><div class="pnseg">${seg('full','Полная оплата')}${seg('adv','Аванс')}${seg('defer','Отсрочка')}</div>
     ${pnAdvHtml(N)}
     ${T==='defer'?`<div class="pnpan pnpc"><span class="mut">Отсрочка без процентов</span><input id="pn-ddays" inputmode="numeric" autocomplete="off" value="${f('ddays')}" aria-label="Дней отсрочки"><span class="mut">дней</span></div>`:''}
     <div class="pnsum" id="pn-sum">${pnSumHtml(N)}</div></div>
   <div class="pnr"><div class="pnf"><span class="lab">Неделя ${pc<100&&!N.link?'аванса':'платежа'}</span><button type="button" class="inp pnsel" data-pncal="w"><span>${N.mon?esc(pwkLab(N.mon)):'не выбрана — «перспективный»'}</span><span class="mut">▾</span></button>${N.cal==='w'?pnCalHtml(N,'w'):''}</div>
   <div class="pnf"><span class="lab">Срок поставки</span><div class="pnterm"><input id="pn-tnum" inputmode="numeric" autocomplete="off" value="${f('tnum')}" placeholder="—" aria-label="Срок поставки"><div class="pnseg sm">${['дн.','нед.'].map(x=>`<button type="button" class="${N.tunit===x?'on':''}" data-pnu="${x}">${x}</button>`).join('')}</div></div></div></div>
   <div class="pnr"><div class="pnf"><span class="lab">Исполнитель</span><input id="pn-resp" list="presps" autocomplete="off" value="${f('resp')}" placeholder="${esc((AUTH&&AUTH.name)||'по умолчанию — вы')}"><datalist id="presps">${prespList().map(x=>`<option value="${esc(x)}">`).join('')}</datalist></div></div>
   <div class="pnf pndesc"><span class="lab">Описание</span><textarea id="pn-descr" rows="3" placeholder="что покупаем: позиции, модель, количество">${f('descr')}</textarea></div>
   ${N.err?`<p class="red">${esc(N.err)}</p>`:''}
   <div class="pnr pnbt"><label class="pnur"><input type="checkbox" id="pn-urgent"${N.urgent?' checked':''}> Срочно <b class="purg">!</b></label><span class="sp"></span><button class="chip" data-pnew="no" type="button">Отмена</button><button class="act p" data-pnew="go" type="button">Добавить</button></div></div></div></div>`}
async function payUpload(p,file){try{const ext=(/\.[A-Za-z0-9]{1,5}$/.exec(file.name)||[''])[0].toLowerCase(),path='payments/'+p.id+'/'+Date.now()+ext;
  await srvFetch('/storage/v1/object/invoices/'+path,{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream','x-upsert':'true'},body:file});
  await payUpd(p.id,{inv_file:path,inv_name:file.name});await payFilesSync(p);return true}catch(e){PAY.err='Счёт не прикрепился: '+e.message;return false}}
/* файлы счёта общие для аванса и доплаты (строки одного счёта): правка в одной строке переносится в остальные */
async function payFilesSync(p){for(const q of pinvRows(p)){if(q.id===p.id)continue;await payUpd(q.id,{inv_file:p.inv_file||null,inv_name:p.inv_name||null,inv_files:Array.isArray(p.inv_files)?p.inv_files:[]})}}
/* несколько файлов к счёту: первый — основной (inv_file), остальные — список inv_files [{path,name}] */
async function payUploadMany(p,files){files=[...files];const big=files.filter(f=>f.size>20*1024*1024);files=files.filter(f=>f.size<=20*1024*1024);if(big.length)PAY.err='Файл больше 20 МБ не прикреплён: '+big.map(f=>f.name).join(', ');if(!files.length)return false;
  const extra=Array.isArray(p.inv_files)?[...p.inv_files]:[],patch={};let i=0;
  try{for(const file of files){const ext=(/\.[A-Za-z0-9]{1,5}$/.exec(file.name)||[''])[0].toLowerCase(),path='payments/'+p.id+'/'+Date.now()+'-'+(i++)+ext;
      await srvFetch('/storage/v1/object/invoices/'+path,{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream','x-upsert':'true'},body:file});
      if(!p.inv_file&&!('inv_file' in patch)){patch.inv_file=path;patch.inv_name=file.name}else extra.push({path,name:file.name})}
    patch.inv_files=extra;await payUpd(p.id,patch);await payFilesSync(p);return true}catch(e){PAY.err='Файлы не прикрепились: '+e.message;return false}}
async function payFileOpen(id,idx){const p=PAY.rows.find(r=>r.id===id);const fp=idx==null?(p&&p.inv_file):(p&&(p.inv_files||[])[idx]||{}).path;if(!fp)return;const w=window.open('','_blank');
  try{const j=await (await srvFetch('/storage/v1/object/sign/invoices/'+fp,{method:'POST',body:JSON.stringify({expiresIn:300})})).json();const u=rb('/storage/v1'+j.signedURL);if(w)w.location=u;else location.href=u}catch(e){if(w)w.close();PAY.err='Файл не открылся: '+e.message;payRender()}}
async function payNewGo(){const N=S.pnew;if(!String(N.sup||'').trim()){N.err='Укажите поставщика';render();return}
  if(!String(N.art||'').trim()){N.err='Выберите номер заявки';render();return}
  if(pnNeedNo(N)&&!String(N.lot||'').trim()){N.err='Укажите номер заявки';render();return}
  const Z=pnZ(N),zlot=pnLot(N);
  const {inv,pc,amt}=pnAmt(N);if(pc<=0||pc>100){N.err='Процент оплаты должен быть от 1 до 100';render();return}
  const mon=N.mon?pdate(N.mon):null,m1=mon?pmonOf(mon,N.mo||S.pm):(N.mo||S.pm),q=N.link?PAY.rows.find(r=>r.id===N.link):null;
  const base={sup:N.sup.trim(),descr:N.descr||'',cur:N.cur,vat:N.vat,urgent:!!N.urgent,code:Z?Z.n+(zlot?' · '+zlot:''):String(N.lot||'').trim()};if(String(N.resp||'').trim()){base.resp=prespCanon(N.resp);payRespAdd(base.resp)}
  {const tn=+String(N.tnum||'').replace(/\D/g,'');if(tn)base.term=tn+' '+(N.tunit==='нед.'?'нед.':'дн.')}
  const DEF=N.terms==='defer'&&!N.link;const dn=DEF?'Отсрочка без процентов'+(+String(N.ddays).replace(/\D/g,'')?', '+(+String(N.ddays).replace(/\D/g,''))+' дн.':''):'';
  const last=[...PAY.rows].reverse().find(r=>skey(r.sup)===skey(N.sup)&&r.art);base.art=pnSec(N)||(last&&psecList().includes(last.art)?last.art:'');
  const v1={...base,week:mon?pisoWk(mon):null,status:DEF?'defer':mon&&!q?'plan':'persp'};
  if(inv){v1.inv_amt=inv;v1.amt=amt;if(q){v1.inv_date=q.inv_date||null;v1.amt=prest(q)||amt;v1.note='Доплата - '+Math.round(v1.amt/inv*1000)/10+'%'}else if(pc<100)v1.note='Старт - '+pc+'%'}
  if(dn)v1.note=dn+(v1.note?' · '+v1.note:'');
  S.pnew=null;const r1=await payCreate(N.ent,N.after,m1,v1);if(!r1)return;
  if((N.files||[]).length)await payUploadMany(r1,N.files);
  const w2=pnW2(N);if(!q&&inv&&pc<100){const d2=w2?pdate(w2):null,m2=d2?pmonOf(d2,m1):m1,rest=Math.round((inv-amt)*100)/100;
    const r2=await payCreate(N.ent,r1.id,m2,{...base,amt:rest,inv_amt:inv,note:'Доплата - '+Math.round((100-pc)*10)/10+'%',week:d2?pisoWk(d2):null,status:'persp',inv_file:r1.inv_file||null,inv_name:r1.inv_name||null,inv_files:r1.inv_files||[],inv_date:r1.inv_date||null});
    void r2}
  S.psel=r1.id;S.pm=r1.month;payRender()}
async function payDel(id){try{await srvFetch('/rest/v1/payments?id=eq.'+id,{method:'DELETE'});PAY.rows=PAY.rows.filter(r=>r.id!==id);S.psel=null;PAY.del='';PAY.ver++}catch(e){PAY.err='Не удалено: '+e.message}payRender()}
async function payRate(h,m,f,v){const old=PAY.rates[h+'|'+m]||{};const row={hotel:h,month:m,src:'manual'};for(const k of PRF)row[k]=old[k]!=null?old[k]:null;row[f]=v;
  PAY.rates[h+'|'+m]=row;PAY.ver++;
  try{await srvFetch('/rest/v1/pay_rates',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify([row])});PAY.err=''}catch(e){PAY.err='Курс не сохранился: '+e.message}payRender()}
async function payRateReset(h,m){delete PAY.rates[h+'|'+m];PAY.ver++;try{await srvFetch('/rest/v1/pay_rates?hotel=eq.'+encodeURIComponent(h)+'&month=eq.'+encodeURIComponent(m),{method:'DELETE'});PAY.err=''}catch(e){PAY.err='Не удалось вернуть курс: '+e.message}payRender()}
async function payHist(id){if(PAY.log[id])return;PAY.log[id]='…';try{PAY.log[id]=await (await srvFetch('/rest/v1/pay_log?select=at,by_name,action,diff&pid=eq.'+id+'&order=at.desc&limit=30')).json()}catch(e){PAY.log[id]=[]}payCard()}
function payPoll(){if(PAY.t)return;PAY.t=setInterval(async()=>{if(document.hidden||!AUTH||S.sec!=='buy')return;const ch=await payLoad(false);if(!ch)return;
  const a=document.activeElement;if(a&&a.closest&&a.closest('#pay')&&/INPUT|SELECT|TEXTAREA/.test(a.tagName)){payMerge();return}render()},15000)}
// строки из базы заменяют строки реестров из файлов для тех отелей, где они есть: KPI и «Отчёт по разделам» считаются по ним
function payMerge(){if(!PAY.on)return;if(S.R!==PAY.merged)PAY.base=S.R;if(PAY.mver===PAY.ver&&S.R===PAY.merged)return;
  const hs=new Set(PAY.rows.map(r=>r.hotel));const base=(PAY.base||[]).filter(r=>!hs.has(r.h));
  const conv=PAY.rows.map(p=>{const yr=2000+ +(p.month.slice(-2));const wm=p.week?weekMonday(yr,p.week):null;const t=p.term||'';let td=ptdays(t);
    return{h:p.hotel,sheet:p.month,row:p.pos,sup:p.sup,skey:skey(p.sup),doc:p.basis,cur:p.cur,amt:+p.amt||0,kzt:pconv(p).kzt,desc:p.descr,week:p.week,wk:wm?isoD(wm):null,art:p.art,ok:!!p.ok,term:t,td,paidWk:p.status==='paid'?(p.paid_date?String(p.paid_date).slice(0,10):wm?isoD(wm):null):null,paidEst:p.status==='paid'&&!p.paid_date,resp:p.resp,note:p.note,pid:p.id}}).filter(r=>r.sup);
  S.R=PAY.merged=[...base,...conv];PAY.mver=PAY.ver;if(S.Z.length)relate()}
function pscrollSave(){const q=x=>document.querySelector(x);return{y:window.scrollY,g:(q('#pay .pgrid')||{}).scrollTop||0,c:(q('#pcard')||{}).scrollTop||0}}
function pscrollRestore(v){const q=x=>document.querySelector(x),g=q('#pay .pgrid'),c=q('#pcard');if(g)g.scrollTop=v.g;if(c)c.scrollTop=v.c;window.scrollTo(0,v.y)}
function payRender(fid,ff){const a=document.activeElement;const k=fid?[fid,ff]:a&&a.dataset&&a.dataset.pid?[a.dataset.pid,a.dataset.pf]:null;const sv=pscrollSave();render();pscrollRestore(sv);
  if(k){const el=document.querySelector(`#pay [data-pid="${k[0]}"][data-pf="${k[1]}"]`);if(el){el.focus();try{if(el.select&&fid)el.select()}catch(_){}}}}
/* ---- экран ---- */
/* порядок в списке (внутри статуса — недели по возрастанию, без недели в конце): оплаченные (зелёные) → поданные на оплату (белые) → перспективные (жёлтые) → пауза → бюджет → отсрочка (фиолетовые) */
const PORD={paid:0,plan:1,persp:2,pause:3,budget:4,defer:5},PRK=r=>PORD[r.status]??2;
function payRows(h,m){const q=(S.pq||'').toLowerCase();const st=S.pst||{};
  return PAY.rows.filter(r=>r.hotel===h&&(m==null||r.month===m)&&!st[r.status]&&(!q||[r.sup,r.code,r.basis,r.descr,r.resp,r.art].some(x=>String(x||'').toLowerCase().includes(q)))).sort((a,b)=>(m==null?PMON.indexOf(a.month)-PMON.indexOf(b.month)||PENT.findIndex(e=>e[0]===a.entity)-PENT.findIndex(e=>e[0]===b.entity):0)||PRK(a)-PRK(b)||(pwkT(a)||9e15)-(pwkT(b)||9e15)||a.pos-b.pos)}
function payCell(p,c){const [f,,t]=c;const v=p[f];
  if(t==='pct'){const x=ppct(p),k=pkind(p);return `<td class="n pcn"><div class="pcs"><span>${x%1?String(x).replace('.',','):x}%</span><small class="pst pst-${k}">${PKL[k]||'&nbsp;'}</small></div></td>`}
  if(t==='tag'){const i=partInfo(p),old=v&&(i.old||!(i.zn||psecList().includes(v))),cd=i.zn||String(v||'').split(' ')[0],nm=i.zn?i.name:String(v||'').split(' ').slice(1).join(' ');return `<td class="pat${old?' pold':''}" title="${old?'Выберите конкретную заявку в карточке: ':''}${esc(v||'')}">${v?`<span class="tcd">${esc(cd)}</span><span class="tnm"> ${esc(nm)}</span>`:'<span class="mut">—</span>'}</td>`}
  if(t==='ok')return `<td class="pc ctr">${v?'<span class="pok" title="Согласовано руководителем проекта">✓</span>':''}</td>`;
  if(f==='sup')return `<td class="ptx psup" title="${esc(v||'')}">${esc(v||'')}</td>`;
  if(f==='amt')return `<td class="n pamt${p.status==='paid'?' pd':p.status==='plan'?' pp':''}"><div class="pac"><b>${pf2(v)}</b><small class="pcv${p.vat==='без НДС'?' nv':''}">${esc(p.cur)}<br>${p.vat==='без НДС'?'без НДС':'с НДС'}</small></div></td>`;
  if(t==='i')return `<td class="n">${v??''}</td>`;
  if(f==='descr')return `<td class="ptx pdesc" title="${esc(v||'')}"><span>${esc(v||'')}</span></td>`;
  if(f==='resp'){const rv=prespCanon(v);return `<td class="ptx" title="${esc(rv)}">${esc(rv)}</td>`}
  return `<td class="ptx" title="${esc(v||'')}">${esc(v||'')}</td>`}
const pcm=(n,c)=>!n?'—':n>=1e6?(n/1e6).toFixed(1).replace('.',',')+' млн '+c:n>=1e3?Math.round(n/1e3)+' тыс '+c:Math.round(n)+' '+c;
const pcs=(rr,f)=>{const m={};for(const p of rr)if(f(p)&&+p.amt)m[p.cur]=(m[p.cur]||0)+(+p.amt);return Object.keys(m).map(c=>pcm(m[c],c)).join(' + ')||'—'};
const pusd=p=>{const k=pconv(p).kzt;if(!k)return 0;const R=prate(p.hotel,p.month);return k/(+R.usd_kzt||RATE)};
const pplanOf=(h,m)=>{const x=PAY.plan[h+'|'+m];return x?+x.total||0:0};
function pusdStat(hs,m){let paid=0,wait=0;for(const p of PAY.rows)if(hs.includes(p.hotel)&&p.month===m){const u=pusd(p);if(p.status==='paid')paid+=u;else if(p.status==='plan'||p.status==='persp')wait+=u}
  return{plan:hs.reduce((a,h)=>a+pplanOf(h,m),0),paid,wait}}
function pusdCum(hs,m){let plan=0,paid=0,wait=0;for(const x of PMON){const s=pusdStat(hs,x);plan+=s.plan;paid+=s.paid;wait+=s.wait;if(x===m)break}return{plan,paid,wait}}
const pfdt=d=>d?String(d).split('-').reverse().join('.'):'';
function planFactHtml(hs){if(!SRV.on||!PAY.on)return '';
  const ms=PMON.filter(m=>{const s=pusdStat(hs,m);return s.plan||s.paid||s.wait});if(!ms.length)return '';
  const edit=canOk()&&hs.length===1,h=hs[0];let cp=0,cf=0,cw=0,tp=0,tf=0,tw=0,tq=0;const A=[];
  for(const m of ms){const s=pusdStat(hs,m);cp+=s.plan;cf+=s.paid;cw+=s.wait;tp+=s.plan;tf+=s.paid;tw+=s.wait;tq+=hs.reduce((a,x)=>a+(+(PAY.plan[x+'|'+m]||{}).purch||0),0);A.push({m,s,cp,cf,cw})}
  const sg=n=>`<td class="n m pdv ${Math.round(n)>0?'pos':Math.round(n)<0?'neg':''}">${Math.round(n)>0?'+':''}${pf0(n)}</td>`;
  const row=(l,fn,cls)=>`<tr class="${cls||''}"><td>${l}</td>${A.map(fn).join('')}</tr>`;
  const body=[
    `<tr><td><b>План по Уставу</b></td>${A.map(a=>`<td class="n m">${edit?`<input class="pplin" data-plan="${esc(h)}|${a.m}" value="${pf0(a.s.plan)}" inputmode="numeric" aria-label="План ${a.m}">`:pf0(a.s.plan)}</td>`).join('')}<td class="n m"><b>${pf0(tp)}</b></td></tr>`,
    `<tr class="sub"><td>из них закупки (по Уставу)</td>${A.map(a=>`<td class="n m mut">${pf0(hs.reduce((x,k)=>x+(+(PAY.plan[k+'|'+a.m]||{}).purch||0),0))}</td>`).join('')}<td class="n m mut">${pf0(tq)}</td></tr>`,
    `<tr><td><b>Оплачено (факт)</b></td>${A.map(a=>`<td class="n m">${pf0(a.s.paid)}</td>`).join('')}<td class="n m"><b>${pf0(tf)}</b></td></tr>`,
    `<tr><td>К оплате и перспектива</td>${A.map(a=>`<td class="n m mut">${pf0(a.s.wait)}</td>`).join('')}<td class="n m mut">${pf0(tw)}</td></tr>`,
    `<tr><td>Факт − план</td>${A.map(a=>sg(a.s.paid-a.s.plan)).join('')}${sg(tf-tp)}</tr>`,
    `<tr class="grp"><td colspan="${ms.length+2}">Накопительным итогом</td></tr>`,
    `<tr><td>План</td>${A.map(a=>`<td class="n m">${pf0(a.cp)}</td>`).join('')}<td></td></tr>`,
    `<tr><td>Оплачено</td>${A.map(a=>`<td class="n m">${pf0(a.cf)}</td>`).join('')}<td></td></tr>`,
    `<tr><td>Оплачено + к оплате (прогноз)</td>${A.map(a=>`<td class="n m mut">${pf0(a.cf+a.cw)}</td>`).join('')}<td></td></tr>`,
    `<tr><td><b>Факт − план</b></td>${A.map(a=>sg(a.cf-a.cp)).join('')}<td></td></tr>`].join('');
  return `<div class="card" style="margin-top:12px"><h3>План и факт по Уставу · Мотель ${hs.join(', ')}<small>$ без НДС, по месяцам реестра · всего оплачено $ ${pf0(tf)} из плана $ ${pf0(tp)}</small></h3>
   <div class="tw"><table class="rep pfact"><thead><tr><th>Месяц</th>${A.map(a=>`<th class="n">${a.m}</th>`).join('')}<th class="n">Всего</th></tr></thead><tbody>${body}</tbody></table></div>
   <p class="note" style="padding:0 16px">План — «План отвлечений» из Бюджета программы 2027 (вер 1.2): все затраты по отелю за месяц, включая производство, сборку, монтаж, проектирование и инвестиции${edit?'. Цифры плана можно править прямо в таблице':''}. Факт — платежи реестра, пересчитанные по курсу месяца: «Оплачено» — статус «Оплачен».</p></div>`}
const pOpen=(k,def)=>S.pcl&&k in S.pcl?S.pcl[k]:def;
function payView(){const h=S.hs[0];if(!S.pm){const ms=new Set(PAY.rows.filter(r=>r.hotel===h).map(r=>r.month));S.pm=PMON.find(m=>ms.has(m))||PMON[0]}
  const m=S.pm,ro=!canPay(),R=prate(h,m);if(!PAY.fx[m]&&!PAY.fxReq[m]&&pmonFirst(m)<=TODAY)setTimeout(()=>payFx(m).then(c=>{if(c)payRender()}),0);
  if(S.hs.length>1)return `<div class="card"><h3>Реестр платежей</h3><p style="padding:0 16px">Реестр ведётся по одному отелю. Оставьте выбранным один отель.</p></div>`;
  const all=PAY.rows.filter(r=>r.hotel===h&&r.month===m);
  const st=S.pst||{};const chips=PST.map(([k,l])=>`<button class="chip pchip" data-pstf="${k}" aria-pressed="${!st[k]}"><span class="pdot s-${k}" aria-hidden="true"></span>${l.replace(' бюджетом сборки и монтажа',' бюджетом')}</button>`).join('');
  const NC=PCOL.length+1+(S.pgb==='all'?1:0);
  const FLAT=S.pgb==='all';const head=`<tr><th class="pn">№</th>${FLAT?'<th class="pmoh" data-c="mo">Мес.</th>':''}${PCOL.map(c=>`<th data-c="${c[0]}" style="${c[0]==='descr'?'':'width:'+c[3]+'px'}"${c[0]==='amt'?' class="n pamth"':/n|pct/.test(c[2])&&c[2]!=='t'?' class="n"':''}${c[0]==='ok'?' title="Согласовано руководителем проекта"':''}>${c[1]}</th>`).join('')}</tr>`;
  const PAIDF=p=>p.status==='paid',PLANF=p=>p.status==='plan',OTHF=p=>!PAIDF(p)&&!PLANF(p);
  const sm3=(rr,fn,cl)=>`<span class="psm"><span><i>оплачено</i><b class="g">${fn(rr,PAIDF)}</b></span><span><i>к оплате</i><b>${fn(rr,PLANF)}</b></span><span><i>перспектива и др.</i><b class="mu">${fn(rr,OTHF)}</b></span></span>`;
  let body='';let n=0;
  const rowH=p=>{n++;const w=pwarn(p);return `<tr class="pr s-${p.status}${S.psel===p.id?' on':''}" data-prow="${p.id}" tabindex="0"><td class="pn" title="${esc(PSTN[p.status]||'')}">${n}${p.urgent&&p.status!=='paid'?'<span class="purg" title="Срочно">!</span>':''}${w.length&&p.status!=='paid'?`<span class="pwarn" title="${esc(w.join('; '))}">?</span>`:''}</td>${FLAT?`<td class="pmo">${esc(p.month)}</td>`:''}${PCOL.map(c=>payCell(p,c)).join('')}</tr>${p.status==='pause'&&p.pause_note?`<tr class="ppnr${S.psel===p.id?' on':''}" data-prow="${p.id}"><td class="pn"></td><td colspan="${PCOL.length+(FLAT?1:0)}"><div class="ppn" title="${esc(p.pause_note)}">⏸ ${esc(p.pause_note)}</div></td></tr>`:''}`};
  if(FLAT){const rows=payRows(h,null),mr=PAY.rows.filter(r=>r.hotel===h);n=0;
    body+=`<tr class="pm"><td colspan="${NC}"><div class="pmh"><b>Все платежи подряд</b><span class="mut">${rows.length} из ${mr.length}${(S.pq||Object.keys(S.pst||{}).some(k=>S.pst[k]))?' (по фильтру)':''} · сначала оплаченные, дальше по месяцам</span><span class="sp"></span>${sm3(rows,(r,f)=>pcs(r,f))}</div></td></tr>`;
    body+=rows.map(rowH).join('')}
  else for(const mo of PMON){const mr=PAY.rows.filter(r=>r.hotel===h&&r.month===mo),rows=payRows(h,mo);const op=pOpen('m:'+mo,pcurMo()?mo===pcurMo():mr.length>0);
    const kz=mr.map(p=>({p,k:pusd(p)||0}));const kf=f=>{const v=kz.filter(x=>f(x.p)).reduce((a,x)=>a+x.k,0);return v?pcm(v,'$'):'—'};
    body+=`<tr class="pm"><td colspan="${NC}"><div class="pmh"><button class="ptg" data-ptog="m:${mo}" aria-expanded="${op}" aria-label="${op?'Свернуть':'Развернуть'} ${mo}">${op?'▾':'▸'}</button><b>${mo}</b><span class="mut">${mr.length?mr.length+' платежей':'платежей нет'}</span>${(()=>{const u=pusdStat([h],mo);return u.plan||u.paid?`<span class="pplan" title="План затрат по Уставу на месяц и оплачено, $ без НДС">Устав <b>$ ${pf0(u.plan)}</b> · оплачено <b class="${u.paid>u.plan&&u.plan?'ov':''}">$ ${pf0(u.paid)}</b>${u.plan?` <i>${Math.round(u.paid/u.plan*100)}%</i>`:''}</span>`:''})()}${mr.length?`<span class="sp"></span><span class="mut ps0" title="Для бюджета: доллары без НДС, по курсу месяца">бюджет, $ без НДС</span>${sm3(mr,(r,f)=>kf(f))}`:''}</div></td></tr>`;
    if(!op)continue;n=0;
    if(S.pgb==='sup'){const gs=new Map();for(const r of rows){const k=skey(r.sup)||'';if(!gs.has(k))gs.set(k,[]);gs.get(k).push(r)}
      for(const [k,g] of [...gs].sort((a,b)=>String(a[1][0].sup||'').localeCompare(String(b[1][0].sup||''),'ru'))){const all2=mr.filter(r=>skey(r.sup)===k);
        body+=`<tr class="pg"><td colspan="${NC}"><div class="pmh"><b>${esc(g[0].sup||'Без поставщика')}</b><span class="mut">${all2.length} ${all2.length%10===1&&all2.length!==11?'платёж':'платежей'}</span><span class="sp"></span>${sm3(all2,(r,f)=>pcs(r,f))}</div></td></tr>`;
        body+=g.map(rowH).join('')}}
    else for(const [ek,el] of PENT){const rr=rows.filter(r=>r.entity===ek),er=mr.filter(r=>r.entity===ek);
      body+=`<tr class="pgsp"><td colspan="${NC}"></td></tr><tr class="pg pg-${ek}"><td colspan="${NC}"><div class="pmh"><b>${el}</b><span class="mut">${er.length} платежей · ${PECUR[ek]}</span><span class="sp"></span>${sm3(er,(r,f)=>pcs(r,f))}</div></td></tr>`;
      body+=rr.map(rowH).join('')}}
  // итоги месяца для бюджета (свёрнуты): по неделям, запланировано, оплачено
  const cv=all.map(p=>({p,...pconv(p)}));const sum=(f,k)=>cv.filter(f).reduce((a,x)=>a+(x[k]||0),0);
  const plan=x=>x.p.status==='persp'||x.p.status==='plan',paid=x=>x.p.status==='paid';
  const pr=sum(paid,'rub'),pl=sum(plan,'rub');const pct=pr>0?Math.round(pr/(pr+pl)*100):0;
  const wk=[...new Set(all.map(p=>p.week).filter(Boolean))].sort((a,b)=>a-b);
  const kP=sum(paid,'kzt'),kL=sum(plan,'kzt');
  const foot=`<div class="pbox pdet"><button class="pdt" data-pfoot aria-expanded="${!!S.pfoot}">${S.pfoot?'▾':'▸'} Для бюджета · ${m}: оплачено <b>${pcm(kP,'₸')}</b> (${pct}%) · в плане <b>${pcm(kL,'₸')}</b></button>${S.pfoot?`<div class="pfoot2"><table class="pft"><thead><tr><th>без НДС</th><th>RUB</th><th>KZT</th></tr></thead><tbody>
    <tr><td>Оплачено · ${pct}%</td><td>${pf0(pr)}</td><td>${pf0(kP)}</td></tr><tr><td>В плане и перспектива</td><td>${pf0(pl)}</td><td>${pf0(kL)}</td></tr><tr class="tot"><td>Всего</td><td>${pf0(pr+pl)}</td><td>${pf0(kP+kL)}</td></tr></tbody></table>
    ${(()=>{const us=pusdStat([h],m),uc=pusdCum([h],m);return us.plan||us.paid?`<p class="mut pwk"><b>По Уставу, $ без НДС:</b> <span>план месяца ${pf0(us.plan)}</span><span>оплачено ${pf0(us.paid)}${us.plan?' ('+Math.round(us.paid/us.plan*100)+'%)':''}</span><span>к оплате и перспектива ${pf0(us.wait)}</span><span>остаток плана ${pf0(us.plan-us.paid)}</span></p><p class="mut pwk"><b>Накопительно по Уставу, $:</b> <span>план ${pf0(uc.plan)}</span><span>оплачено ${pf0(uc.paid)}</span><span>факт − план ${pf0(uc.paid-uc.plan)}</span></p>`:''})()}<p class="mut pwk"><b>По неделям, ₸:</b> ${wk.map(w=>`<span>нед. ${w} — ${pcm(sum(x=>x.p.week===w,'kzt'),'')}</span>`).join('')||'недели не проставлены'}</p></div>`:''}</div>`;
  const imp=PAY.imp?payImpView():'';
  const nOff=PST.filter(([k])=>st[k]).length,cnt=k=>PAY.rows.filter(r=>r.hotel===h&&r.status===k).length;
  const stLab=nOff===0?'все':nOff===PST.length?'ничего':PST.filter(([k])=>!st[k]).length===1?PST.find(([k])=>!st[k])[1].replace(' бюджетом сборки и монтажа',' бюджетом'):(PST.length-nOff)+' из '+PST.length;
  const more=[canPublish()?`<label class="pmi" for="pfile">Загрузить из Excel</label>`:'',canPay()&&SRV.on?`<label class="pmi" for="pfold" title="Выберите папку со счетами — файлы сами встанут к нужным строкам">Счета из папки</label>`:'',isAdmin()?`<button class="pmi" data-psec="open">Разделы</button>`:''].filter(Boolean);
  const tools=`<div class="ptool2">
   <div class="ptr"><h3 class="ptit">Реестр оплат · Мотель ${h}</h3><span class="mut ptn">${PAY.rows.filter(r=>r.hotel===h).length} платежей${ro?' · только просмотр':''}</span><span class="sp"></span>
    ${canPreq()?`<button class="chip" data-preq="open">Запрос на платёж</button>`:''}${ro?'':`<button class="act p" data-padd="svk">＋ Добавить платёж</button>`}
    ${more.length?`<span class="pdd"><button class="chip pmore" data-pmore aria-expanded="${!!S.pmore}" aria-label="Ещё действия">⋯</button>${S.pmore?`<div class="pmenu pmr" role="menu">${more.join('')}</div>`:''}</span>`:''}
    ${canPublish()?`<input type="file" id="pfile" accept=".xlsm,.xlsx" hidden>`:''}${canPay()&&SRV.on?`<input type="file" id="pfold" webkitdirectory multiple hidden>`:''}</div>
   <div class="ptr"><label class="psrch"><span class="mut">Поиск</span><input id="pq" value="${esc(S.pq||'')}" placeholder="поставщик, счёт, описание" aria-label="Поиск по реестру"></label>
    <span class="pdd"><button class="chip" data-pstdd aria-expanded="${!!S.pstdd}">Статус: ${esc(stLab)} ▾</button>${S.pstdd?`<div class="pmenu" role="menu">${PST.map(([k,l])=>`<button class="pmi pst-i" data-pstf="${k}" aria-pressed="${!st[k]}"><span class="pchk">${st[k]?'':'✓'}</span><span class="pdot s-${k}" aria-hidden="true"></span>${l.replace(' бюджетом сборки и монтажа',' бюджетом')}<span class="mut">${cnt(k)}</span></button>`).join('')}<button class="pmi lnk" data-pstall>Показать все</button></div>`:''}</span>
    <span class="pseg" role="group" aria-label="Группировка"><button data-pgb="ent" aria-pressed="${S.pgb!=='sup'&&S.pgb!=='all'}">Юрлица</button><button data-pgb="sup" aria-pressed="${S.pgb==='sup'}">Поставщики</button><button data-pgb="all" aria-pressed="${S.pgb==='all'}" title="Все платежи одним списком, без деления на месяцы — удобно искать">Списком</button></span></div></div>`;
  const sel=PAY.rows.find(r=>r.id===S.psel&&r.hotel===h);
  return `${imp}${PAY.rest?payRestView():''}${PAY.part?payPartView():''}${PAY.pause?payPauseView():''}${S.preq?payReqView():''}${PAY.fold?foldView():''}${PAY.secm?psecView():''}${S.pnew?payNewView():''}<datalist id="psups">${psups().map(x=>`<option value="${esc(x)}">`).join('')}</datalist><div id="pay" class="pay${sel?' po':''}"><div class="pmain"><div class="card">
    ${tools}${PAY.err?`<p class="note red" style="margin:6px 16px">${esc(PAY.err)}</p>`:''}${PAY.info?`<p class="note" style="margin:6px 16px">${esc(PAY.info)} <button class="lnk" data-pinfo>скрыть</button></p>`:''}
    <div class="pgrid"><table class="ptab"><thead>${head}</thead><tbody>${body}</tbody></table></div></div>${FLAT?'':foot}</div>
    <aside id="pcard" class="pcard${sel?'':' empty'}">${payCardHtml(sel)}</aside></div>`}
/* ---- оплата: остаток по счёту ставим в план на выбранную неделю ---- */
const pfd=d=>d.toLocaleDateString('ru-RU',{day:'numeric',month:'short',timeZone:'UTC'});
function pweeks(p){const y=2000+ +p.month.slice(-2);const b=p.week?weekMonday(y,p.week):weekMonday(TODAY.getUTCFullYear(),pisoWk(TODAY));const out=[];
  for(let i=1;i<=30;i++){const a=new Date(b.getTime()+i*7*DAY),z=new Date(a.getTime()+6*DAY);out.push({i,a,w:pisoWk(a),lab:'нед. '+pisoWk(a)+' · '+pfd(a)+' – '+pfd(z),past:z<TODAY})}
  const f=out.findIndex(o=>!o.past);return{list:out,def:Math.max(4,f<0?4:f+1)}}
const pcurMo=()=>PMON.find(x=>x===PMN[TODAY.getUTCMonth()]+' '+String(TODAY.getUTCFullYear()).slice(-2))||'';
const pmonOf=(d,fb)=>PMON.find(x=>x===PMN[d.getUTCMonth()]+' '+String(d.getUTCFullYear()).slice(-2))||fb;
function payRestView(){const R=PAY.rest,p=PAY.rows.find(r=>r.id===R.id);if(!p)return '';const W=pweeks(p);if(!R.w)R.w=W.def;const inv=+p.inv_amt,pc=x=>Math.round(x/inv*1000)/10;
  return `<div class="pmodal"><div class="card pimpc" role="dialog" aria-modal="true" aria-labelledby="prest-h"><h3 id="prest-h">Остаток по счёту</h3><div style="padding:8px 16px 14px">
   <p><b>${esc(p.sup)}</b> · оплачено <b>${pf2(p.amt)} ${esc(p.cur)}</b> (${pc(+p.amt)}% счёта ${pf2(inv)}).</p>
   <p>Осталось <b>${pf2(R.rest)} ${esc(p.cur)}</b> (${pc(R.rest)}%). На какую неделю поставить остаток в план, чтобы не забыть?</p>
   <label class="pf"><span>Неделя платежа</span><select id="prest-w">${W.list.map(o=>`<option value="${o.i}"${o.i===R.w?' selected':''}>${o.lab}${o.past?' (прошла)':''}</option>`).join('')}</select></label>
   <div class="pbtns" style="margin-top:12px"><button class="act p" data-prest="plan">Поставить в план</button><button class="chip" data-prest="later">Неделя неизвестна — напомнить позже</button><button class="chip" data-prest="none">Остатка не будет: счёт закрыт</button></div></div></div></div>`}
async function payOkSet(id,on){const p=PAY.rows.find(r=>r.id===id);if(!p)return;if(!canOk()){PAY.err='Согласовать платёж может только руководитель';payRender();return}
  const patch={ok:!!on,ok_at:on?new Date().toISOString():null,ok_by:on?((AUTH&&AUTH.name)||''):null};if(on&&(p.status==='persp'||p.status==='pause')){patch.status='plan';patch.pause_note=null;patch.pause_by=null}if(on)pwkFill(p,patch);await payUpd(id,patch)}
function payPauseOpen(id){const p=PAY.rows.find(r=>r.id===id);if(!p)return;PAY.pause={id,v:p.status==='pause'?(p.pause_note||''):''};payRender();setTimeout(()=>{const i=document.getElementById('ppause-v');if(i)i.focus()},0)}
function payPauseView(){const R=PAY.pause,p=PAY.rows.find(r=>r.id===R.id);if(!p)return '';
  return `<div class="pmodal"><div class="card pimpc" role="dialog" aria-modal="true" aria-labelledby="ppause-h"><h3 id="ppause-h">Платёж на паузу</h3><div style="padding:8px 16px 14px">
   <p><b>${esc(p.sup)}</b> · ${pf2(p.amt)} ${esc(p.cur)}</p>
   <label class="pf"><span>Что нужно уточнить по счёту? (причина паузы)</span><textarea id="ppause-v" rows="4" placeholder="например: уточнить срок поставки, не сходится сумма со спецификацией">${esc(R.v)}</textarea></label>
   <p class="mut">Платёж не попадёт в запрос на оплату, пока пауза не снята. Причина видна в реестре.</p>
   <div class="pbtns" style="margin-top:12px"><button class="act p" id="ppause-go" data-ppausego="1"${R.v.trim()?'':' disabled'}>Поставить на паузу</button><button class="chip" data-ppauseno="1">Отмена</button></div></div></div></div>`}
async function payPauseDo(){const R=PAY.pause,p=R&&PAY.rows.find(r=>r.id===R.id);const v=R?R.v.trim():'';PAY.pause=null;if(!p||!v){payRender();return}
  await payUpd(p.id,{status:'pause',pause_note:v,pause_by:((AUTH&&(AUTH.name||AUTH.email))||'')+' · '+pfdt(piso(TODAY))})}
async function payMarkPaid(id){const p=PAY.rows.find(r=>r.id===id);if(!p)return;if(!canPaid()){PAY.err='Отметить оплаченным может финансист или руководитель';payRender();return}
  await payUpd(id,pwkFill(p,{status:'paid'}));const rest=prest(p);if(rest>0){PAY.rest={id,rest,w:0};payRender()}}
async function payRestDo(kind){const R=PAY.rest;const p=R&&PAY.rows.find(r=>r.id===R.id);PAY.rest=null;if(!p){payRender();return}
  if(kind==='none'){const alloc=pinvRows(p).reduce((a,q)=>a+(+q.amt||0),0);await payUpd(p.id,{inv_amt:Math.round(alloc*100)/100});return}
  const W=pweeks(p),o=kind==='plan'?W.list.find(x=>x.i===R.w):null;const month=o?pmonOf(o.a,p.month):p.month;
  const same=PAY.rows.filter(r=>r.hotel===p.hotel&&r.month===month&&r.entity===p.entity);const pos=same.length?Math.max(...same.map(r=>r.pos))+1:1;
  const pc=Math.round(R.rest/(+p.inv_amt)*1000)/10;
  try{if(!/\d\s*%/.test(p.note||''))await payUpd(p.id,{note:'Старт - '+Math.round((+p.amt)/(+p.inv_amt)*1000)/10+'%'+(p.note?' · '+p.note:'')});
    const body={hotel:p.hotel,month,entity:p.entity,pos,code:p.code,sup:p.sup,basis:p.basis,cur:p.cur,amt:R.rest,vat:p.vat,descr:p.descr,week:o?o.w:null,art:p.art,erp:p.erp,term:p.term,resp:p.resp,inv_amt:p.inv_amt,inv_date:p.inv_date||null,status:'persp',note:'Доплата - '+pc+'%'};
    const r=await (await srvFetch('/rest/v1/payments',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(body)})).json();
    PAY.rows.push(r[0]);S.pcl=S.pcl||{};S.pcl['m:'+month]=true;PAY.err=''}catch(e){PAY.err='Остаток не добавлен в план: '+e.message}
  PAY.ver++;payRender()}
function payPartView(){const R=PAY.part,p=PAY.rows.find(r=>r.id===R.id);if(!p)return '';
  return `<div class="pmodal"><div class="card pimpc" role="dialog" aria-modal="true" aria-labelledby="ppart-h"><h3 id="ppart-h">Оплатить часть платежа</h3><div style="padding:8px 16px 14px">
   <p><b>${esc(p.sup)}</b> · к оплате <b>${pf2(p.amt)} ${esc(p.cur)}</b></p>
   <label class="pf"><span>Оплачено сейчас, ${esc(p.cur)}</span><input id="ppart-v" value="${esc(R.v)}" inputmode="decimal" autocomplete="off"></label>
   <label class="pf"><span>Дата переноса остатка</span><input type="date" id="ppart-d" value="${esc(R.d)}" min="${piso(TODAY)}"></label>
   <p id="ppart-info" class="mut">${payPartInfo(p,R.v,R.d).t}</p>
   <div class="pbtns" style="margin-top:12px"><button class="act p" id="ppart-go" data-ppartgo="1"${payPartInfo(p,R.v,R.d).ok?'':' disabled'}>Оплатить и создать платёж на остаток</button><button class="chip" data-ppartno="1">Отмена</button></div></div></div></div>`}
function payPartInfo(p,val,ds){const full=+p.amt,v=pnum(val);
  if(!(v>0))return{ok:false,t:'Введите сумму, которую оплачиваете сейчас.'};
  if(v>=full)return{ok:false,t:'Сумма не меньше платежа. Для полной оплаты нажмите «Отметить оплаченным».'};
  if(!ds||!/^\d{4}-\d\d-\d\d$/.test(ds)||pdate(ds)<TODAY)return{ok:false,t:'Укажите дату переноса остатка: не раньше сегодняшнего дня.'};
  const a=pdate(ds);return{ok:true,t:`Останется <b>${pf2(Math.round((full-v)*100)/100)} ${esc(p.cur)}</b>: добавлю отдельный платёж в план на ${pfdt(ds)} (неделя ${pisoWk(a)}, ${pmonOf(a,p.month)}).`}}
async function payPartDo(){const R=PAY.part,p=R&&PAY.rows.find(r=>r.id===R.id);PAY.part=null;if(!p){payRender();return}
  const full=+p.amt,v=pnum(R.v);if(!canPaid()||!(v>0&&v<full)){payRender();return}
  if(!payPartInfo(p,R.v,R.d).ok){payRender();return}
  const rest=Math.round((full-v)*100)/100,a=pdate(R.d),month=pmonOf(a,p.month),inv=+p.inv_amt>0?+p.inv_amt:full;
  const snap={hotel:p.hotel,entity:p.entity,code:p.code,sup:p.sup,basis:p.basis,cur:p.cur,vat:p.vat,descr:p.descr,art:p.art,erp:p.erp,term:p.term,resp:p.resp,urgent:!!p.urgent,inv_file:p.inv_file||null,inv_name:p.inv_name||null,inv_files:p.inv_files||[],inv_date:p.inv_date||null,note:p.note||'Остаток после частичной оплаты'};
  await payUpd(p.id,{amt:v,inv_amt:inv,status:'paid'});if(p.status!=='paid')return;
  const same=PAY.rows.filter(r=>r.hotel===p.hotel&&r.month===month&&r.entity===p.entity),pos=same.length?Math.max(...same.map(r=>r.pos))+1:1;
  try{const r=await (await srvFetch('/rest/v1/payments',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({...snap,month,pos,amt:rest,inv_amt:inv,week:pisoWk(a),status:'persp'})})).json();
    PAY.rows.push(r[0]);if(r[0].upd>PAY.at)PAY.at=r[0].upd;S.pcl=S.pcl||{};S.pcl['m:'+month]=true;PAY.err=''}catch(e){PAY.err='Оплачено, но платёж на остаток не создался: '+e.message}
  PAY.ver++;payRender()}
async function payPlanSet(key,val){const [h,m]=key.split('|'),v=pnum(val);if(v==null||v<0){payRender();return}
  const old=PAY.plan[key]||{hotel:h,month:m,total:0,purch:0};PAY.plan[key]={...old,hotel:h,month:m,total:v};
  try{await srvFetch('/rest/v1/budget_plan',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify([{hotel:h,month:m,total:v,purch:+old.purch||0}])});PAY.err=''}catch(e){PAY.plan[key]=old;PAY.err='План не сохранился: '+e.message}
  PAY.ver++;render()}
function partInfo(p){const cur=String(p.art||'');if(!cur)return{raw:''};const zs=(S.Z&&p.hotel?pzList(p.hotel):[]).filter(z=>z.st==='appr'&&cur.startsWith(z.sec+' '));
  const sk=skey(p.sup),bySup=zs.length>1&&sk?zs.filter(x=>x.h[p.hotel]&&x.h[p.hotel].lots.some(l=>l.skey&&l.skey===sk)):[];
  const z=zs.find(x=>x.n===p.code)||(zs.length===1?zs[0]:null)||(bySup.length===1?bySup[0]:null);if(z)return{zn:z.n,name:z.t||cur.split(' ').slice(1).join(' '),raw:cur,auto:zs.length>1};
  return{raw:cur,old:zs.length>1}}
function partSel(p,dis){const zs=pzList(p.hotel).filter(z=>z.st==='appr'),cur=String(p.art||''),cs=psecCus();
  const zc=zs.filter(z=>cur.startsWith(z.sec+' ')),zsel=zs.find(z=>z.n===p.code&&cur.startsWith(z.sec))||(zc.length===1?zc[0]:null)||(()=>{const i=partInfo(p);return i.zn?zc.find(z=>z.n===i.zn)||null:null})();const o=x=>`<option${x===cur&&!zsel?' selected':''}>${esc(x)}</option>`;
  return `<select data-pid="${p.id}" data-pf="art"${dis}><option value=""${cur?'':' selected'}>—</option>${zs.length?`<optgroup label="Согласованные заявки">${zs.map(z=>`<option value="z:${esc(z.n)}"${zsel===z?' selected':''}>${esc(z.n)} · ${esc(z.t||'')}</option>`).join('')}</optgroup>`:''}<optgroup label="Прочие разделы">${PSEC_OTH.map(o).join('')}</optgroup>${cs.length?`<optgroup label="Созданные администратором">${cs.map(o).join('')}</optgroup>`:''}${cur&&!zsel&&!PSEC_OTH.includes(cur)&&!cs.includes(cur)?`<optgroup label="Выберите конкретную заявку"><option selected value="${esc(cur)}">${esc(cur)} — выберите заявку</option></optgroup>`:''}</select>`}
function ptabGet(){if(S.ptab===undefined){try{S.ptab=localStorage.getItem('kptab')||'inv'}catch(e){S.ptab='inv'}}return S.ptab}
function pkSched(p){const rows=pinvRows(p);if(!(+p.inv_amt>0)||(rows.length<2&&+p.inv_amt<=(+p.amt||0)+0.005))return '';
  const ord={adv:0,one:1,bal:2},srt=[...rows].sort((a,b)=>ord[pkind(a)]-ord[pkind(b)]||(a.week||99)-(b.week||99));
  return `<ul class="psch">${srt.map(q=>`<li class="${q.id===p.id?'on':''}" data-prow="${q.id}" tabindex="0"><span class="pst pst-${pkind(q)}">${PKL[pkind(q)]||'оплата'}</span><b>${ppct(q)}%</b><span class="num">${pf2(q.amt)} ${esc(q.cur)}</span><span class="mut">${q.week?'нед. '+q.week:'без недели'} · ${esc(q.month)}</span><span class="pdot s-${q.status}" title="${esc(PSTN[q.status]||'')}"></span></li>`).join('')}</ul>`}
function pkBlock(p,ro){const rows=pinvRows(p);if(!(+p.inv_amt>0)||(rows.length<2&&+p.inv_amt<=(+p.amt||0)+0.005))return `<div class="pkind"><span class="lab">Тип платежа</span><div class="seg">${[['one','Полная оплата'],['adv','Аванс'],['bal','Доплата']].map(([k,l])=>`<button type="button" data-pkind="${k}:${p.id}" aria-pressed="${pkind(p)===k}"${ro?' disabled':''}>${l}</button>`).join('')}</div></div>`;
  const ord={adv:0,one:1,bal:2},srt=[...rows].sort((a,b)=>ord[pkind(a)]-ord[pkind(b)]||(a.week||99)-(b.week||99));
  return `<div class="pkind"><span class="lab">Тип платежа</span><div class="seg">${[['one','Полная оплата'],['adv','Аванс'],['bal','Доплата']].map(([k,l])=>`<button type="button" data-pkind="${k}:${p.id}" aria-pressed="${pkind(p)===k}"${ro?' disabled':''}>${l}</button>`).join('')}</div>
   <ul class="psch">${srt.map(q=>`<li class="${q.id===p.id?'on':''}" data-prow="${q.id}" tabindex="0"><span class="pst pst-${pkind(q)}">${PKL[pkind(q)]||'оплата'}</span><b>${ppct(q)}%</b><span class="num">${pf2(q.amt)} ${esc(q.cur)}</span><span class="mut">${q.week?'нед. '+q.week:'без недели'} · ${esc(q.month)}</span><span class="pdot s-${q.status}" title="${esc(PSTN[q.status]||'')}"></span></li>`).join('')}</ul></div>`}
function payCardHtml(p){if(!p)return '';
  const ro=!canPay(),a=f=>`data-pid="${p.id}" data-pf="${f}"`,dis=ro?' disabled':'';const w=pwarn(p);
  const steps=['persp','plan','paid'];const si=steps.indexOf(p.status);const pc=ppct(p);
  const num=(f,l,v)=>`<label class="pf"><span>${l}</span><input ${a(f)} value="${esc(v!==undefined?v:pf2(p[f]))}" inputmode="decimal"${dis}></label>`,txt=(f,l)=>`<label class="pf"><span>${l}</span><input ${a(f)} value="${esc(p[f]||'')}"${dis}></label>`,dt=(f,l)=>`<label class="pf"><span>${l}</span><input type="date" ${a(f)} value="${esc(p[f]||'')}"${dis}></label>`;
  const lg=PAY.log[p.id];if(!lg)setTimeout(()=>payHist(p.id),0);
  const FN={sup:'Поставщик',basis:'Обоснование',cur:'Валюта',amt:'Сумма',vat:'НДС',descr:'Описание',week:'Неделя',art:'Статья',ok:'Согл',term:'Срок',resp:'Ответственный',note:'Примечание',inv_date:'Счёт подан',paid_date:'Дата оплаты',status:'Статус',month:'Месяц',entity:'Юрлицо',code:'Шифр',inv_amt:'Сумма счёта',pos:'Порядок',urgent:'Срочно',inv_file:'Файл счёта',pause_note:'Причина паузы'};
  const sv=(k,v)=>v==null||v===''?'пусто':k==='status'?PSTN[v]||v:k==='ok'||k==='urgent'?(v?'да':'нет'):String(v);
  const hist=lg==='…'||!lg?'<p class="mut">загружается…</p>':lg.length?lg.map(x=>`<li><span class="mut">${new Date(x.at).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})} · ${esc(x.by_name||'—')}</span><br>${x.action==='insert'?'строка добавлена':x.action==='delete'?'строка удалена':Object.entries(x.diff||{}).filter(([k])=>FN[k]).map(([k,v])=>`${FN[k]}: ${esc(sv(k,v[0]))} → <b>${esc(sv(k,v[1]))}</b>`).join('; ')}</li>`).join(''):'<p class="mut">изменений пока нет</p>';
  const k=pkind(p),O=pcsOpen(),paid=p.status==='paid',ent=(PENT.find(e=>e[0]===p.entity)||[])[2]||'';
  const sec=(id,title,sum,body)=>`<section class="pcs${O[id]?' open':''}"><button type="button" class="pcsh" data-pcs="${id}" aria-expanded="${!!O[id]}"><span>${title}</span><span class="mut">${sum||''} ${O[id]?'▾':'▸'}</span></button>${O[id]?`<div class="pcsb">${body}</div>`:''}</section>`;
  const st1=paid||p.status==='plan'||!!p.inv_date,st2=!!p.ok||paid,st3=paid;
  const stp=(done,cur,l,sub)=>`<div class="pstp${done?' done':cur?' cur':''}"><i></i><b>${done?'✓ ':''}${l}</b><small>${sub}</small></div>`;
  const wkD=p.week&&p.month?pfdt(piso(weekMonday(2000+ +p.month.slice(-2),p.week))).slice(0,5):'';
  const stepper=`<div class="pstps">${stp(st1,!st1,'Подан',p.inv_date?pfdt(p.inv_date).slice(0,5):'снабжение')}${stp(st2,st1&&!st2,'Согласование',st2?(p.ok_at?pfdt(String(p.ok_at).slice(0,10)).slice(0,5):'руководитель'):'ждёт')}${stp(st3,st2&&!st3,'Оплата',paid?(p.paid_date?pfdt(p.paid_date).slice(0,5):'оплачен'):p.week?'план '+wkD:'неделя не указана')}</div>`;
  const main=paid?'':p.status==='pause'?'':canOk()&&!p.ok?`<button class="act p pbig pokbig" data-pokset="1:${p.id}">✓ Согласовать</button>`:canPaid()&&!ro?`<button class="act p pbig" data-ppaid="${p.id}">✓ Отметить оплаченным</button>`:`<div class="pokbox${p.ok?' on':''}">${p.ok?'✓ Согласовано руководителем':'Ждёт согласования руководителя'}</div>`;
  const links=paid?'':[ro||p.status==='pause'?'':`<button class="lnk" data-ppause="on:${p.id}">⏸ Нужно уточнить</button>`,canPaid()&&!ro&&+p.amt>0&&p.status!=='pause'?`<button class="lnk mu" data-ppart="${p.id}">Оплатить часть</button>`:'',canOk()&&p.ok?`<button class="lnk mu" data-pokset="0:${p.id}">Снять согласование</button>`:'',canOk()&&!p.ok&&canPaid()&&!ro&&p.status!=='pause'?`<button class="lnk mu" data-ppaid="${p.id}">Отметить оплаченным</button>`:''].filter(Boolean).join('');
  const xs=Array.isArray(p.inv_files)?p.inv_files:[];
  const shortN=n=>n?(n.length>40?n.slice(0,37)+'…':n):'Файл';
  const exLinks=xs.map((x,i)=>`<div class="pinvx"><button type="button" class="lnk" data-pfx="${p.id}:${i}" title="Открыть">📎 ${esc(shortN(x.name))} · открыть</button>${ro?'':`<button type="button" class="lnk mu" data-pfdel="${p.id}:${i}" title="Убрать из списка" aria-label="Убрать файл из списка">×</button>`}</div>`).join('');
  const addMore=!ro&&p.inv_file?`<label class="lnk pic" title="Добавить ещё файлы к счёту">＋<input type="file" id="pcf3" data-pcf="${p.id}" accept="application/pdf,image/*" multiple hidden></label>`:'';
  const invLink=p.inv_file?`<button type="button" class="lnk" data-pfile="${p.id}" title="Открыть счёт">📎 ${esc(p.inv_name?(p.inv_name.length>40?p.inv_name.slice(0,37)+'…':p.inv_name):'Счёт')} </button>${ro?'':` <label class="lnk mu pic" title="Заменить счёт">⟳<input type="file" id="pcf" data-pcf="${p.id}" accept="application/pdf,image/*" hidden></label>`}`:ro?'<span class="mut">счёт не прикреплён</span>':`<label class="lnk">＋ прикрепить счёт<input type="file" id="pcf2" data-pcf="${p.id}" accept="application/pdf,image/*" multiple hidden></label>`;
  const nh=Array.isArray(lg)?lg.length:0;
  const T0=ptabGet(),T=['inv','sup','txt','hist','all'].includes(T0)?T0:'inv';
  const prw=(l,c)=>`<div class="prw"><span class="prl">${l}</span><span class="prv">${c}</span></div>`;
  const respSel=`<select ${a('resp')}${dis}><option value=""${p.resp?'':' selected'}>—</option>${[...new Set([...prespList(),prespCanon(p.resp)].filter(Boolean))].sort((x,y)=>x.localeCompare(y,'ru')).map(x=>`<option${x===prespCanon(p.resp)?' selected':''}>${esc(x)}</option>`).join('')}${ro?'':'<option value="__new">＋ другая фамилия…</option>'}</select>`;
  const kindSeg=`<span class="pseg">${[['one','Полная'],['adv','Аванс'],['bal','Доплата']].map(([kk,l])=>`<button type="button" data-pkind="${kk}:${p.id}" aria-pressed="${pkind(p)===kk}"${ro?' disabled':''}>${l}</button>`).join('')}</span>`;
  const pcT=(pc%1?String(pc).replace('.',','):pc)+'%';
  const invInfo=+p.inv_amt&&(prest(p)||pinvRows(p).length>1)?`<div class="pinvl">Счёт ${pf2(p.inv_amt)} ${esc(p.cur)}: этот платёж ${pc}% · разнесено ${Math.round(pinvRows(p).reduce((s,q)=>s+(+q.amt||0),0)/(+p.inv_amt)*1000)/10}%${prest(p)?` · <b class="bad">остаток ${pf2(prest(p))} не в плане</b>`:''}</div>`:'';
  const tInv=`<div class="prws">${prw('Тип платежа',kindSeg)}${prw('Описание',`<textarea ${a('descr')} rows="2"${dis}>${esc(p.descr||'')}</textarea>`)}
    ${prw('Сумма',`<span class="pam"><input ${a('inv_amt')} value="${esc(pf2(p.inv_amt))}" placeholder="—" inputmode="decimal" aria-label="Сумма счёта"${dis}><i>→</i><input ${a('amt')} value="${esc(pf2(p.amt))}" inputmode="decimal" aria-label="К оплате сейчас"${dis}><input ${a('_pct')} value="${esc(pcT)}" inputmode="decimal" aria-label="Процент от счёта" class="pcp"${dis}></span>`)}
    ${prw('Валюта · НДС',`<span class="pcv"><select ${a('cur')}${dis} aria-label="Валюта">${PCUR.map(x=>`<option${x===p.cur?' selected':''}>${x}</option>`).join('')}</select><select ${a('vat')}${dis} aria-label="НДС в счёте">${['с НДС','без НДС'].map(x=>`<option${x===p.vat?' selected':''}>${x}</option>`).join('')}</select></span>`)}
    ${prw('Заявка / раздел',partSel(p,dis))}
    ${prw('Неделя платежа',`<select data-pwk="${p.id}"${dis}>${pweekOpts(p)}</select>`)}
    ${prw('Ответственный',respSel)}
    ${prw('Статус',`<select ${a('status')}${dis}>${PST.map(([kk,l])=>`<option value="${kk}"${kk===p.status?' selected':''}${kk==='paid'&&!canPaid()?' disabled':''}>${l}</option>`).join('')}</select>`)}
    ${prw('Счёт',`<span class="pfl2">${invLink}${addMore}</span>`)}</div>${exLinks?`<div class="pinvxs">${exLinks}</div>`:''}${invInfo}${pkSched(p)}`;
  const tSup=`<label class="pf"><span>Поставщик</span><textarea ${a('sup')} rows="2"${dis}>${esc(p.sup||'')}</textarea></label>
    <div class="pf2">${txt('code','Номер заявки')}${txt('term','Срок поставки')}</div>
    <div class="pf2">${dt('inv_date','Счёт подан')}${canOk()?dt('paid_date','Дата оплаты'):`<div class="pf"><span>Дата оплаты</span><div class="pro">${p.paid_date?pfdt(p.paid_date):'<span class="mut">ставится сама при отметке «Оплачен»</span>'}</div></div>`}</div>${pdeliv(p)}`;
  const tTxt=`<label class="pf"><span>Обоснование платежа</span><textarea ${a('basis')} rows="3"${dis}>${esc(p.basis||'')}</textarea></label><label class="pf"><span>Примечание</span><textarea ${a('note')} rows="2"${dis}>${esc(p.note||'')}</textarea></label>`+(ro?'':`<div class="pf2"><label class="pf"><span>Перенести на месяц</span><select ${a('month')}${dis}>${PMON.map(x=>`<option${x===p.month?' selected':''}>${x}</option>`).join('')}</select></label>
     <label class="pf"><span>Юрлицо</span><select ${a('entity')}${dis}>${PENT.map(([kk,,s])=>`<option value="${kk}"${kk===p.entity?' selected':''}>${s}</option>`).join('')}</select></label></div>
     <div class="pbtns"><button class="chip" data-padd="${p.entity}" data-pafter="${p.id}">Вставить строку ниже</button></div>
     ${canDelPay()?`<div class="pdelz"><button class="lnk ${PAY.del===p.id?'red':'mu'}" data-pdel="${p.id}">${PAY.del===p.id?'Точно удалить этот счёт? Нажмите ещё раз':'🗑 Удалить счёт'}</button></div>`:''}`);
  const tabs=[['inv','Счёт'],['sup','Поставка'],['txt','Прочее'],['hist','История']];
  const tabBar=`<div class="ptabs" role="tablist">${tabs.map(([kk,l])=>`<button type="button" role="tab" data-ptab="${kk}" aria-selected="${T===kk}">${l}</button>`).join('')}</div>`;
  const tBody=T==='all'?tInv+tSup+tTxt+`<ul class="phist">${hist}</ul>`:T==='inv'?tInv:T==='sup'?tSup:T==='txt'?tTxt:`<ul class="phist">${hist}</ul>`;
  return `<div class="pch"><div style="flex:1;min-width:0"><div class="mut" style="font-size:12px">${esc(ent)} · ${esc(p.month)}${p.week?' · нед. '+p.week:''}</div>
   <div class="ph2"><h2>${esc(p.sup||'Новая строка')}</h2>${p.urgent&&!paid?`<button class="purgt on" ${ro?'disabled':`data-purg="0:${p.id}"`} title="${ro?'':'Снять срочность'}">! Срочно оплатить</button>`:ro||paid?'':`<button class="purgt" data-purg="1:${p.id}" title="Пометить как срочный">! срочно</button>`}</div>
   <div class="mut pcsub">${[p.descr,(()=>{const i=partInfo(p);return i.zn?i.zn+' '+i.name:i.raw})(),p.resp].filter(Boolean).map(esc).join(' · ')||'&nbsp;'}</div></div><button class="ico" data-pclose aria-label="Скрыть карточку">✕</button></div>
   ${p.status==='pause'?`<div class="ppbox"><b>⏸ Платёж на паузе</b><p>${esc(p.pause_note||'причина не указана')}</p><small class="mut">${esc(p.pause_by||'')}</small>${ro?'':`<div class="pbtns"><button class="act p" data-ppause="off:${p.id}">Снять с паузы — вернуть в план</button><button class="chip" data-ppause="edit:${p.id}">Изменить причину</button></div>`}</div>`:''}
   <div class="pmainb"><div class="pamtb"><b>${pf2(p.amt)}</b><span class="mut">${esc(p.cur)} · ${PKL[k]||'оплата'} ${pc}%</span></div>${stepper}${main}${links?`<div class="plinks">${links}</div>`:''}${paid&&p.paid_date?`<span class="pdbadge">оплачен ${pfdt(p.paid_date)}</span>`:''}</div>
   ${w.length?`<ul class="pwl">${w.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
   ${tabBar}<div class="pcsb ptb">${tBody}</div>`}
const PCS_DEF={inv:1};function pcsOpen(){if(!S.pcs){try{S.pcs=JSON.parse(localStorage.getItem('kpcs')||'null')}catch(e){}if(!S.pcs)S.pcs={...PCS_DEF}}return S.pcs}
document.addEventListener('click',e=>{const tb=e.target.closest('[data-ptab]');if(tb){S.ptab=tb.dataset.ptab;try{localStorage.setItem('kptab',S.ptab)}catch(_){}payCard();return}});
document.addEventListener('click',e=>{const t=e.target.closest('[data-pcs],[data-purg]');if(!t)return;
  if(t.dataset.pcs){const O=pcsOpen();O[t.dataset.pcs]=!O[t.dataset.pcs];try{localStorage.setItem('kpcs',JSON.stringify(O))}catch(x){}payCard();return}
  const [v,id]=t.dataset.purg.split(':');payUpd(id,{urgent:v==='1'})});
function payCard(){const el=document.getElementById('pcard');if(!el)return;const p=PAY.rows.find(r=>r.id===S.psel);el.className='pcard'+(p?'':' empty');const pw=document.getElementById('pay');if(pw)pw.classList.toggle('po',!!p);
  const a=document.activeElement;if(a&&el.contains(a)&&/INPUT|SELECT|TEXTAREA/.test(a.tagName))return;el.innerHTML=payCardHtml(p);
  document.querySelectorAll('#pay tr.pr,#pay tr.ppnr').forEach(tr=>tr.classList.toggle('on',tr.dataset.prow===S.psel))}
/* бюджет по статьям (лист «База данных»): статьи × месяцы, KZT без НДС */
function payBudget(hs){const h=hs[0];const rows=PAY.rows.filter(r=>r.hotel===h);const M={};let T=0;const MT={};
  for(const p of rows){const k=pconv(p).kzt||0;if(!p.art)continue;M[p.art]=M[p.art]||{};M[p.art][p.month]=(M[p.art][p.month]||0)+k;MT[p.month]=(MT[p.month]||0)+k;T+=k}
  const arts=psecList().filter(a=>M[a]).concat(Object.keys(M).filter(a=>!psecList().includes(a)));
  const tr=a=>{const s=PMON.reduce((x,m)=>x+(M[a][m]||0),0);return `<tr><td>${esc(a)}</td>${PMON.map(m=>`<td class="n m">${M[a][m]?pf0(M[a][m]):'<span class="mut">·</span>'}</td>`).join('')}<td class="n m"><b>${pf0(s)}</b></td><td class="n m">${T?Math.round(s/T*1000)/10+'%':''}</td></tr>`};
  const usdR=m=>{const r=prate(h,m);return r.usd_kzt||null};let US=0;const us=PMON.map(m=>{const r=usdR(m);const v=r&&MT[m]?MT[m]/r:null;if(v)US+=v;return v});
  const nart=rows.filter(p=>!p.art).length;
  return `<div class="card"><h3>Бюджет по статьям · Мотель ${h}<small>KZT без НДС по всем строкам реестра, как лист «База данных»${nart?` · без статьи: ${nart} строк`:''}</small></h3><div class="tw"><table class="rep"><thead><tr><th>Статья бюджета</th>${PMON.map(m=>`<th class="n">${m}</th>`).join('')}<th class="n">Всего, KZT</th><th class="n">%</th></tr></thead><tbody>${arts.map(tr).join('')||`<tr><td colspan="15" class="mut">Статьи бюджета ещё не проставлены</td></tr>`}
   <tr class="grp"><td><b>Итого отвлечений, KZT</b></td>${PMON.map(m=>`<td class="n m">${MT[m]?pf0(MT[m]):''}</td>`).join('')}<td class="n m"><b>${pf0(T)}</b></td><td></td></tr>
   <tr><td class="mut">курс USD/KZT</td>${PMON.map(m=>`<td class="n m mut">${usdR(m)||''}</td>`).join('')}<td></td><td></td></tr>
   <tr class="grp"><td><b>Итого, USD</b></td>${us.map(v=>`<td class="n m">${v?pf0(v):''}</td>`).join('')}<td class="n m"><b>${US?pf0(US):''}</b></td><td></td></tr></tbody></table></div></div>
   <p class="note">Курс USD/KZT — НБ РК на 1-е число месяца, подставляется автоматически.</p>`}
/* ---- загрузка из файла реестра (.xlsm): строки, курсы, статус по цвету заливки ---- */
const PHDR={'№ позиции / шифр счёта':'code','Поставщик':'sup','Обоснование платежа':'basis','Валюта платежа':'cur','Сумма оплаты с НДС':'amt','НДС':'vat','Описание':'descr','Неделя платежа':'week','RUB без НДС':'_rub','Статья бюджета':'art','ERP':'erp','Согл':'ok','Срок поставки':'term','Ответственный':'resp','Комментарий (план)':'note','Сумма счета':'inv_amt','ERP заказ поставщику':'erp_order','Сумма заказа в ERP':'erp_order_amt','ERP закупка':'erp_buy','Сумма поступления ТМЦ в ERP':'erp_recv_amt'};
function pcolStatus(f){if(!f)return 'plan';if(f.theme!=null){return {9:'paid',5:'pause',4:'budget',8:'budget',7:'persp'}[f.theme]||'plan'}
  const x=f.rgb;if(!x||/^(00|FF)?FFFFFF$/i.test(x)||/^00000000$/.test(x))return 'plan';const r=parseInt(x.slice(-6,-4),16)/255,g=parseInt(x.slice(-4,-2),16)/255,b=parseInt(x.slice(-2),16)/255;
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b);if(mx-mn<.08)return 'plan';let hh;if(mx===r)hh=60*(((g-b)/(mx-mn))%6);else if(mx===g)hh=60*((b-r)/(mx-mn)+2);else hh=60*((r-g)/(mx-mn)+4);if(hh<0)hh+=360;
  return hh<40?'pause':hh<72?'persp':hh<170?'paid':hh<255?'budget':hh<330?'defer':'pause'}
/* сумма платежа записана как доля счёта («=6690*0.3», «=1321731.6/2») — полная сумма счёта идёт в «Сумма счёта» */
const pinv=c=>{const m=c&&c.f&&/^\s*=?\s*(\d+(?:\.\d+)?)\s*(?:\*\s*(0?\.\d+|\d+)|\/\s*(\d+))\s*$/.exec(c.f);if(!m)return null;const t=+m[1],k=m[2]?+m[2]:1/+m[3];return k>0&&k<1?Math.round(t*100)/100:null};
async function payParse(buf,name){const z=await unzip(buf);const SH=await readXlsx(buf);
  const sty=await z.get('xl/styles.xml')||'';const fills=[...(/<fills\b[^>]*>([\s\S]*?)<\/fills>/.exec(sty)||['',''])[1].matchAll(/<fill>([\s\S]*?)<\/fill>|<fill\/>/g)].map(m=>{const fg=/<fgColor\b([^>]*)\/?>/.exec(m[1]||'');if(!fg||!/patternType="solid"/.test(m[1]||''))return null;const th=/theme="(\d+)"/.exec(fg[1]),rgb=/rgb="([0-9A-F]+)"/i.exec(fg[1]);return{theme:th?+th[1]:null,rgb:rgb?rgb[1]:null}});
  const xfs=[...((/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(sty)||['',''])[1]).matchAll(/<xf\b([^>]*)/g)].map(m=>+((/fillId="(\d+)"/.exec(m[1])||[0,0])[1]));
  const wbx=await z.get('xl/workbook.xml'),rel=await z.get('xl/_rels/workbook.xml.rels');const rels={};for(const m of rel.matchAll(/<Relationship\b([^>]*)>/g)){const id=/Id="([^"]*)"/.exec(m[1]),tg=/Target="([^"]*)"/.exec(m[1]);if(id&&tg)rels[id[1]]=tg[1]}
  const hm=/Мотел[ьяи]\s*(?:№\s*)?(\d+)/i.exec(name);const hotel=hm?hm[1]:S.hs[0];const out=[],rates=[];
  for(const sm of wbx.matchAll(/<sheet\b([^>]*)>/g)){const nm=dec((/name="([^"]*)"/.exec(sm[1])||['',''])[1]).trim();if(!PMON.includes(nm))continue;const sh=SH[nm];if(!sh)continue;
    let tg=rels[(/r:id="([^"]*)"/.exec(sm[1])||['',''])[1]];tg=tg.startsWith('/')?tg.slice(1):'xl/'+tg;const x=await z.get(tg)||'';const cmt={};{const rp=await z.get(tg.replace(/worksheets\/([^/]+)$/,'worksheets/_rels/$1.rels'));const cm=rp&&/Target="([^"]*comments[^"]*)"/.exec(rp);if(cm){const cx=await z.get(cm[1].startsWith('/')?cm[1].slice(1):'xl/'+cm[1].replace(/^\.\.\//,''))||'';for(const m of cx.matchAll(/<comment\b[^>]*?\bref="([A-Z]+\d+)"[^>]*>([\s\S]*?)<\/comment>/g)){let t='';for(const q of m[2].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g))t+=q[1];t=dec(t).replace(/^[^\n:]{2,60}:\s*\n/,'').replace(/\s+/g,' ').trim();if(t)cmt[m[1]]=t}}}const sst={};for(const c of x.matchAll(/<c\b[^>]*?\br="([A-Z]+\d+)"[^>]*?\bs="(\d+)"/g))sst[c[1]]=+c[2];
    const g=(c,r)=>{const v=sh.cells[c+','+r];return v?v.v:undefined};const col={};
    for(let c=1;c<=30;c++){const t=String(g(c,2)??'').replace(/\s+/g,' ').trim();if(PHDR[t]&&!col[PHDR[t]])col[PHDR[t]]=c}
    if(!col.sup)continue;if(!col.note&&!String(g(16,2)??'').trim())col.note=16;let ent='svk',pos=0;const L=c=>{let s='';while(c>0){s=String.fromCharCode(65+(c-1)%26)+s;c=Math.floor((c-1)/26)}return s};
    for(let r=3;r<=sh.maxr;r++){const a=String(g(1,r)??'');
      if(/курсы валют/i.test(a)){const R={hotel,month:nm,byn_rub:null,rub_kzt:null,byn_kzt:null,usd_kzt:null,cny_kzt:null};for(let q=r+1;q<=r+6;q++){const v=+g(1,q),l=String(g(2,q)||'');const k={'BYN/RUB':'byn_rub','RUB/KZT':'rub_kzt','BYN/KZT':'byn_kzt','USD/KZT':'usd_kzt','CNY/KZT':'cny_kzt'}[l.trim()];if(k&&v>0)R[k]=v}rates.push(R);break}
      if(/СВК/i.test(a)&&!g(col.sup,r)){ent='svk';continue}if(/ВДС/i.test(a)&&!/KAZAKH/i.test(a)&&!g(col.sup,r)){ent='tdv';continue}if(/KAZAKH/i.test(a)&&!g(col.sup,r)){ent='vdskz';continue}
      const sup=g(col.sup,r);if(!sup||typeof sup!=='string'||!sup.trim())continue;
      const fc=col._rub||col.amt;const fid=xfs[sst[L(fc)+r]]||0;const status=pcolStatus(fills[fid]);
      const s=f=>col[f]?String(g(col[f],r)??'').trim():'';const n=f=>col[f]?pnum(g(col[f],r)):null;
      out.push({hotel,month:nm,entity:ent,pos:++pos,code:s('code'),sup:sup.trim(),basis:s('basis'),cur:(s('cur')||'BYN').toUpperCase(),amt:(v=>v==null?null:Math.round(v*1e4)/1e4)(n('amt')),vat:s('vat')==='без НДС'?'без НДС':'с НДС',descr:s('descr').replace(/\s+/g,' '),week:n('week')?Math.round(n('week')):null,art:s('art'),erp:s('erp'),ok:/[✅✔✓]/.test(s('ok')),term:s('term'),resp:s('resp'),urgent:/срочн/i.test([cmt[L(col.amt)+r],s('note')].join(' ')),note:[cmt[L(col.amt)+r],s('note')].filter(Boolean).join(' · ').replace(/\s*·?\s*СРОЧНО!?/gi,'').replace(/^\s*·\s*/,'').trim(),status,inv_amt:n('inv_amt')??pinv(sh.cells[col.amt+','+r]),erp_order:s('erp_order'),erp_order_amt:n('erp_order_amt'),erp_buy:s('erp_buy'),erp_recv_amt:n('erp_recv_amt')})}}
  return{hotel,rows:out,rates,name}}
function payImpView(){const I=PAY.imp;if(I.err)return `<div class="card pimpc"><h3>Загрузка из Excel</h3><p class="red" style="padding:0 16px">${esc(I.err)}</p><p style="padding:0 16px 12px"><button class="chip" data-pimp="no">Закрыть</button></p></div>`;
  const ex=PAY.rows.filter(r=>r.hotel===I.hotel).length;const by={};for(const r of I.rows)by[r.status]=(by[r.status]||0)+1;const ms=[...new Set(I.rows.map(r=>r.month))];
  return `<div class="card pimpc"><h3>Загрузка из Excel · ${esc(I.name)}</h3><div style="padding:8px 16px 14px"><p>Мотель ${esc(I.hotel)}: ${I.rows.length} строк за ${ms.length} мес. (${ms.join(', ')||'—'})</p>
   <p class="mut">Статус взят по цвету заливки: ${PST.filter(([k])=>by[k]).map(([k,l])=>`${l} — ${by[k]}`).join(', ')||'—'}. Курсы из файла не переносятся: они ставятся сами на 1-е число месяца. Отметку «Согл» переносим как в файле${canOk()?'':', но поставить её может только руководитель'}.</p>
   ${ex?`<p class="red">В базе уже есть ${ex} строк по Мотелю ${esc(I.hotel)}. Они будут заменены строками из файла (удаление попадёт в историю).</p>`:''}
   <button class="act p" data-pimp="go" ${I.busy?'disabled':''}>${I.busy?'Загружаю…':ex?'Заменить строки':'Загрузить'}</button> <button class="chip" data-pimp="no">Отмена</button></div></div>`}
async function payImport(){const I=PAY.imp;I.busy=true;payRender();
  try{const ex=PAY.rows.filter(r=>r.hotel===I.hotel);if(ex.length)await srvFetch('/rest/v1/payments?hotel=eq.'+encodeURIComponent(I.hotel),{method:'DELETE'});
    const rows=I.rows.map(r=>canOk()?r:{...r,ok:false});for(let i=0;i<rows.length;i+=200)await srvFetch('/rest/v1/payments',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(rows.slice(i,i+200))});
        PAY.imp=null;S.hs=[I.hotel];S.pm=null;await payLoad(true)}catch(e){I.busy=false;I.err='Не загрузилось: '+e.message}payRender()}
/* ---- события ---- */
document.addEventListener('click',e=>{const t=e.target.closest('[data-prreset],[data-pstf],[data-padd],[data-pmon],[data-ptog],[data-pfoot],[data-pgb],[data-pinfo],[data-pkind],[data-pnew],[data-pnwk],[data-pncal],[data-pncm],[data-pnpc],[data-pnx],[data-pnt],[data-pnu],[data-pfile],[data-pfx],[data-pfdel],[data-ppaid],[data-ppause],[data-pokset],[data-ppausego],[data-ppauseno],[data-ppart],[data-ppartgo],[data-ppartno],[data-prest],[data-pclose],[data-pdel],[data-pimp],[data-prow]');if(!t)return;const d=t.dataset;
  if(d.prreset!==undefined){payRateReset(S.hs[0],S.pm);return}
  if(d.ptog){S.pcl=S.pcl||{};S.pcl[d.ptog]=t.getAttribute('aria-expanded')!=='true';render();return}
  if(d.pfoot!==undefined){S.pfoot=!S.pfoot;render();return}
  if(d.pgb){S.pgb=d.pgb;render();return}
  if(d.pinfo!==undefined){PAY.info='';render();return}
  if(d.pfile){payFileOpen(d.pfile);return}
  if(d.pfx){const [id,i]=d.pfx.split(':');payFileOpen(id,+i);return}
  if(d.pfdel){const [id,i]=d.pfdel.split(':'),p=PAY.rows.find(r=>r.id===id);if(p&&Array.isArray(p.inv_files)&&p.inv_files[+i]&&confirm('Убрать «'+(p.inv_files[+i].name||'файл')+'» из списка файлов счёта?'))payUpd(id,{inv_files:p.inv_files.filter((_,k)=>k!==+i)}).then(()=>payFilesSync(p));return}
  if(d.pkind){const [k,id]=d.pkind.split(':');payKind(id,k);return}
  if(S.pnew&&(d.pnt||d.pnu)){const N=S.pnew;if(d.pnt)N.terms=d.pnt;else N.tunit=d.pnu;render();return}
  if(S.pnew&&(d.pnwk||d.pncal||d.pncm||d.pnpc||d.pnx)){const N=S.pnew;
    if(d.pncal){N.cal=N.cal===d.pncal?null:d.pncal;const b=d.pncal==='w2'?pnW2(N):N.mon,x=b?pdate(b):new Date(TODAY);N.cy=x.getUTCFullYear();N.cm=x.getUTCMonth()}
    else if(d.pncm){N.cm+=+d.pncm;if(N.cm<0){N.cm=11;N.cy--}else if(N.cm>11){N.cm=0;N.cy++}}
    else if(d.pnwk){if(t.dataset.pnf==='w2'){N.w2=d.pnwk;N.w2none=false}else N.mon=d.pnwk;N.cal=null}
    else if(d.pnpc){N.pct=d.pnpc}
    else if(d.pnx==='w2none'){N.w2='';N.w2none=true;N.cal=null}
    else if(d.pnx==='nodup'){N.dupNo=true}
    else if(d.pnx==='openfile'){const f0=(N.files||[])[+d.i];if(f0){const u=URL.createObjectURL(f0);window.open(u,'_blank');setTimeout(()=>URL.revokeObjectURL(u),120000)}return}
    else if(d.pnx==='nofile'){N.files=(N.files||[]).filter((_,i)=>i!==+d.i)}
    else if(d.pnx==='unlink'){N.link=null;N.dupNo=true}
    else if(d.pnx.startsWith('link:')){const q=PAY.rows.find(r=>r.id===d.pnx.slice(5));if(q){const iv=+q.inv_amt||+q.amt;N.link=q.id;N.sup=q.sup;N.descr=q.descr||N.descr;N.cur=q.cur;N.vat=q.vat;N.ent=q.entity;N.lot=q.code||N.lot;N.inv=pnFmt(pf2(iv));N.pct=String(Math.round(prest(q)/iv*1000)/10);N.terms='adv'}}
    else if(d.pnx.startsWith('open:')){const q=PAY.rows.find(r=>r.id===d.pnx.slice(5));S.pnew=null;if(q){S.pm=q.month;S.psel=q.id}}
    render();return}
  if(d.pnew){if(d.pnew==='go')payNewGo();else{S.pnew=null;render()}return}
  if(d.ppaid){payMarkPaid(d.ppaid);return}
  if(d.pokset){const [v,id]=d.pokset.split(':');payOkSet(id,v==='1');return}
  if(d.ppause){const [k,id]=d.ppause.split(':');if(k==='off')payUpd(id,{status:'plan',pause_note:null,pause_by:null});else payPauseOpen(id);return}
  if(d.ppauseno!==undefined){PAY.pause=null;payRender();return}
  if(d.ppausego!==undefined){payPauseDo();return}
  if(d.ppart){const p=PAY.rows.find(r=>r.id===d.ppart);PAY.part={id:d.ppart,v:p?pf2(p.amt).replace(/\s/g,''):'',d:piso(new Date(TODAY.getTime()+7*DAY))};render();setTimeout(()=>{const i=document.getElementById('ppart-v');if(i){i.focus();i.select()}},0);return}
  if(d.ppartno){PAY.part=null;render();return}
  if(d.ppartgo){payPartDo();return}
  if(d.prest){payRestDo(d.prest);return}
  if(d.prow!==undefined){if(S.psel!==d.prow){S.psel=d.prow;const r=PAY.rows.find(x=>x.id===d.prow);if(r)S.pm=r.month;PAY.del='';payCard()}return}
  if(d.pstf){S.pst=S.pst||{};S.pst[d.pstf]=!S.pst[d.pstf];S.pstdd=true;render()}else if(d.padd){payNewOpen(d.padd,d.pafter,d.pmo)}else if(d.pmon){S.pm=d.pmon;S.psel=null;render()}else if(d.pclose!==undefined){S.psel=null;payCard()}
  else if(d.pdel){if(PAY.del===d.pdel)payDel(d.pdel);else{PAY.del=d.pdel;payCard()}}else if(d.pimp==='go')payImport();else if(d.pimp==='no'){PAY.imp=null;render()}});
document.addEventListener('focusin',e=>{const t=e.target.closest&&e.target.closest('#pay tr.pr');if(t&&S.psel!==t.dataset.prow){S.psel=t.dataset.prow;PAY.del='';payCard()}});
document.addEventListener('change',async e=>{const t=e.target;if(t.id==='pfile'){const f=t.files&&t.files[0];if(!f)return;try{PAY.imp=await payParse(await f.arrayBuffer(),f.name);if(!PAY.imp.rows.length)PAY.imp.err='В файле не найдено строк реестра (нужны листы «окт 26»…«сен 27» с заголовками как в шаблоне).'}catch(x){PAY.imp={err:'Файл не прочитан: '+x.message}}render();return}
  if(t.dataset&&t.dataset.prate){const v=pnum(t.value);payRate(S.hs[0],S.pm,t.dataset.prate,v);return}
  if(S.pnew&&(t.id||'').startsWith('pn-')){const N=S.pnew,k=t.id.slice(3);
    if(k==='file'){const fs=[...(t.files||[])];if(fs.length){const big=fs.filter(f=>f.size>20*1024*1024);N.files=[...(N.files||[]),...fs.filter(f=>f.size<=20*1024*1024)];N.err=big.length?'Файл больше 20 МБ не добавлен: '+big.map(f=>f.name).join(', '):'';render()}return}
    N[k]=t.type==='checkbox'?t.checked:t.value;
    if(k==='ent'){N.cur=pcurOf(t.value);N.link=null}
    else if(k==='sup'&&!N.link){const l=[...PAY.rows].reverse().find(r=>skey(r.sup)===skey(t.value)&&r.cur);if(!N.art&&String(t.value).trim()){const k2=skey(t.value);const z=pzList(S.hs[0]).find(z=>z.st==='appr'&&z.h[S.hs[0]].lots.some(x=>x.skey&&x.skey===k2));if(z)N.art='z:'+z.n}
      if(l&&String(t.value).trim()){if(!N.art&&l.art&&psecList().includes(l.art))N.art=l.art;if(!N.resp&&l.resp)N.resp=l.resp;N.cur=l.cur;N.vat=l.vat||N.vat;N.ent=l.entity||N.ent;N.sup=l.sup}}
    else if(k==='lot'){const o=plotOpts(S.hs[0]).find(x=>x.v===String(t.value).trim());if(o&&o.sup&&!String(N.sup||'').trim())N.sup=o.sup.replace(/^ООО\s*/,'ООО ')}
    if(k==='ent'||k==='art'){render()}else pnPaint();return}
  if(t.dataset&&t.dataset.plan){payPlanSet(t.dataset.plan,t.value);return}
  if(t.id==='pcf3'||t.id==='pcf2'){const p=PAY.rows.find(r=>r.id===t.dataset.pcf);if(p&&t.files&&t.files.length){await payUploadMany(p,t.files);payRender()}return}
  if(t.id==='pcf'){const f=t.files&&t.files[0],p=PAY.rows.find(r=>r.id===t.dataset.pcf);if(f&&p){if(f.size>20*1024*1024){PAY.err='Файл больше 20 МБ'}else await payUpload(p,f);payRender()}return}
  if(t.id==='prest-w'){if(PAY.rest)PAY.rest.w=+t.value;return}
  if(t.dataset&&t.dataset.pwk){payWeekSet(t.dataset.pwk,t.value);return}
  const id=t.dataset&&t.dataset.pid,f=t.dataset&&t.dataset.pf;if(!id||!f)return;
  if(f==='resp'){let n=t.value;if(n==='__new'){n=(prompt('Фамилия ответственного')||'').trim();if(!n){payRender();return}}n=prespCanon(n);if(n)payRespAdd(n);payUpd(id,{resp:n||null});return}
  let v=t.type==='checkbox'?t.checked:t.value;if(['amt','inv_amt','erp_order_amt','erp_recv_amt'].includes(f))v=pnum(v);else if(f==='week'){v=pnum(v);v=v==null?null:Math.round(v)}else if(typeof v==='string')v=v.trim();
  if((f==='inv_date'||f==='paid_date')&&!v)v=null;
  if(f==='status'&&v==='paid'){payMarkPaid(id);return}
  if(f==='status'&&v==='pause'){payPauseOpen(id);return}
  if(f==='status'&&v!=='pause'){payUpd(id,{status:v,pause_note:null,pause_by:null});return}
  if(f==='art'&&String(v).startsWith('z:')){const zn=v.slice(2),z=S.Z.find(x=>x.n===zn);payUpd(id,{art:z?(psecList().find(x=>x.startsWith(z.sec+' '))||z.sec):v,code:zn});return}
  if(f==='_pct'){const p=PAY.rows.find(r=>r.id===id);const x=pnum(String(t.value).replace('%',''));if(!p||!x||x<=0||x>1000){payRender();return}
    if(+p.inv_amt)payUpd(id,{amt:Math.round(+p.inv_amt*x)/100});else if(+p.amt)payUpd(id,{inv_amt:Math.round(+p.amt*10000/x)/100});else payRender();return}
  if(f==='month'||f==='entity'){const p=PAY.rows.find(r=>r.id===id);const same=PAY.rows.filter(r=>r.hotel===p.hotel&&r.month===(f==='month'?v:p.month)&&r.entity===(f==='entity'?v:p.entity));payUpd(id,{[f]:v,pos:same.length?Math.max(...same.map(r=>r.pos))+1:1});return}
  payUpd(id,{[f]:v})});
document.addEventListener('input',e=>{const id=e.target.id||'';if(S.pnew&&id.startsWith('pn-')&&id!=='pn-file'){const el=e.target;
    if(id==='pn-inv'){const pos=el.selectionStart,ol=el.value.length,dg=el.value.slice(0,pos).replace(/\D/g,'').length,nv=pnFmt(el.value);el.value=nv;let c=0,i=0;for(;i<nv.length&&c<dg;i++)if(/\d/.test(nv[i]))c++;if(pos>=ol)i=nv.length;try{el.setSelectionRange(i,i)}catch(_){}S.pnew.inv=nv}
    else if(id==='pn-advsum'){const N=S.pnew,v=pnum(el.value),inv=pnAmt(N).inv;if(inv&&v)N.pct=String(Math.round(v/inv*10000)/100)}
    else S.pnew[id.slice(3)]=el.type==='checkbox'?el.checked:el.value;
    pnPaint();return}
  if((e.target.id==='ppart-v'||e.target.id==='ppart-d')&&PAY.part){const R=PAY.part,p=PAY.rows.find(r=>r.id===R.id);if(e.target.id==='ppart-d')R.d=e.target.value;else R.v=e.target.value;if(p){const i=payPartInfo(p,R.v,R.d);const n=document.getElementById('ppart-info');if(n)n.innerHTML=i.t;const b=document.getElementById('ppart-go');if(b)b.disabled=!i.ok}return}
  if(e.target.id==='pq'){S.pq=e.target.value;const p=e.target.selectionStart;render();const i=document.getElementById('pq');if(i){i.focus();try{i.setSelectionRange(p,p)}catch(_){}}}});
document.addEventListener('keydown',e=>{const t=e.target;if(!t.matches||!t.matches('#pay tr.pr')||(e.key!=='ArrowDown'&&e.key!=='ArrowUp'))return;e.preventDefault();const trs=[...document.querySelectorAll('#pay tr.pr')],i=trs.indexOf(t),n=trs[i+(e.key==='ArrowDown'?1:-1)];if(n)n.focus()});

document.addEventListener('input',e=>{if(e.target.id==='ppause-v'&&PAY.pause){PAY.pause.v=e.target.value;const b=document.getElementById('ppause-go');if(b)b.disabled=!e.target.value.trim()}});
document.addEventListener('keydown',e=>{if(PAY.pause){if(e.key==='Escape'){PAY.pause=null;payRender()}return}
  if(PAY.part){if(e.key==='Escape'){PAY.part=null;render()}else if(e.key==='Enter'&&e.target.id==='ppart-v'){e.preventDefault();const b=document.getElementById('ppart-go');if(b&&!b.disabled)payPartDo()}return}
  if(!S.pnew){if(e.key==='Escape'&&S.psel&&document.getElementById('pcard')&&!PAY.rest){S.psel=null;payCard()}return}if(e.key==='Escape'){S.pnew=null;render()}else if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();payNewGo()}});

document.addEventListener('click',e=>{const t=e.target;
  if(t.closest('[data-pmore]')){S.pmore=!S.pmore;S.pstdd=false;render();return}
  if(t.closest('[data-pstdd]')){S.pstdd=!S.pstdd;S.pmore=false;render();return}
  if(t.closest('[data-pstall]')){S.pst={};render();return}
  if(t.closest('.pmr .pmi')){S.pmore=false;setTimeout(render,0);return}
  if((S.pmore||S.pstdd)&&!t.closest('.pdd')){S.pmore=false;S.pstdd=false;render()}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(S.pmore||S.pstdd)){S.pmore=false;S.pstdd=false;render()}});
