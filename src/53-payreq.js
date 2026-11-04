/* ---------- запрос на платёж: финансист выбирает платежи из реестра, указывает суммы и отправляет бухгалтеру письмо со счетами ---------- */
PAY.reqs=[];
const rqMails=()=>{try{return JSON.parse(localStorage.getItem('kom_acc_mails')||'[]')}catch(e){return[]}};
const rqMailAdd=m=>{try{const a=rqMails().filter(x=>x!==m);a.unshift(m);localStorage.setItem('kom_acc_mails',JSON.stringify(a.slice(0,8)))}catch(e){}};
const rqOk=m=>/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(String(m||'').trim());
function payReqRows(h){const R=S.preq;return PAY.rows.filter(r=>r.hotel===h&&(r.status==='plan'||(R.persp&&r.status==='persp'))&&+r.amt>0)
  .sort((a,b)=>PMON.indexOf(a.month)-PMON.indexOf(b.month)||(a.week||99)-(b.week||99)||a.pos-b.pos)}
async function payReqLoad(){try{PAY.reqs=await (await srvFetch('/rest/v1/pay_requests?select=*&order=created.desc&limit=30')).json()}catch(e){PAY.reqs=[]}if(S.preq)render()}
function payReqSums(items){const m={};for(const x of items)m[x.cur]=(m[x.cur]||0)+x.pay_amt;return Object.keys(m).map(c=>pf2(m[c])+' '+c).join(' + ')||'—'}
function payReqSumHtml(){const R=S.preq;const rows=payReqRows(R.hotel).filter(r=>R.sel[r.id]);const m={};let bad=0,unok=0,nof=0;
  for(const r of rows){const v=pnum(R.amt[r.id]!==undefined?R.amt[r.id]:pf2(r.amt));if(!(v>0)){bad++;continue}m[r.cur]=(m[r.cur]||0)+v;if(!r.ok)unok++;if(!r.inv_file)nof++}
  const s=Object.keys(m).map(c=>pf2(m[c])+' '+c).join(' + ');
  return `Выбрано <b>${rows.length}</b> · к оплате <b>${s||'—'}</b>${bad?` <span class="bad">· без суммы: ${bad}</span>`:''}${unok?` <span class="pwn">· не согласовано руководителем: ${unok}</span>`:''}${nof?` <span class="pwn">· без файла счёта: ${nof}</span>`:''}`}
function payReqView(){const R=S.preq,rows=payReqRows(R.hotel);const hist=PAY.reqs.filter(x=>x.hotel===R.hotel).slice(0,6);
  const body=rows.map(r=>{const on=!!R.sel[r.id],v=R.amt[r.id]!==undefined?R.amt[r.id]:pf2(r.amt);
    return `<tr class="${on?'on':''}"><td class="ctr"><input type="checkbox" data-rqs="${r.id}" ${on?'checked':''} aria-label="Включить в запрос"></td><td class="m">${r.week?'н'+r.week:'—'}<br><span class="mut">${esc(r.month)}</span></td>
     <td class="psup">${esc(r.sup)}${r.urgent?' <b class="purg">!</b>':''}</td><td>${esc(r.descr||'')}</td>
     <td>${r.inv_file?`<button type="button" class="lnk" data-pfile="${r.id}" title="Открыть счёт">📎 ${esc((r.inv_name||'счёт').slice(0,26))}</button>`:'<span class="mut">нет файла</span>'}</td>
     <td class="n m">${pf2(r.amt)} ${esc(r.cur)}</td><td class="n"><input class="rqa" data-rqa="${r.id}" value="${esc(v)}" inputmode="decimal" aria-label="Сумма оплаты"> <span class="mut">${esc(r.cur)}</span></td><td class="ctr">${r.ok?'<span class="pok" title="Согласовано">✓</span>':'<span class="mut" title="Не согласовано руководителем">·</span>'}</td></tr>`}).join('');
  return `<div class="pmodal"><div class="card rqmod" role="dialog" aria-modal="true" aria-labelledby="rq-h"><h3 id="rq-h">Запрос на платёж · Мотель ${esc(R.hotel)}<small>выберите платежи, проверьте суммы и отправьте бухгалтеру</small></h3>
   <div class="rqbody"><div class="rqtop"><label class="pf"><span>Бухгалтер (e-mail)</span><input id="rq-to" type="email" list="rq-mails" value="${esc(R.to||'')}" placeholder="buh@company.kz" autocomplete="off"></label>
    <label class="pf"><span>Комментарий к запросу</span><input id="rq-note" value="${esc(R.note||'')}" placeholder="например: оплатить до пятницы"></label></div>
   <datalist id="rq-mails">${rqMails().map(x=>`<option value="${esc(x)}">`).join('')}</datalist>
   <div class="pbtns"><button class="chip" data-preqa="all">Выбрать все</button><button class="chip" data-preqa="none">Снять все</button><label class="chip"><input type="checkbox" id="rq-persp" ${R.persp?'checked':''}> и перспективные</label></div>
   <div class="tw rqtw"><table class="rqt"><thead><tr><th></th><th>Нед.</th><th>Поставщик</th><th>Описание</th><th>Счёт</th><th class="n">К оплате по плану</th><th class="n">Оплатить</th><th title="Согласовано руководителем">Согл.</th></tr></thead><tbody>${body||'<tr><td colspan="8" class="mut" style="padding:14px">Платежей со статусом «Запланирован к оплате» нет.</td></tr>'}</tbody></table></div>
   <p id="rq-sum" class="rqsum">${payReqSumHtml()}</p>${R.msg?`<p class="note ${/не |ошиб|Укажите|Отметьте|больше/i.test(R.msg)?'red':''}" id="rq-msg">${esc(R.msg)}</p>`:''}
   <div class="pbtns rqbtns"><button class="act p" data-preqa="eml"${R.busy?' disabled':''}>${R.busy?'Готовлю письмо…':'Письмо со счетами (.eml)'}</button><button class="act" data-preqa="mail">Открыть в почте (без вложений)</button><button class="chip" data-preqa="copy">Скопировать текст</button><button class="chip" data-preqa="save">Только сохранить запрос</button><button class="chip" data-preqa="close">Закрыть</button></div>
   <p class="mut" style="font-size:12px;margin:8px 0 0">«Письмо со счетами» скачивается как черновик .eml: откройте его двойным щелчком, оно появится в почтовой программе с вложенными счетами, останется нажать «Отправить». Запрос при этом сохраняется в базе.</p>
   ${hist.length?`<h4 style="margin:14px 0 6px">Сохранённые запросы</h4><ul class="rqh">${hist.map(x=>`<li><span class="mut">${new Date(x.created).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})} · ${esc(x.by_name||'—')}</span> · ${(x.items||[]).length} пл. · <b>${payReqSums(x.items||[])}</b>${x.to_email?` · ${esc(x.to_email)}`:''} <button class="lnk" data-preqa="load:${x.id}">открыть снова</button></li>`).join('')}</ul>`:''}</div></div></div>`}
function payReqItems(){const R=S.preq,rows=payReqRows(R.hotel).filter(r=>R.sel[r.id]);if(!rows.length)return{err:'Отметьте галочками платежи для запроса.'};const items=[];
  for(const r of rows){const v=pnum(R.amt[r.id]!==undefined?R.amt[r.id]:pf2(r.amt));if(!(v>0))return{err:'Укажите сумму оплаты: '+r.sup};if(v>+r.amt+0.005)return{err:'Сумма больше «к оплате» у «'+r.sup+'». Сначала поправьте платёж в карточке.'};
    items.push({pid:r.id,sup:r.sup,descr:r.descr||'',basis:r.basis||'',inv_file:r.inv_file||null,inv_name:r.inv_name||null,inv_files:r.inv_files||[],cur:r.cur,vat:r.vat,plan_amt:+r.amt,pay_amt:Math.round(v*100)/100,week:r.week||null,month:r.month,ok:!!r.ok})}
  return{items}}
function payReqText(items){const R=S.preq;const L=['Запрос на платёж · Мотель '+R.hotel+' · '+pfdt(piso(TODAY)),'От: '+(AUTH&&(AUTH.name||AUTH.email)||''),''];
  items.forEach((x,i)=>L.push((i+1)+'. '+x.sup+(x.descr?' — '+x.descr:''),'   Счёт: '+(x.basis||x.inv_name||'—')+' · '+(x.week?'нед. '+x.week+' · ':'')+'оплатить '+pf2(x.pay_amt)+' '+x.cur+(x.pay_amt<x.plan_amt-0.005?' (часть от '+pf2(x.plan_amt)+')':'')+(x.vat==='без НДС'?', без НДС':', с НДС')+(x.inv_file?'':' · файл счёта не прикреплён')));
  L.push('','Итого к оплате: '+payReqSums(items));if(R.note)L.push('','Комментарий: '+R.note);if(items.some(x=>x.inv_file))L.push('','Счета — во вложении.');return L.join('\n')}
const rqSubj=()=>'Запрос на платёж · Мотель '+S.preq.hotel+' · '+pfdt(piso(TODAY));
async function payReqSave(){const R=S.preq;const o=payReqItems();if(o.err){R.msg=o.err;render();return null}
  const key=JSON.stringify(o.items.map(x=>[x.pid,x.pay_amt]))+'|'+(R.to||'')+'|'+(R.note||'');if(R.savedId&&R.savedKey===key)return o.items;
  try{const r=await (await srvFetch('/rest/v1/pay_requests',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({hotel:R.hotel,by_name:AUTH.name||AUTH.email,to_email:rqOk(R.to)?R.to.trim():null,note:R.note||null,items:o.items})})).json();
    PAY.reqs.unshift(r[0]);R.savedId=r[0].id;R.savedKey=key;R.msg='Запрос сохранён в базе.';if(rqOk(R.to))rqMailAdd(R.to.trim());return o.items}
  catch(e){R.msg='Не сохранилось: '+e.message;render();return null}}
const rqB64=s=>{const u=new TextEncoder().encode(s);let b='';for(let i=0;i<u.length;i+=0x8000)b+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(b)};
const rqWrap=s=>s.replace(/.{1,76}/g,'$&\r\n'),rqW=s=>'=?UTF-8?B?'+rqB64(s)+'?=';
async function rqFile(x){const r=await srvFetch('/storage/v1/object/authenticated/invoices/'+x.inv_file.split('/').map(encodeURIComponent).join('/'));const bl=await r.blob();
  const du=await new Promise((ok,no)=>{const fr=new FileReader();fr.onload=()=>ok(fr.result);fr.onerror=no;fr.readAsDataURL(bl)});
  const nm=x.inv_name||x.inv_file.split('/').pop();return{b64:String(du).split(',')[1]||'',type:bl.type&&!/json|text/.test(bl.type)?bl.type:/\.pdf$/i.test(nm)?'application/pdf':/\.(png|jpe?g)$/i.test(nm)?'image/'+nm.split('.').pop().toLowerCase().replace('jpg','jpeg'):'application/octet-stream',name:nm}}
async function payReqEml(){const R=S.preq;if(!rqOk(R.to)){R.msg='Укажите e-mail бухгалтера.';render();return}
  const items=await payReqSave();if(!items)return;R.busy=true;R.msg='';render();
  try{const seen=new Set(),att=[];for(const x of items){if(x.inv_file&&!seen.has(x.inv_file)){seen.add(x.inv_file);att.push(await rqFile(x))}
      for(const f of x.inv_files||[])if(f.path&&!seen.has(f.path)){seen.add(f.path);att.push(await rqFile({inv_file:f.path,inv_name:f.name}))}}
    const bd='----=_kom_'+Date.now().toString(36);let m='X-Unsent: 1\r\nTo: '+R.to.trim()+'\r\nSubject: '+rqW(rqSubj())+'\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="'+bd+'"\r\n\r\n--'+bd+'\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n'+rqWrap(rqB64(payReqText(items).replace(/\n/g,'\r\n')));
    for(const a of att)m+='--'+bd+'\r\nContent-Type: '+a.type+'; name="'+rqW(a.name)+'"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="'+rqW(a.name)+'"\r\n\r\n'+rqWrap(a.b64);
    m+='--'+bd+'--\r\n';const u=URL.createObjectURL(new Blob([m],{type:'message/rfc822'})),a=document.createElement('a');a.href=u;a.download='Запрос на платёж '+pfdt(piso(TODAY))+'.eml';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);
    R.msg='Письмо готово ('+att.length+' '+(att.length===1?'счёт':'счетов')+' во вложении): откройте скачанный файл .eml. Запрос сохранён в базе.'}
  catch(e){R.msg='Не удалось собрать письмо: '+e.message}
  R.busy=false;render()}
async function payReqMail(){const R=S.preq;if(!rqOk(R.to)){R.msg='Укажите e-mail бухгалтера.';render();return}const items=await payReqSave();if(!items)return;
  let t=payReqText(items).replace('Счета — во вложении.','Счета пришлю отдельно.');const mk=b=>'mailto:'+encodeURIComponent(R.to.trim()).replace('%40','@')+'?subject='+encodeURIComponent(rqSubj())+'&body='+encodeURIComponent(b);
  while(mk(t).length>1900&&t.length>200)t=t.slice(0,t.length-100)+'…';R.msg='Открываю почтовую программу. Запрос сохранён в базе.';render();location.href=mk(t)}
async function payReqCopy(){const R=S.preq,o=payReqItems();if(o.err){R.msg=o.err;render();return}try{await navigator.clipboard.writeText(payReqText(o.items));R.msg='Текст скопирован.'}catch(e){R.msg='Не удалось скопировать: '+e.message}render()}
document.addEventListener('click',e=>{const t=e.target.closest('[data-preq],[data-preqa]');if(!t)return;const d=t.dataset;
  if(d.preq==='open'){S.preq={hotel:S.hs[0],sel:{},amt:{},to:rqMails()[0]||'',note:'',persp:false,msg:'',busy:false};render();payReqLoad();return}
  const R=S.preq;if(!R)return;const a=d.preqa;
  if(a==='close'){S.preq=null;render()}
  else if(a==='all'||a==='none'){for(const r of payReqRows(R.hotel))R.sel[r.id]=a==='all';R.msg='';render()}
  else if(a==='save'){payReqSave().then(it=>{if(it)render()})}
  else if(a==='eml')payReqEml();else if(a==='mail')payReqMail();else if(a==='copy')payReqCopy();
  else if(a&&a.startsWith('load:')){const q=PAY.reqs.find(x=>x.id===a.slice(5));if(q){R.sel={};R.amt={};for(const x of q.items||[]){if(PAY.rows.some(r=>r.id===x.pid&&r.status!=='paid')){R.sel[x.pid]=true;R.amt[x.pid]=pf2(x.pay_amt)}}R.to=q.to_email||R.to;R.note=q.note||'';R.msg='Запрос открыт: проверьте суммы и отправьте.';render()}}});
document.addEventListener('input',e=>{const R=S.preq;if(!R)return;const t=e.target;
  if(t.id==='rq-to'){R.to=t.value;return}if(t.id==='rq-note'){R.note=t.value;return}
  if(t.dataset&&t.dataset.rqa){R.amt[t.dataset.rqa]=t.value;R.sel[t.dataset.rqa]=true;const c=document.querySelector(`[data-rqs="${t.dataset.rqa}"]`);if(c){c.checked=true;c.closest('tr').classList.add('on')}const s=document.getElementById('rq-sum');if(s)s.innerHTML=payReqSumHtml()}});
document.addEventListener('change',e=>{const R=S.preq;if(!R)return;const t=e.target;
  if(t.dataset&&t.dataset.rqs){R.sel[t.dataset.rqs]=t.checked;t.closest('tr').classList.toggle('on',t.checked);const s=document.getElementById('rq-sum');if(s)s.innerHTML=payReqSumHtml()}
  else if(t.id==='rq-persp'){R.persp=t.checked;render()}
  else if(t.dataset&&t.dataset.rqa){const v=pnum(t.value);if(v>0)t.value=R.amt[t.dataset.rqa]=pf2(v)}});
document.addEventListener('keydown',e=>{if(S.preq&&e.key==='Escape'&&!S.pnew&&!PAY.part&&!PAY.rest){S.preq=null;render()}});
