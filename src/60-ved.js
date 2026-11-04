/* ---------- ВЕДОМОСТЬ ---------- */
function prodByLabel(){const o={};if(PD)for(const m of PD.mods)o[m.label]=m;return o}
function missingFromProd(h){
  const C=S.C[h];if(!PD||!C)return[];const have=new Set(C.list.map(e=>e.code).filter(Boolean));const cnt=(PD.hotels[h]||{});const out=new Map();
  for(const m of PD.mods){if(!(cnt[m.id]>0))continue;for(const [grp,items] of m.pur)for(const it of items){if(!it[3]||have.has(it[0]))continue;
    const e=out.get(it[0])||{code:it[0],name:it[1],unit:it[2],grp,mods:[]};e.mods.push({l:m.label,q:it[3]});out.set(it[0],e)}}
  return [...out.values()]}
function vedFilter(h){
  const C=S.C[h];let list=C.list;const lab=S.vmod;
  if(lab)list=list.filter(e=>e.q[lab]>0);
  if(S.vf==='appr')list=list.filter(e=>e.st==='appr');else if(S.vf==='draft')list=list.filter(e=>e.st==='draft');
  if(S.vq){const q=S.vq.toLowerCase();list=list.filter(e=>((e.code||'')+' '+e.name+' '+e.rows.map(r=>r.sup+' '+r.lot).join(' ')).toLowerCase().includes(q))}
  return list}
function stTag(e){return e.st==='appr'?'<span class="tag t-ok">подано</span>':'<span class="tag t-wait">черновик</span>'}
function legacyNote(h){const L=(S.C[h]||{}).legacy||[];if(!L.length||!MIX[h])return '';const M=MIX[h];
  return `<div class="card legn" style="margin-bottom:14px"><b>Состав модулей изменился: 1А ×${M['1А']}, 1Б ×${M['1Б']}, 23 ×${M['23']}</b> <span class="mut">(раньше «1» ×18, «23» ×10).</span> Заявки в старом формате: <b class="m">${esc(L.join(', '))}</b> — программа пересчитала их сама: «1» разнесена на 1А и 1Б с тем же количеством на модуль. Если в позиции кровати или текстиль у 1А и 1Б различаются, обновите файл заявки.</div>`}
function tabV(h){
  const C=S.C[h];const all=C.list;const na=all.filter(e=>e.st==='appr').length,nd=all.length-na;
  const miss=missingFromProd(h);const tot=all.length+miss.length;
  const pa=100*na/Math.max(tot,1),pd=100*nd/Math.max(tot,1);
  const modBtns=`<button data-vm="" aria-pressed="${S.vmod===''}">Все модули</button>`+C.labels.map(m=>`<button data-vm="${esc(m.l)}" aria-pressed="${S.vmod===m.l}" title="в отеле ${m.k} шт.">${esc(m.l)}${m.k>1?` ×${m.k}`:''}</button>`).join('');
  const list=vedFilter(h);
  const groups=new Map();for(const e of list){const k=e.rows.find(r=>r.st===e.st).z.slice(0,4);(groups.get(k)||groups.set(k,[]).get(k)).push(e)}
  const secTitle=k=>{const z=S.Z.find(x=>x.sec===k);return k+' '+(z?z.t:'')};
  const ML=S.vmod===''?C.labels:[];const NC=ML.length;
  let body='';const firstK=[...groups.keys()].sort()[0];
  for(const k of [...groups.keys()].sort()){const es=groups.get(k);const a=es.filter(e=>e.st==='appr').length;const op=!!S.vopen[k]||!!S.vq;const pg=100*a/es.length;
    const pw=es.filter(e=>e.st==='appr'&&itPay(h,e).k==='ok').length;const pp=100*pw/es.length;
    if(k===firstK)body+=`<tr class="grph"><td colspan="${S.vmod===''?3+NC:7}"><div class="sg"><span></span><span>Раздел</span><span>Название</span><span>Подано снабжению</span><span>Согласовано к оплате</span><span class="r">%</span></div></td></tr>`;
    body+=`<tr class="grp clk" data-vg="${esc(k)}"><td colspan="${S.vmod===''?3+NC:7}"><div class="sg"><span class="m mut">${op?'▾':'▸'}</span><b class="m">${esc(k)}</b><span>${esc((S.Z.find(x=>x.sec===k)||{}).t||'')}</span><span class="sc"><span class="bar"><i style="width:${pg}%;background:var(--ok)"></i></span><span class="m">${a} из ${es.length}</span></span><span class="sc"><span class="bar"><i style="width:${pp}%;background:#4F8BE0"></i></span><span class="m">${pw} из ${es.length}</span></span><b class="m r" style="color:${a===es.length?'var(--ok)':a===0?'var(--no)':'inherit'}">${Math.round(pg)}%</b></div></td></tr>`;
    if(!op)continue;
    for(const e of es){const r=e.rows.find(x=>x.st===e.st);
      if(S.vmod===''){body+=`<tr class="clk" data-row="${esc(e.key)}"><td class="m">${esc(e.code||'без кода')}</td><td class="nm">${esc(e.name)}</td><td class="sd"><span class="dot ${e.st==='appr'?'dk':'dw'}" title="${e.st==='appr'?'отработан':'в черновике'}"></span></td>${ML.map(m=>e.q[m.l]?`<td class="c ${e.st==='appr'?'cok':'cw'}">${fmt(e.q[m.l])}</td>`:'<td class="c ce">·</td>').join('')}</tr>`}
      else{const qm=e.q[S.vmod];body+=`<tr class="clk" data-row="${esc(e.key)}"><td class="m">${esc(e.code||'без кода')}</td><td>${esc(e.name)}</td><td class="mut">${esc(e.unit)}</td><td class="n m">${fmt(qm)}</td><td>${stTag(e)}</td><td>${payShort(itPay(h,e))}</td><td class="m">${esc(r.z)}${r.lot?` · ${esc(r.lot)}`:''}</td><td class="mut" style="max-width:220px">${esc(r.sup)}</td></tr>`}}}
  const more='';
  const chips=[['all','Все'],['appr','Подано'],['draft','Не подано']].map(([k,l])=>`<button class="chip" data-vf="${k}" aria-pressed="${S.vf===k}">${l}</button>`).join('');
  return `${legacyNote(h)}<div class="card" style="margin-bottom:14px"><div class="flt" style="align-items:flex-start;flex-direction:column;gap:10px"><div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;width:100%">${S.vmod!==''?`<button class="chip" data-chk="1">Чек-лист модуля ${esc(S.vmod)}</button>`:''}
   <div style="flex-grow:1;min-width:240px;max-width:380px"><div style="display:flex;justify-content:space-between;font-size:12px"><b>Подано снабжению</b><span class="m">${na} из ${tot}</span></div><div class="bar"><div style="width:${pa}%;background:var(--ok)"></div><div style="width:${pd}%;background:#E0A030"></div></div>
   <div class="mut" style="font-size:11px">зелёный: подано, есть в согласованной заявке · жёлтый: только в черновике${miss.length?` · не заявлено: ${miss.length}`:''}</div></div></div>
   <div class="mods"><span class="mut" style="font-size:12px;margin-right:4px">Модуль</span>${modBtns}</div></div></div>
   <div class="card"><div class="flt">${chips}<input id="vq" type="search" placeholder="Поиск: код, название, поставщик, лот" value="${esc(S.vq)}" aria-label="Поиск"><span style="margin-left:auto;display:flex;gap:8px;align-items:center"><span class="mut" style="font-size:12px">${list.length} компонентов${S.vmod?` в модуле ${esc(S.vmod)}`:''}</span><button class="chip" data-vgall="1">Развернуть всё</button><button class="chip" data-vgall="0">Свернуть всё</button></span></div>
   <div class="tw">${S.vmod===''?`<table class="mxv"><thead><tr><th>Компонент</th><th>Номенклатура</th><th title="Статус"></th>${ML.map(m=>`<th class="c" title="в отеле ${m.k} шт.">${esc(m.l)}${m.k>1?`<span style="display:block;font-weight:400;opacity:.7">×${m.k}</span>`:''}</th>`).join('')}</tr></thead>`:`<table style="min-width:900px"><thead><tr><th>Компонент</th><th>Номенклатура</th><th>Ед.</th><th class="n">На 1 модуль ${esc(S.vmod)}</th><th>Подача</th><th>Оплата</th><th>Заявка · лот</th><th>Поставщик</th></tr></thead>`}<tbody>${body||'<tr><td colspan="7" class="mut">Ничего не найдено</td></tr>'}</tbody></table></div>${more}</div>
   <p class="note">«Подано» значит, что компонент есть в согласованной заявке. «Согласовано к оплате» — по поставщику позиции в реестре платежей стоит галочка РП; факт оплаты в реестре пока не ведётся. В режиме «Все модули» в клетках количество на один модуль: зелёная клетка — позиция в согласованной заявке, жёлтая — только в черновике. Клик по строке открывает карточку: заявки, лот, счета из реестра и прогноз прихода.</p>`}
function tabM(h){
  const miss=missingFromProd(h).filter(e=>!S.vmod||e.mods.some(m=>m.l===S.vmod));
  const body=miss.map(e=>`<tr><td class="m">${esc(e.code)}</td><td>${esc(e.name)}</td><td class="mut">${esc(e.unit)}</td><td class="m">${e.mods.map(m=>`${esc(m.l)}: ${fmt(m.q)}`).join(', ')}</td><td class="mut">${esc(e.grp)}</td></tr>`).join('');
  return `<div class="card"><h3>Покупные компоненты из «Состава модулей» без заявки · отель ${h}<small>${miss.length} кодов</small></h3><div class="tw"><table><thead><tr><th>Компонент</th><th>Номенклатура</th><th>Ед.</th><th>На модуль (тип: кол-во)</th><th>Группа</th></tr></thead><tbody>${body||'<tr><td colspan="5" class="mut">Все покупные компоненты модулей отеля найдены в заявках</td></tr>'}</tbody></table></div></div>
   <p class="note">Список берётся из встроенного «Состава модулей» (покупные изделия по ведомости мотеля 8) и сверяется с кодами всех заявок отеля. Отсутствие кода не всегда ошибка: изделие могли переименовать или заменить.</p>`}
const MQO={};
function mqCell(x){const es=Object.entries(x.q||{});if(!es.length)return '<span class="mut" title="в заявке нет разбивки по модулям">модули не распределены</span>';
  return '<span class="mut">модули</span>'+es.map(([m,q])=>`<span>${esc(m)}${q!==1?` ×${fmt(q)}`:''}</span>`).join('')}
function fitTags(root){root.querySelectorAll('.mqs').forEach(b=>{const sp=[...b.querySelectorAll('span:not(.mut)')];if(!sp.length)return;const key=b.dataset.key;
  if(MQO[key]){b.classList.add('wr');b.insertAdjacentHTML('afterbegin',`<button class="mqb" data-mq="${key}">▾ модули</button>`);b.querySelector('.mut').remove();return}
  if(b.scrollWidth<=b.clientWidth+1)return;
  b.innerHTML=`<button class="mqb" data-mq="${key}">▸ модули · ${sp.length}</button>`})}
function lotDrawer(){const [h,n,li]=S.lotd.split('|');const z=S.Z.find(x=>x.n===n);const H=z&&z.h[h];const l=H&&H.lots[+li];if(!l)return '';
  const its=(l.ix||[]).map(i=>H.items[i]);const rows=regFor(h,z.n,l.skey);
  const body=its.map(x=>`<tr class="ir"><td class="m">${esc(x.code||'—')}</td><td>${esc(x.name)}</td><td class="mut">${esc(x.unit)}</td><td class="n m">${fmt(x.total)}</td></tr><tr class="mqr"><td></td><td colspan="3"><div class="mqs" data-key="${S.lotd}|${its.indexOf(x)}">${mqCell(x)}</div></td></tr>`).join('');
  return `<button class="x" data-close="1" aria-label="Закрыть">×</button><div class="m mut">${esc(z.n)} ${esc(z.t)} · отель ${h}</div><h2>${esc(l.codes.join(', ')||'Без лота')} · ${esc(l.sup||'поставщик не указан')}</h2>
   <dl><dt>Позиций</dt><dd class="m">${l.n}</dd><dt>Подать до</dt><dd class="m">${dts(H.order)}</dd><dt>Нужно на объекте</dt><dd class="m">${dts(H.need)}</dd></dl>
   <h4>Что входит в лот</h4><div class="tw"><table style="min-width:0"><thead><tr><th>Компонент</th><th>Номенклатура</th><th>Ед.</th><th class="n">Всего</th></tr></thead><tbody>${body||'<tr><td colspan="5" class="mut">Позиций нет</td></tr>'}</tbody></table></div>
   <h4>Платежи поставщика в реестре</h4>${rows.map(r=>`<div class="li" style="padding:8px 0"><div>${esc(r.doc)}<small>${esc(r.desc)} · неделя ${r.week||'—'} · приход ${dts(r.eta)}</small></div>${r.ok?'<span class="tag t-ok">согл.</span>':'<span class="tag t-wait">ждёт</span>'}</div>`).join('')||'<div class="mut" style="font-size:13px">Платежей по этому поставщику в реестре нет.</div>'}`}
function drawer(){
  const h=S.hotel;const e=S.C&&S.C[h]&&S.C[h].map.get(S.drawer);if(!e)return '';
  const rowsT=e.rows.map(r=>{const rg=regFor(h,r.z,skey(r.sup));return `<tr><td class="m">${r.z}</td><td><span class="tag ${r.st==='appr'?'t-ok':'t-wait'}">${r.st==='appr'?'согл.':'черн.'}</span></td><td class="m">${esc(r.lot)}</td><td>${esc(r.sup)}</td><td class="n m">${fmt(r.total)}</td><td>${payTag(payOf(rg))}</td></tr>`}).join('');
  const r0=e.rows.find(r=>r.st===e.st);const pays=regFor(h,r0.z,skey(r0.sup));
  const mq=Object.entries(e.q).map(([l,q])=>`<span class="m">${esc(l)}: ${fmt(q)}</span>`).join(' · ');
  return `<button class="x" data-close="1" aria-label="Закрыть">×</button><div class="m mut">${esc(e.code||'без кода')}</div><h2>${esc(e.name)}</h2><div style="margin:8px 0">${stTag(e)}</div>
   <dl><dt>Единица</dt><dd>${esc(e.unit)}</dd><dt>Всего по отелю ${h}</dt><dd class="m">${fmt(e.total)} <span class="mut">(запас ${fmt(e.zap)})</span></dd><dt>На модуль</dt><dd>${mq||'—'}</dd><dt>Нужно на объекте</dt><dd class="m">${dts(r0.need)}</dd><dt>Подать до</dt><dd class="m">${dts(r0.order)}</dd></dl>
   <h4>Где в заявках</h4><div class="tw"><table style="min-width:0"><thead><tr><th>Заявка</th><th></th><th>Лот</th><th>Поставщик</th><th class="n">Всего</th><th>Платежи</th></tr></thead><tbody>${rowsT}</tbody></table></div>
   <h4>Платежи поставщика в реестре</h4>${pays.map(r=>`<div class="li" style="padding:8px 0"><div>${esc(r.doc)}<small>${esc(r.desc)} · неделя ${r.week||'—'} · приход ${dts(r.eta)}</small></div>${r.ok?'<span class="tag t-ok">согл.</span>':'<span class="tag t-wait">ждёт</span>'}</div>`).join('')||'<div class="mut" style="font-size:13px">Платежей по этому поставщику в реестре нет.</div>'}`}
