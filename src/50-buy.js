/* ---------- ЗАКУПКИ ---------- */
const effFiled=(z,h)=>{const H=z.h[h];const v=cfgGet(h,'f'+z.n,'d','');return v?{d:v,src:'введена вручную',man:true}:{d:H.filed,src:H.fsrc,man:false}};
const filedMark=(H,z,h)=>{const f=effFiled(z,h);const x=H.order&&f.d&&f.d>H.order;
  return `<span style="display:inline-flex;align-items:center;gap:6px" title="${esc(f.src||'дата не указана')}${H.order?'; подать до '+dts(H.order):''}"><input type="date" class="dt" data-cfg="${h}|f${z.n}|d" value="${f.d||''}" aria-label="Дата подачи заявки ${esc(z.n)}" style="width:132px;${f.man?'border-color:var(--ok)':''}"></span>`};
const lateMark=(iso,tg)=>{const x=dd(iso);if(x==null)return '<span class="mut">—</span>';return `<span class="${x<0&&tg?'red':''}">${dts(iso)}</span>`};
function buyKpi(hs){let ap=0,zn=0,io=0,it=0,wait=0,okn=0,sum=0;
  for(const h of hs){const rz=reqs(h).filter(z=>z.h[h].items.length>0);zn+=rz.length;
    for(const z of rz){const n=z.h[h].items.length;it+=n;if(z.st==='appr'){io+=n;ap++}}
    const rr=S.R.filter(r=>r.h===h);wait+=rr.filter(r=>!r.ok).length;const okr=rr.filter(r=>r.ok);okn+=okr.length;sum+=okr.reduce((a,r)=>a+(r.kzt||0),0)}
  const pc=it?Math.round(io/it*100):0;
  return `<div class="kpis"><div class="kpi"><b class="grn">${fmt(io)} / ${fmt(it)}</b><span>позиций заказано, <b style="font-size:inherit;color:inherit">${pc}%</b><br>заявок согласовано ${ap} из ${zn}</span><div class="pb" role="progressbar" aria-valuenow="${pc}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pc}%"></i></div></div>
   <div class="kpi"><b>${okn}${okn+wait?` <small style="font-size:14px;color:var(--mute)">из ${okn+wait}</small>`:''}</b><span>счетов согласовано и ждут оплаты</span><div class="pb"><i style="width:${okn+wait?Math.round(okn/(okn+wait)*100):0}%"></i></div></div>
   <div class="kpi"><b>$ ${fmt(Math.round(sum/RATE))}</b><span>общая согласованная сумма<br>${fmt(Math.round(sum))} ₸ без НДС</span></div>
   <div class="kpi"><b class="amb">${wait}</b><span>счетов ждут вашей галочки</span></div></div>`}
function hotelBar(){const multi=S.sec==='buy'&&!(SRV.on&&(S.tab.buy==='r'||S.tab.buy==='b'));return `<div class="hb"><span class="mut">Отели</span>${HOTELS.map(h=>`<button data-h="${h}" aria-pressed="${S.hs.includes(h)}">${multi?`<i>${S.hs.includes(h)?'✓':''}</i>`:''}Отель ${h}</button>`).join('')}${multi?'<span class="mut" style="font-size:12px">можно выбрать несколько</span>':''}</div>`}
function tabZ(h){
  let rz=reqs(h);
  const lateFn=z=>{const x=dd(z.h[h].order);return z.st==='draft'&&x!=null&&x<0};
  if(S.fz==='appr')rz=rz.filter(z=>z.st==='appr');else if(S.fz==='draft')rz=rz.filter(z=>z.st==='draft');else if(S.fz==='late')rz=rz.filter(lateFn);else if(S.fz==='nopay')rz=rz.filter(z=>z.st==='appr'&&zsum(z,h).n===0);
  rz=rz.sort((a,b)=>(a.h[h].need||'9')<(b.h[h].need||'9')?-1:(a.h[h].need||'9')>(b.h[h].need||'9')?1:a.n.localeCompare(b.n));
  const chips=[['all','Все'],['appr','Согласованные'],['draft','Черновики'],['late','Срок прошёл'],['nopay','Без счетов']].map(([k,l])=>`<button class="chip" data-fz="${k}" aria-pressed="${S.fz===k}">${l}</button>`).join('');
  let body='';
  const G=zview()==='gantt',W=G?zWin(rz,h):null;
  const zrow=(z,ind)=>{let body='';const H=z.h[h];const p=zsum(z,h);const k=h+'|'+z.n;const o=S.open[k];
    const wi=worstInv(zInv(z,h));
    body+=`<tr class="clk" data-open="${k}"><td style="padding-left:${ind?30:10}px"><span class="m mut">${o?'▾':'▸'}</span> <b class="m">${z.n}</b> ${esc(z.t)}${z.who?` <span class="mut">· ${esc(z.who)}</span>`:''} <span class="tag ${z.st==='appr'?'t-ok':'t-gray'}">${z.st==='appr'?'согл.':'черн.'}</span> <span class="mut m" style="font-size:12px">${OT(z.st==='appr'?H.items.length:0,H.items.length)} поз.</span></td>
     ${G?`<td class="m gnd">${H.need?dts(H.need):'—'}</td><td>${gRes(wi,H.need,!wi)}</td><td colspan="2">${gCell(wi,H.need,W,z.st==='appr'?'нет оплат':'не подана')}</td></tr>`:`${(x=>`<td class="m">${z.st==='appr'?filedMark(H,z,h):'<span class="amb">не подана</span>'}<br><span class="mut" style="font-size:12px">план ${planCell(x)}${x.dev!=null?' · '+devCell(x):''}</span></td>`)(pfInfo(z,h))}<td class="m">${lateMark(H.need,false)}</td><td class="m">${zEta(zInv(z,h),H.need)}</td><td>${gapChip((wi||{}).eta,H.need)}</td></tr>`}`;
    if(o&&!G)H.lots.forEach((l,li)=>{const rows=regFor(h,z.n,l.skey);const sp=payOf(rows);
      const its=(l.ix||[]).map(i=>H.items[i]);const nm=[...new Set(its.map(x=>x.name.replace(/\s+/g,' ').slice(0,38)))];
      const sum=nm.length?nm.slice(0,3).join(', ')+(nm.length>3?` и ещё ${nm.length-3}`:''):'';
      body+=`<tr class="sub2 clk" data-lot="${h}|${z.n}|${li}"><td style="padding-left:${ind?54:34}px;white-space:nowrap;max-width:560px;overflow:hidden;text-overflow:ellipsis"><span class="m lc">${esc(l.codes.map(c=>c).join(', ')||'без лота')}</span> · ${esc(l.sup||'поставщик не указан')}${sum?` <span class="mut" style="font-size:12px"> — ${esc(sum.length>60?sum.slice(0,58)+'…':sum)}</span>`:''}</td><td></td><td></td><td></td><td class="m"><span class="mut">${OT(z.st==='appr'?l.n:0,l.n)} поз. · </span>${payTag(sp)}</td></tr>`});
    if(o)for(const v of zInv(z,h))body+=invRow(v,H.need,ind,G,W);
    return body};
  const bySec=new Map();for(const z of rz){(bySec.get(z.sec)||bySec.set(z.sec,[]).get(z.sec)).push(z)}
  const secs=[...bySec.entries()].sort((a,b)=>{const m=l=>l.map(z=>z.h[h].need||'9').sort()[0];return m(a[1])<m(b[1])?-1:m(a[1])>m(b[1])?1:a[0].localeCompare(b[0])});
  /* вид «диаграмма»: сверху разделы без оплат (по сроку), ниже — те, где оплата идёт (по сроку) */
  const sPaid=x=>x[1].some(z=>zInv(z,h).length>0),sPl=n=>n%10===1&&n%100!==11?'раздел':(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?'раздела':'разделов';
  let gk=null,gA=[],gB=[],gN0=null,gTight=null;
  if(G){const nd=x=>x[1].map(z=>z.h[h].need).filter(Boolean).sort()[0];gA=secs.filter(x=>!sPaid(x));gB=secs.filter(sPaid);gN0=gA.map(nd).filter(Boolean).sort()[0]||null;
    for(const x of gB){const wg=worstInv(x[1].flatMap(z=>zInv(z,h))),g=gapN((wg||{}).eta,nd(x));if(g!=null&&(!gTight||g<gTight.g))gTight={g,t:x[0]+' '+x[1][0].t}}
    secs.splice(0,secs.length,...gA,...gB)}
  for(const [sk,zl] of secs){
    if(G){const k2=sPaid([sk,zl])?'B':'A';if(k2!==gk){gk=k2;
      body+=k2==='A'?`<tr class="ghr"><td colspan="5"><i class="gdot" style="background:#F59A92"></i>Нет оплат — ${gA.length} ${sPl(gA.length)}${gN0?` <span class="mut">· ближайший срок ${dts(gN0)}, ${dayN(gN0)-Math.round(TODAY/DAY)<0?"срок прошёл":"через "+(dayN(gN0)-Math.round(TODAY/DAY))+" дн."}</span>`:''}</td></tr>`
        :`<tr class="ghr"><td colspan="5"><i class="gdot" style="background:#9DBBFF"></i>Оплата идёт — ${gB.length} ${sPl(gB.length)}${gTight?` <span class="mut">· самый тесный запас: ${esc(gTight.t)}, ${gTight.g<0?gTight.g:'+'+gTight.g} дн.</span>`:''}</td></tr>`}}
    zl.sort((x,y)=>x.n.localeCompare(y.n,'ru',{numeric:true}));
    const ap=zl.filter(z=>z.st==='appr').length,dr=zl.length-ap,nl=zl.reduce((s,z)=>s+z.h[h].lots.length,0),ni=zl.reduce((s,z)=>s+z.h[h].items.length,0);
    const dd0=zl.filter(z=>z.st==='draft').map(z=>z.h[h].order).filter(Boolean).sort()[0]||null;const nd0=zl.map(z=>z.h[h].need).filter(Boolean).sort()[0]||null;
    const op=!!S.zopen[h+'|'+sk];const multi=zl.length>1;
    body+=`<tr class="grp clk" data-zs="${h}|${sk}"><td><span class="m mut">${op?'▾':'▸'}</span> <b class="m${dr?'':' grn'}">${esc(sk)}</b> <b class="${dr?'':'grn'}">${esc(zl[0].t)}</b> <span class="mut" style="font-weight:400">· ${zl.length} ${zl.length===1?'заявка':zl.length<5?'заявки':'заявок'}</span></td>
     ${(()=>{const L=zl.flatMap(z=>zInv(z,h)),wg=worstInv(L);if(G)return `<td class="m gnd">${nd0?dts(nd0):'—'}</td><td>${gRes(wg,nd0,!wg)}</td><td colspan="2">${gCell(wg,nd0,W)}</td></tr>`;
       const nf=zl.filter(z=>z.st!=='appr').length,pl=zl.map(z=>z.h[h].order).filter(Boolean).sort()[0]||null;
       return `<td class="m"><span class="${nf?'amb':'grn'}">подано ${zl.length-nf} из ${zl.length}</span>${pl?`<br><span class="mut" style="font-size:12px">план ${dts(pl)}</span>`:''}</td><td class="m">${nd0?lateMark(nd0,false):'<span class="mut">—</span>'}</td><td class="m">${zEta(L,nd0)}</td><td>${gapChip((wg||{}).eta,nd0)}</td></tr>`})()}`;
    if(op)for(const z of zl)body+=zrow(z,true)}
  const legend=G?`<span class="tlg"><i class="lb"></i>оплата → приход <i class="lg"></i>запас <i class="ln"></i>нужно на объекте <i class="lp"></i>оплат нет <i class="ld"></i>сегодня</span>`:'';
  return `<div class="card"><h3 style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">Заявки отеля ${h}<span class="zvs" role="group" aria-label="Вид"><button class="chip" data-zv="tab" aria-pressed="${!G}">Таблица</button><button class="chip" data-zv="gantt" aria-pressed="${G}">Диаграмма</button></span>${legend}<small style="margin-left:auto">раздел → заявки → счета; клик по лоту открывает его состав</small></h3><div class="flt">${chips}<span style="margin-left:auto;display:flex;gap:8px"><button class="chip" data-zall="1">Развернуть всё</button><button class="chip" data-zall="0">Свернуть всё</button></span></div><div class="tw"><table${G?' class="zg"':''}><thead>${G?`<tr><th>Раздел / заявка</th><th style="color:#F0A94B">Нужно к</th><th>Запас / до срока</th><th colspan="2">${gAxis(W)}</th></tr>`:`<tr><th>Раздел / заявка</th><th title="дата подачи из файла заявки (можно поправить вручную); под ней — план «Заказать до» и отклонение">Подача</th><th>Нужно на объекте</th><th title="самый поздний приход среди оплаченных счетов: дата оплаты + срок поставки из реестра">Приход · самый поздний</th><th>Запас</th></tr>`}</thead><tbody>${body||'<tr><td colspan="5" class="mut">Ничего нет</td></tr>'}</tbody></table></div></div>`}
/* оплаченные счета заявки: дата оплаты (реестр) + срок поставки → приход; в свёрнутой заявке показывается самый поздний */
function zInv(z,h){const g=new Map();for(const r of S.R){if(r.h!==h||!(r.zs||[]).includes(z.n))continue;const k=r.skey+'|'+r.doc;let o=g.get(k);if(!o)g.set(k,o={sup:r.sup,doc:r.doc,paid:null,term:r.term,td:null,eta:null});
  if(r.paidWk&&(!o.paid||r.paidWk<o.paid)){o.paid=r.paidWk;o.est=!!r.paidEst}if(r.td!=null){o.td=r.td;o.term=r.term}if(r.etaFact&&r.eta)o.eta=r.eta}
  return [...g.values()].filter(o=>o.paid).sort((a,b)=>(b.eta||'')<(a.eta||'')?-1:1)}
function etaTxt(eta,need){if(!eta)return '<span class="mut">срок не указан</span>';const late=need&&eta>need;
  return `<span class="${late?'red':'grn'}">${dts(eta)}</span>${need?`<br><span class="${late?'red':'mut'} m" style="font-size:11px">${late?'+':'запас '}${Math.abs(Math.round((new Date(eta)-new Date(need))/DAY))} дн.${late?' к '+dts(need):''}</span>`:''}`}
function zEta(list,need){if(!list.length)return '<span class="mut">—</span>';const e=list.map(o=>o.eta).filter(Boolean).sort().pop();return etaTxt(e||null,need)}
const zview=()=>{if(S.zview)return S.zview;let v='tab';try{v=localStorage.getItem('kzv')==='gantt'?'gantt':'tab'}catch(e){}return S.zview=v};
/* диаграмма: общее окно дат на всю таблицу; полоса — от оплаты до прихода, оранжевая линия — «нужно на объекте» */
const gapN=(eta,need)=>eta&&need?dayN(need)-dayN(eta):null;
const gapChip=(eta,need)=>{const n=gapN(eta,need);return n==null?'<span class="mut">—</span>':`<b class="${n<0?'red':'grn'}">${n<0?n:'+'+n} дн.</b>`};
function worstInv(list){return list.filter(o=>o.eta).sort((a,b)=>a.eta<b.eta?1:-1)[0]||null}
function zWin(rz,h){const td=Math.round(TODAY/DAY);let a=td-3,b=td+28;for(const z of rz){const H=z.h[h];if(H.need){const n=dayN(H.need);if(n>b)b=n;if(n<a)a=n}
  for(const v of zInv(z,h)){if(v.paid){const d=dayN(v.paid);if(d<a)a=d}if(v.eta){const d=dayN(v.eta);if(d>b)b=d}}}return{a:a-2,b:b+10}}
const GMON=['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
function gGrid(W){const{a,b}=W,sp=b-a;let o='',d=a;while(d<=b){if(new Date(d*DAY).getUTCDay()===1)o+=`<i class="wk" style="left:${((d-a)/sp*100).toFixed(2)}%"></i>`;d++}return o}
/* вариант Г: полоса оплата → приход, отрезок запаса (приход → нужно), пунктирная плашка, если оплат нет */
function gCell(v,need,W,empty){const{a,b}=W,sp=b-a,pc=d=>(Math.min(Math.max((d-a)/sp,0),1)*100).toFixed(2)+'%',td=Math.round(TODAY/DAY),n=need?dayN(need):null;
  const e=v&&v.eta?dayN(v.eta):null,pd=v&&v.paid?dayN(v.paid):null,late=e!=null&&n!=null&&e>n;
  let h=`<div class="tl">${gGrid(W)}<i class="tdy" style="left:${pc(td)}"></i>`;
  if(e!=null){const g=n==null?'g':(n-e<0?'r':n-e<14?'a':'g');
    if(pd!=null)h+=`<i class="tbar" style="left:${pc(pd)};width:calc(${pc(e)} - ${pc(pd)})"></i>`;
    if(n!=null)h+=`<i class="tgap ${g}" style="left:${pc(Math.min(e,n))};width:calc(${pc(Math.max(e,n))} - ${pc(Math.min(e,n))})"></i>`;
    h+=`<i class="tdot ${late?'dr':'dg'}" style="left:${pc(e)}"></i><span class="tlab ${late?'red':'grn'}" style="left:calc(${pc(e)} - 16px)">${dts(v.eta)}</span>`}
  else if(pd!=null)h+=`<i class="tbar" style="left:${pc(pd)};width:8px"></i><span class="tlab mut" style="left:calc(${pc(pd)} + 14px)">срок поставки не указан</span>`;
  else if(n!=null){const od=n<=td;h+=`<i class="tnp${od?' od':''}" style="left:${pc(od?n:td)};width:calc(${pc(od?td:n)} - ${pc(od?n:td)} - 6px)">${od?'срок прошёл':(empty||'нет оплат')}</i>`}
  if(n!=null)h+=`<i class="tnd" style="left:${pc(n)}" title="нужно на объекте ${dts(need)}"></i>`;
  return h+'</div>'}
function gAxis(W){const{a,b}=W,sp=b-a,pc=d=>((d-a)/sp*100).toFixed(2)+'%',td=Math.round(TODAY/DAY);let wk='',mo='';
  const step=Math.max(1,Math.ceil(sp/7/12));let d=a,i=0;
  while(d<=b){const dt=new Date(d*DAY);if(dt.getUTCDay()===1){if(i++%step===0)wk+=`<span class="aw" style="left:${pc(d)}">${dts(isoD(dt))}</span>`}
    if(dt.getUTCDate()===1||(d===a&&dt.getUTCDate()<=12))mo+=`<span class="am" style="left:${pc(d)}">${GMON[dt.getUTCMonth()]}</span>`;d++}
  return `<div class="tl tax">${gGrid(W)}${mo}${wk}<span class="atd" style="left:max(0px,calc(${pc(td)} - 48px))">сегодня ${dts(isoD(new Date(td*DAY)))}</span></div>`}
/* колонка «Запас / до срока»: есть приход — запас в днях (зелёный от 14, жёлтый меньше, красный — опоздание); оплат нет — дней до срока */
function gRes(v,need,nopay){if(!need)return '<span class="mut">—</span>';
  if(!nopay){const n=gapN(v&&v.eta,need);return n==null?'<span class="mut">—</span>':`<span class="gres ${n<0?'r':n<14?'a':'g'}">${n<0?n:'+'+n} дн.</span>`}
  const d=dayN(need)-Math.round(TODAY/DAY);return `<span class="gres ${d<=14?'r':'n'}" title="дней до срока «нужно на объекте»">${d} дн.</span>`}
function invRow(v,need,ind,G,W){const nm=`<td style="padding-left:${ind?54:34}px"><span class="mut">счёт</span> <b>${esc(v.sup)}</b>${v.doc?` <span class="mut">· ${esc(v.doc)}</span>`:''} <span class="mut" style="font-size:12px">· оплачен ${v.est?'~':''}${dts(v.paid)}${v.est?' (по неделе платежа)':''}${v.td!=null?' · срок '+esc(v.term||v.td+' дн.'):''}</span></td>`;
  if(G)return `<tr class="sub2">${nm}<td></td><td>${gRes(v,need,false)}</td><td colspan="2">${gCell(v,need,W)}</td></tr>`;
  return `<tr class="sub2">${nm}<td></td><td></td><td class="m">${etaTxt(v.eta,need)}</td><td>${gapChip(v.eta,need)}</td></tr>`}
const dayN=iso=>Math.round(Date.parse(iso+'T00:00:00Z')/DAY);
/* подача заявки: план — «Заказать до» из заявки, факт — дата подачи (из файла заявки или введённая вручную). Отклонение в днях: плюс — опоздала */
function pfInfo(z,h){const H=z.h[h],plan=H.order||null,fact=z.st==='appr'?effFiled(z,h).d||null:null;let dev=null,kind='';
  if(plan&&fact){dev=dayN(fact)-dayN(plan);kind=dev>0?'late':'ok'}else if(plan&&!fact&&z.st!=='appr'){dev=-dd(plan);kind=dev>0?'over':'wait'}
  return{plan,fact,dev,kind}}
const devCell=x=>{if(x.dev==null)return '<span class="mut">—</span>';const n=Math.abs(x.dev);
  if(x.kind==='late')return `<span class="red">опоздала на ${n} дн.</span>`;if(x.kind==='ok')return `<span class="grn">${x.dev===0?'в срок':'раньше на '+n+' дн.'}</span>`;
  if(x.kind==='over')return `<span class="red">просрочена на ${n} дн.</span>`;return `<span class="mut">осталось ${n} дн.</span>`};
const planCell=x=>x.plan?`<span class="${x.kind==='over'?'red':''}">${dts(x.plan)}</span>`:'<span class="mut">—</span>';
const OT=(o,t)=>`<span class="${o?'grn':'mut'}">${o}</span><span class="mut"> / </span>${t}`;
function tabZm(hs){
  const sl=(f,sep=' / ')=>hs.map(f).join('<span class="mut"> / </span>');
  let rz=S.Z.filter(z=>hs.some(h=>z.h[h]&&z.h[h].items.length+z.h[h].lots.length>0));
  const late=z=>z.st==='draft'&&hs.some(h=>z.h[h]&&dd(z.h[h].order)!=null&&dd(z.h[h].order)<0);
  if(S.fz==='appr')rz=rz.filter(z=>z.st==='appr');else if(S.fz==='draft')rz=rz.filter(z=>z.st==='draft');else if(S.fz==='late')rz=rz.filter(late);else if(S.fz==='nopay')rz=rz.filter(z=>z.st==='appr'&&hs.every(h=>!z.h[h]||zsum(z,h).n===0));
  const need=z=>hs.map(h=>z.h[h]&&z.h[h].need).filter(Boolean).sort()[0]||'9';
  const chips=[['all','Все'],['appr','Согласованные'],['draft','Черновики'],['late','Срок прошёл'],['nopay','Без счетов']].map(([k,l])=>`<button class="chip" data-fz="${k}" aria-pressed="${S.fz===k}">${l}</button>`).join('');
  const dash='<span class="mut">—</span>';
  const pt=z=>{let n=0,ok=0;for(const h of hs)if(z.h[h]){const p=zsum(z,h);n+=p.n;ok+=p.ok}return payTag({n,ok})};
  const zrow=z=>{const k='*'+hs.join('')+'|'+z.n;const o=S.open[k];let b='';
    b+=`<tr class="clk" data-open="${k}"><td style="padding-left:30px"><span class="m mut">${o?'▾':'▸'}</span> <b class="m">${z.n}</b> ${esc(z.t)}${z.who?` <span class="mut">· ${esc(z.who)}</span>`:''}</td>
     <td><span class="tag ${z.st==='appr'?'t-ok':'t-gray'}">${z.st==='appr'?'согласована':'черновик'}</span></td>
     <td class="m">${sl(h=>{const H=z.h[h];if(!H)return dash;const x=pfInfo(z,h);return `<span class="mut">план</span> ${planCell(x)} <span class="mut">· факт</span> ${x.fact?`<span class="${x.kind==='late'?'red':'grn'}">${dts(x.fact)}</span>`:'<span class="mut">не подана</span>'}`})}</td>
     <td class="m">${sl(h=>z.h[h]?lateMark(z.h[h].need,false):dash)}</td>
     <td class="n m">${(t=>OT(z.st==='appr'?t:0,t))(hs.reduce((q,h)=>q+(z.h[h]?z.h[h].items.length:0),0))}</td><td>${pt(z)}</td></tr>`;
    if(o)for(const h of hs){const H=z.h[h];if(!H)continue;H.lots.forEach((l,li)=>{const sp=payOf(regFor(h,z.n,l.skey));
      const its=(l.ix||[]).map(i=>H.items[i]);const nm=[...new Set(its.map(x=>x.name.replace(/\s+/g,' ').slice(0,38)))];
      const sum=nm.length?nm.slice(0,3).join(', ')+(nm.length>3?` и ещё ${nm.length-3}`:''):'';
      b+=`<tr class="sub2 clk" data-lot="${h}|${z.n}|${li}"><td style="padding-left:54px;white-space:nowrap;max-width:420px;overflow:hidden;text-overflow:ellipsis"><span class="tag t-gray">${h}</span> <span class="m lc">${esc(l.codes.join(', ')||'без лота')}</span> · ${esc(l.sup||'поставщик не указан')}${sum?` <span class="mut" style="font-size:12px"> — ${esc(sum.length>50?sum.slice(0,48)+'…':sum)}</span>`:''}</td><td></td><td></td><td></td><td class="n m">${OT(z.st==='appr'?l.n:0,l.n)}</td><td>${payTag(sp)}</td></tr>`})}
    return b};
  const by=new Map();for(const z of rz)(by.get(z.sec)||by.set(z.sec,[]).get(z.sec)).push(z);
  const secs=[...by.entries()].sort((a,b)=>{const m=l=>l.map(need).sort()[0];return m(a[1])<m(b[1])?-1:m(a[1])>m(b[1])?1:a[0].localeCompare(b[0])});
  let body='';
  for(const [sk,zl] of secs){zl.sort((x,y)=>x.n.localeCompare(y.n,'ru',{numeric:true}));
    const ap=zl.filter(z=>z.st==='appr').length,dr=zl.length-ap;const key='*'+hs.join('')+'|'+sk;const op=!!S.zopen[key];
    const sum=f=>sl(h=>zl.reduce((s,z)=>s+(z.h[h]?f(z.h[h]):0),0)||dash);
    const nd=sl(h=>{const d=zl.map(z=>z.h[h]&&z.h[h].need).filter(Boolean).sort()[0];return d?lateMark(d,false):dash});
    const dd0=sl(h=>{const d=zl.filter(z=>z.st==='draft'&&z.h[h]).map(z=>z.h[h].order).filter(Boolean).sort()[0];return d?lateMark(d,true):dash});
    body+=`<tr class="grp clk" data-zs="${key}"><td><span class="m mut">${op?'▾':'▸'}</span> <b class="m">${esc(sk)}</b> <b>${esc(zl[0].t)}</b> <span class="mut" style="font-weight:400">· ${zl.length} ${zl.length===1?'заявка':zl.length<5?'заявки':'заявок'}</span></td>
     <td>${ap?`<span class="tag t-ok">согл. ${ap}</span> `:''}${dr?`<span class="tag t-gray">черн. ${dr}</span>`:''}</td><td class="m">${dr?dd0:dash}</td><td class="m">${nd}</td><td class="n m">${(()=>{let o=0,t=0;for(const z of zl)for(const h of hs)if(z.h[h]){const n=z.h[h].items.length;t+=n;if(z.st==='appr')o+=n}return OT(o,t)})()}</td><td></td></tr>`;
    if(op)for(const z of zl)body+=zrow(z)}
  const lg=hs.join(' / ');
  return `<div class="card"><h3>Заявки отелей ${hs.join(', ')}<small>значения по отелям через слеш в порядке ${lg}</small></h3><div class="flt">${chips}<span style="margin-left:auto;display:flex;gap:8px"><button class="chip" data-zall="1">Развернуть всё</button><button class="chip" data-zall="0">Свернуть всё</button></span></div><div class="tw"><table><thead><tr><th>Раздел / заявка</th><th>Статус</th><th>План / факт подачи · ${lg}</th><th>Нужно на объекте · ${lg}</th><th class="n" title="заказано (в согласованных заявках) / всего">Позиций: заказано / всего</th><th>Платежи в реестре</th></tr></thead><tbody>${body||'<tr><td colspan="6" class="mut">Ничего нет</td></tr>'}</tbody></table></div></div>`}
function tabN(hs){
  const lots=hs.flatMap((h,hi)=>reqs(h).filter(z=>z.st==='draft'&&z.h[h].items.length>0).flatMap((z,zi)=>z.h[h].lots.map((l,k)=>({h,l,k,z,H:z.h[h],zi:hi*1000+zi})).filter(o=>o.l.n>0)));
  lots.sort((a,b)=>{const x=a.H.order||a.H.need||'9',y=b.H.order||b.H.need||'9';return x<y?-1:x>y?1:a.zi-b.zi||a.k-b.k});
  const pill=o=>{const x=dd(o.H.order);const c=x==null?'p-g':x<0?'p-r':x<7?'p-a':'p-g';return `<span class="pill ${c}" title="подать до ${dts(o.H.order)}">${x==null?'срока нет':x<0?'−'+(-x)+' дн.':x===0?'сегодня':'через '+x+' дн.'}</span>`};
  const grp=[['Просрочено',o=>{const x=dd(o.H.order);return x!=null&&x<0}],['Эта неделя',o=>{const x=dd(o.H.order);return x!=null&&x>=0&&x<7}],['Позже',o=>{const x=dd(o.H.order);return x==null||x>=7}]];
  const row=o=>{const l=o.l;const its=(l.ix||[]).map(i=>o.H.items[i]);const nm=[...new Set(its.map(y=>y.name.replace(/\s+/g,' ').slice(0,40)))];
    const sum=nm.length?nm.slice(0,3).join(', ')+(nm.length>3?` и ещё ${nm.length-3}`:''):'';
    return `<div class="nr" data-lot="${o.h}|${o.z.n}|${o.k}"><span class="lc">${esc(l.codes.join(', ')||'без лота')}</span><span>${esc(l.sup||'поставщик не указан')}<small>${esc(sum)}</small></span><span class="m mut" style="text-align:right">${l.n}</span><span class="m mut" title="${esc(o.z.t)}">${hs.length>1?o.h+' · ':''}${o.z.n}</span><span>${pill(o)}</span></div>`};
  const body=grp.map(([t,f])=>{const a=lots.filter(f);if(!a.length)return '';return `<div class="gh"><b>${t}</b><small>${a.length} лотов · ${a.reduce((q,o)=>q+o.l.n,0)} позиций</small></div>`+a.map(row).join('')}).join('');
  return `<div class="card" style="max-width:980px"><h3>Что подавать следующим<small>лоты черновиков по сроку «подать до»</small></h3>${body||'<div class="li mut">Черновиков с позициями нет</div>'}</div>`}
function etaCell(r){if(!r.eta)return '<span class="mut">—</span>';const z=S.Z.find(x=>x.n===r.zs[0]);const need=z&&z.h[r.h]?z.h[r.h].need:null;const late=need&&r.eta>need;return `<span class="${late?'red':''}">${dts(r.eta)}</span>${r.etaFact?' <span class="mut" title="считается от фактической оплаты">✓</span>':''}${late?`<br><span class="red m" style="font-size:11px">+${Math.round((new Date(r.eta)-new Date(need))/DAY)} дн. к ${dts(need)}</span>`:''}`}
function payItems(r){const out=[];for(const zn of r.zs){const z=S.Z.find(x=>x.n===zn);const H=z&&z.h[r.h];if(!H)continue;
  for(const l of H.lots){if(!(l.skey&&r.skey&&(l.skey===r.skey||(Math.min(l.skey.length,r.skey.length)>=5&&(l.skey.includes(r.skey)||r.skey.includes(l.skey))))))continue;
    for(const i of (l.ix||[]))out.push({z:zn,lot:l.codes.join(', '),...H.items[i]})}}return out}
function tabR(h){
  let rr=S.R.filter(r=>r.h===h);
  if(S.fr==='wait')rr=rr.filter(r=>!r.ok);else if(S.fr==='ok')rr=rr.filter(r=>r.ok);else if(S.fr==='free')rr=rr.filter(r=>!r.zs.length);
  rr.sort((a,b)=>(a.wk||'9')<(b.wk||'9')?-1:(a.wk||'9')>(b.wk||'9')?1:a.row-b.row);
  const chips=[['wait','Ждут галочки'],['ok','Согласованные'],['free','Не найдена заявка'],['all','Все']].map(([k,l])=>`<button class="chip" data-fr="${k}" aria-pressed="${S.fr===k}">${l}</button>`).join('');
  const opts=reqs(h).map(z=>`<option value="${z.n}">${z.n} ${esc(z.t)}</option>`).join('');
  const body=rr.map(r=>{const k=r.h+'|'+r.skey;
    const zc=r.zs.length===1&&!r.manual?`<b class="m">${r.zs[0]}</b>`:`<select data-ov="${esc(k)}" aria-label="Заявка для ${esc(r.sup)}"><option value="">${r.zs.length?(r.manual?'выбрано: '+r.zs[0]:'вариантов: '+r.zs.length+' · выбрать'):'не найдена · выбрать'}</option>${opts}</select>`;
    const pi=payItems(r);const pk='R|'+k+'|'+r.doc+'|'+r.row+'|'+r.sheet;const po=S.open[pk];
    const pv=pi.length?`<div class="pcomp clk" data-open="${esc(pk)}"><span class="m mut">${po?'▾':'▸'}</span> ${pi.slice(0,3).map(x=>`<span class="m">${esc(x.code||'—')}</span> ${esc(x.name.slice(0,34))}`).join(' · ')}${pi.length>3?` <span class="mut">и ещё ${pi.length-3}</span>`:''}</div>`:'<div class="pcomp mut">состав: заявка не найдена</div>';
    const det=po?`<tr class="pdet"><td colspan="9"><table><thead><tr><th>Компонент</th><th>Номенклатура</th><th>Ед.</th><th class="n">Всего</th><th>Лот</th><th>Заявка</th></tr></thead><tbody>${pi.map(x=>`<tr><td class="m">${esc(x.code||'—')}</td><td>${esc(x.name)}</td><td class="mut">${esc(x.unit)}</td><td class="n m">${fmt(x.total)}</td><td class="m lc">${esc(x.lot)}</td><td class="m">${x.z}</td></tr>`).join('')}</tbody></table><p class="note" style="margin:6px 0 0">Состав взят из лотов этого поставщика в заявке. Если по поставщику несколько счетов, в каждом показан весь его лот.</p></td></tr>`:'';
    return `<tr><td>${esc(r.sup)}<br><span class="mut" style="font-size:12px">${esc(r.doc)}</span></td><td>${esc(r.desc)}${pv}</td><td class="n m">${fmt(r.amt)}<br><span class="mut">${esc(r.cur)}</span></td><td class="m">н${r.week||'—'}<br><span class="mut">${esc(r.sheet)}</span></td>
     <td>${r.ok?'<span class="tag t-ok">согласовано</span>':'<span class="tag t-wait">ждёт галочки</span>'}</td><td>${zc}</td><td class="m">${esc(r.term||'—')}</td><td class="m">${etaCell(r)}</td><td>${esc(r.resp)}</td></tr>${det}`}).join('');
  return `<div class="card"><h3>Реестр платежей · Мотель ${h}<small>галочку по-прежнему ставите в реестре. Страница её только показывает</small></h3><div class="flt">${chips}<span class="mut" style="margin-left:auto;font-size:12px">${rr.length} строк</span></div>
   <div class="tw"><table style="min-width:980px"><thead><tr><th>Поставщик · основание</th><th>Описание</th><th class="n">Сумма</th><th>Платёж</th><th>Согласование</th><th>Заявка</th><th>Срок поставки</th><th>Приход (прогноз)</th><th>Отв.</th></tr></thead><tbody>${body||'<tr><td colspan="9" class="mut">Нет строк</td></tr>'}</tbody></table></div></div>
   <p class="note">Приход считается так: неделя первого платежа по счёту плюс срок поставки. Пока счёт не оплачен — по плановой неделе, после оплаты — по фактической дате оплаты. Красным отмечен приход позже даты «нужно на объекте» заявки. Если поставщик есть в нескольких заявках, выберите нужную в колонке «Заявка»: выбор запоминается в этом браузере.</p>`}
let RATE=452.59;try{const v=+localStorage.getItem('kom_rate');if(v>0)RATE=v}catch(e){}
const usd=k=>k==null?0:k/RATE;
const MON=['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const monL=m=>m==='-'?'без даты':MON[+m.slice(5,7)-1]+' '+m.slice(2,4);
function tabO(hs){
  const all=!!S.rall;const rr=S.R.filter(r=>hs.includes(r.h)&&(all||r.ok));
  const secOf=r=>{const ss=[...new Set(r.zs.map(z=>z.slice(0,4)))];return ss.length===1?ss[0]:ss.length?'?':'-'};
  const monOf=r=>r.wk?r.wk.slice(0,7):'-';
  const nameOf=k=>k==='-'?'Заявка не найдена':k==='?'?'Несколько разделов':((S.Z.find(x=>x.sec===k)||{}).t||'');
  const M=new Map(),mons=new Set();let max=0;
  for(const r of rr){const k=secOf(r),m=monOf(r);mons.add(m);const e=M.get(k)||M.set(k,{k,by:{},tot:0}).get(k);const v=usd(r.kzt||0);e.by[m]=(e.by[m]||0)+v;e.tot+=v}
  const ms=[...mons].sort((a,b)=>a==='-'?1:b==='-'?-1:a<b?-1:1);const rows=[...M.values()].sort((a,b)=>b.tot-a.tot);
  for(const e of rows)for(const m of ms)max=Math.max(max,e.by[m]||0);
  const mt={};let T=0;for(const e of rows){for(const m of ms)mt[m]=(mt[m]||0)+(e.by[m]||0);T+=e.tot}
  const sel=S.rc||'';const [ss,sm]=sel?sel.split('@'):['',''];
  const cell=(k,m,v)=>{const on=sel===k+'@'+m;const a=max?Math.min(.55,.08+.47*v/max):0;return `<td class="n m rc${on?' on':''}" data-rc="${esc(k)}@${m}" style="${v?`background:rgba(79,139,224,${a.toFixed(2)})`:''}">${v?fmt(Math.round(v)):'<span class="mut">·</span>'}</td>`};
  const head=`<tr><th>Раздел</th>${ms.map(m=>`<th class="n rc ${sm===m&&!ss?'on':''}" data-rc="@${m}" title="показать платежи за месяц">${monL(m)}</th>`).join('')}<th class="n rc" data-rc="">Всего $</th></tr>`;
  const body=rows.map(e=>`<tr><td class="rc" data-rc="${esc(e.k)}@"><b class="m">${e.k==='-'||e.k==='?'?'—':esc(e.k)}</b> ${esc(nameOf(e.k))}</td>${ms.map(m=>cell(e.k,m,e.by[m]||0)).join('')}<td class="n m rc" data-rc="${esc(e.k)}@" style="font-weight:600">${fmt(Math.round(e.tot))}</td></tr>`).join('');
  const foot=`<tr class="grp"><td><b>Итого</b></td>${ms.map(m=>`<td class="n m">${fmt(Math.round(mt[m]||0))}</td>`).join('')}<td class="n m"><b>${fmt(Math.round(T))}</b></td></tr>`;
  let det='';
  if(sel){const L=rr.filter(r=>(!ss||secOf(r)===ss)&&(!sm||monOf(r)===sm)).sort((a,b)=>(b.kzt||0)-(a.kzt||0));const sum=L.reduce((a,r)=>a+usd(r.kzt||0),0);
    det=`<div class="card" style="margin-top:12px"><h3>${ss?esc(ss)+' '+esc(nameOf(ss)):'Все разделы'} · ${sm?monL(sm):'все месяцы'}<small>${L.length} платежей · $ ${fmt(Math.round(sum))}</small></h3><div class="tw"><table><thead><tr><th>Поставщик · основание</th><th>Заявка</th>${hs.length>1?'<th>Отель</th>':''}<th>Неделя</th><th>Статус</th><th class="n">В валюте счёта</th><th class="n">$ без НДС</th></tr></thead><tbody>${L.map(r=>`<tr><td>${esc(r.sup)}<br><span class="mut" style="font-size:12px">${esc(r.doc)}</span></td><td class="m">${r.zs.join(', ')||'—'}</td>${hs.length>1?`<td class="m">${r.h}</td>`:''}<td class="m">н${r.week||'—'} <span class="mut">${esc(r.sheet)}</span></td><td>${r.ok?'<span class="tag t-ok">согласовано</span>':'<span class="tag t-wait">ждёт галочки</span>'}</td><td class="n m">${fmt(r.amt)} ${esc(r.cur)}</td><td class="n m">$ ${fmt(Math.round(usd(r.kzt||0)))}</td></tr>`).join('')}</tbody></table></div></div>`}
  return `<div class="card"><h3>Отчёт по разделам · Мотель ${hs.join(', ')}<small>$ без НДС, по неделе платежа в реестре · всего $ ${fmt(Math.round(T))}</small></h3>
   <div class="flt"><button class="chip" data-rall="0" aria-pressed="${!all}">Только согласованные</button><button class="chip" data-rall="1" aria-pressed="${all}">С ожидающими галочки</button><span class="mut" style="font-size:12px;margin-left:auto">курс ${RATE} ₸ за $ · клик по разделу, месяцу или ячейке открывает платежи</span></div>
   <div class="tw"><table class="rep"><thead>${head}</thead><tbody>${body||'<tr><td colspan="9" class="mut">Платежей нет</td></tr>'}${rows.length?foot:''}</tbody></table></div></div>${planFactHtml(hs)}${det}`}
function tabP(h){
  const okr=S.R.filter(r=>r.h===h&&r.ok);
  const secOf=r=>{const ss=[...new Set(r.zs.map(z=>z.slice(0,4)))];return ss.length===1?ss[0]:ss.length?'?':'-'};
  const G=new Map();
  for(const r of okr){const sk=secOf(r);const s=G.get(sk)||G.set(sk,{k:sk,sup:new Map(),usd:0,n:0}).get(sk);
    const e=s.sup.get(r.skey)||s.sup.set(r.skey,{sup:r.sup,zs:new Set(),n:0,kzt:0,docs:new Set(),cur:{}}).get(r.skey);
    r.zs.forEach(z=>e.zs.add(z));e.n++;e.kzt+=r.kzt||0;e.docs.add(r.doc);e.cur[r.cur]=(e.cur[r.cur]||0)+r.amt;s.usd+=usd(r.kzt||0);s.n++}
  const tot=[...G.values()].reduce((a,s)=>a+s.usd,0);
  const nameOf=k=>k==='-'?'Заявка не найдена':k==='?'?'Несколько разделов (уточните поставщика)':((S.Z.find(x=>x.sec===k)||{}).t||'');
  const order=[...G.values()].sort((a,b)=>b.usd-a.usd);
  let body='';
  for(const s of order){const op=!!S.popen[h+'|'+s.k];const sh=tot?100*s.usd/tot:0;
    body+=`<tr class="grp clk" data-ps="${h}|${esc(s.k)}"><td colspan="6"><div class="sg" style="max-width:none;position:static;grid-template-columns:20px 54px minmax(140px,1fr) 190px 52px 120px"><span class="m mut">${op?'▾':'▸'}</span><b class="m">${s.k==='-'||s.k==='?'?'—':esc(s.k)}</b><span>${esc(nameOf(s.k))}</span><span class="sc"><span class="bar"><i style="width:${sh}%;background:#4F8BE0"></i></span><span class="m">${s.n} пл.</span></span><b class="m r">${Math.round(sh)}%</b><b class="m r">$ ${fmt(Math.round(s.usd))}</b></div></td></tr>`;
    if(!op)continue;
    for(const e of [...s.sup.values()].sort((a,b)=>b.kzt-a.kzt))body+=`<tr><td style="padding-left:34px">${esc(e.sup)}</td><td>${[...e.zs].map(z=>`<b class="m">${z}</b>`).join(' ')||'<span class="mut">не найдена</span>'}</td><td class="m">${[...e.docs].map(esc).join('<br>')}</td><td class="n m">${e.n}</td><td class="n m">${Object.entries(e.cur).map(([c,v])=>fmt(v)+' '+c).join('<br>')}</td><td class="n m">$ ${fmt(Math.round(usd(e.kzt)))}</td></tr>`}
  return `<div class="card"><h3>Закуплено: согласованные платежи · Мотель ${h}<small>всего $ ${fmt(Math.round(tot))} без НДС</small></h3>
   <div class="flt"><label class="mut" style="font-size:13px">Курс, ₸ за $ <input id="rate" value="${RATE}" inputmode="decimal" style="width:90px;font:inherit;border:1px solid var(--line);border-radius:6px;padding:5px 8px;background:var(--panel);color:var(--ink)"></label><span class="mut" style="font-size:12px">по умолчанию курс Нацбанка РК на 20.10.2026; суммы взяты из колонки «KZT без НДС» реестра</span><span style="margin-left:auto;display:flex;gap:8px"><button class="chip" data-pall="1">Развернуть всё</button><button class="chip" data-pall="0">Свернуть всё</button></span></div>
   <div class="tw"><table><thead><tr><th>Раздел / поставщик</th><th>Заявки</th><th>Счета</th><th class="n">Платежей</th><th class="n">Сумма в валюте счёта</th><th class="n">$ без НДС</th></tr></thead><tbody>${body||'<tr><td colspan="6" class="mut">Согласованных платежей пока нет</td></tr>'}</tbody></table></div></div>`}
