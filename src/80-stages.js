/* ---------- ЭТАПЫ И НАСТРОЙКИ ПРОЕКТА ---------- */
const STG={
 '11':{ext:'2027-05-20',hand:'2027-04-15',st:[['kd','КД технических модулей Астаны','2026-10-15','2027-01-31'],['zh','Производство жилых модулей (Астана)','2026-11-15','2026-12-31'],['tm','Технические модули, Минск (без КД)','2026-11-15','2026-12-31'],['ta','Технические модули, Астана','2027-02-01','2027-02-28'],['smr','СМР (монтаж на объекте)','2027-03-01','2027-04-15']]},
 '10':{ext:'2027-07-06',hand:'2027-06-01',st:[['kd','КД','2026-10-01','2026-11-30'],['zh','Производство жилых модулей (Астана)','2027-01-01','2027-03-31'],['tm','Лестничные модули, Минск (без КД)','2027-01-01','2027-01-31'],['smr','СМР (монтаж на объекте)','2027-04-15','2027-06-01']]},
 '12':{ext:'2027-08-20',hand:'2027-07-20',st:[['kd','КД','2026-10-01','2026-10-31'],['zh','Производство жилых модулей (Астана)','2026-12-01','2027-01-31'],['tm','Технические модули, Минск (без КД)','2026-12-01','2027-01-31'],['ta','Технические модули, Астана','2027-03-01','2027-03-31'],['smr','СМР (монтаж на объекте)','2027-06-01','2027-07-20']]}};
const cfgK=(h,id,f)=>'cfg|'+h+'|'+id+'|'+f;
const cfgGet=(h,id,f,def)=>{const e=CK[cfgK(h,id,f)];return e&&e.v!==undefined&&e.v!==''?e.v:def};
function stagesView(){
  const T0=Date.UTC(2026,9,1),T1=Date.UTC(2027,11,31),W=T1-T0;const pct=iso=>Math.max(0,Math.min(100,100*(Date.parse(iso+'T00:00:00Z')-T0)/W));
  const months=Array.from({length:15},(_,i)=>{const d=new Date(Date.UTC(2026,9+i,1));return ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'][d.getUTCMonth()]+' '+String(d.getUTCFullYear()).slice(2)});
  const cols=['#7C8CF0','#2E8B6F','#C98A12','#8A5CC2','#B4402E'];
  let out=`<div class="card" style="margin-bottom:14px"><h3>Этапы и настройки проекта<small>даты из внутренней дорожной карты (ред. 07.10.2026); меняйте в полях, изменения запоминаются${SB?' и уходят в общую базу':''}</small></h3></div>`;
  for(const h of HOTELS){const G=STG[h];
    const rows=G.st.map(([id,name,s0,e0],i)=>{const s=cfgGet(h,id,'s',s0),e=cfgGet(h,id,'e',e0);return {id,name,s,e,i}});
    const hand=cfgGet(h,'hand','e',G.hand),ext=cfgGet(h,'ext','e',G.ext);
    const gantt=`<div class="gt"><div class="gm">${months.map(m=>`<span>${m}</span>`).join('')}</div>${rows.map(r=>`<div class="gr"><span class="gl">${esc(r.name)}</span><div class="gbar">${s2(r)}</div></div>`).join('')}<div class="gr"><span class="gl">Сдача / внешний срок</span><div class="gbar"><i class="gpin" style="left:${pct(hand)}%" title="Сдача ${hand}"></i><i class="gpin ge" style="left:${pct(ext)}%" title="Внешний срок ${ext}"></i></div></div></div>`;
    function s2(r){return `<i class="gb" style="left:${pct(r.s)}%;width:${Math.max(.8,pct(r.e)-pct(r.s))}%;background:${cols[r.i%5]}" title="${r.s} — ${r.e}"></i>`}
    const tbl=`<div class="tw"><table><thead><tr><th>Этап</th><th>Старт</th><th>Окончание</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.name)}</td><td><input type="date" class="dt" data-cfg="${h}|${r.id}|s" value="${r.s}"></td><td><input type="date" class="dt" data-cfg="${h}|${r.id}|e" value="${r.e}"></td></tr>`).join('')}
      <tr><td><b>Сдача объекта (конец СМР)</b></td><td></td><td><input type="date" class="dt" data-cfg="${h}|hand|e" value="${hand}"></td></tr><tr><td><b>Внешний срок</b></td><td></td><td><input type="date" class="dt" data-cfg="${h}|ext|e" value="${ext}"></td></tr></tbody></table></div>`;
    const zs=reqs(h).sort((a,b)=>a.n.localeCompare(b.n,'ru',{numeric:true}));const bySec=new Map();for(const z of zs)(bySec.get(z.sec)||bySec.set(z.sec,[]).get(z.sec)).push(z);
    const srows=[...bySec.entries()].sort().map(([sk,l])=>{const need=l.map(z=>z.h[h].need).filter(Boolean).sort()[0]||null;const st0=cfgGet(h,'sec'+sk,'s','');const diff=st0&&need?Math.round((Date.parse(need)-Date.parse(st0))/DAY):null;
      return `<tr><td><b class="m">${esc(sk)}</b> ${esc(l[0].t)}</td><td class="m">${need?need.slice(8,10)+'.'+need.slice(5,7)+'.'+need.slice(0,4):'—'}</td><td><input type="date" class="dt" data-cfg="${h}|sec${sk}|s" value="${st0}"></td><td class="m" style="color:${diff==null?'var(--mute)':diff<0?'var(--no)':'var(--ok)'}">${diff==null?'—':diff<0?'позже старта на '+(-diff)+' дн.':'запас '+diff+' дн.'}</td></tr>`}).join('');
    out+=`<div class="card" style="margin-bottom:14px"><h3>Отель ${h}<small>внешний срок ${esc(ext)} · сдача ${esc(hand)}</small></h3><div style="padding:6px 16px 14px">${gantt}</div>${tbl}
     <div class="flt" style="border-top:1px solid var(--line)"><b>Старт работ по разделам</b><span class="mut" style="font-size:12px">когда раздел нужен в производстве или на объекте; сравнивается со сроком «нужно на объекте» из заявок</span></div>
     <div class="tw"><table><thead><tr><th>Раздел заявок</th><th>Нужно на объекте</th><th>Старт работ</th><th>Запас</th></tr></thead><tbody>${srows||'<tr><td colspan="4" class="mut">Заявок нет</td></tr>'}</tbody></table></div></div>`}
  return out}
