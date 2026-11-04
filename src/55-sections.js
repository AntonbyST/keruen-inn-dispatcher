/* ---------- v0.0.10: администратор создаёт свои разделы (к заявкам З-01…З-22 и прочим) ---------- */
function psecView(){const M=PAY.secm,cs=PAY.secs||[];const used=n=>PAY.rows.filter(r=>r.art===n).length;
  return `<div class="pmodal"><div class="card pimpc pnmod" role="dialog" aria-modal="true" aria-labelledby="psec-h"><h3 id="psec-h">Разделы платежей<small>заявки З-01…З-22 и прочие разделы закреплены; здесь можно добавить свои</small></h3><div class="pnbody">
   <div class="pnr"><div class="pnf"><span class="lab">Новый раздел</span><input id="psec-new" autocomplete="off" maxlength="80" value="${esc(M.name)}" placeholder="например, Прочие закупки для сервиса"></div><button class="act p" data-psec="add" type="button" style="align-self:flex-end">Добавить</button></div>
   ${M.err?`<p class="red">${esc(M.err)}</p>`:''}
   ${cs.length?`<ul class="fold">${cs.map(x=>`<li>${esc(x.name)} <span class="mut">· платежей: ${used(x.name)}</span> ${used(x.name)?'':`<button type="button" class="lnk" data-psec="del:${esc(x.name)}">удалить</button>`}</li>`).join('')}</ul>`:'<p class="mut">Своих разделов пока нет.</p>'}
   <details><summary>Закреплённые разделы (${PSEC_REQ.length+PSEC_OTH.length})</summary><ul class="fold">${PSEC_REQ.concat(PSEC_OTH).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>
   <div class="pnr pnbt"><span class="sp"></span><button class="act p" data-psec="close" type="button">Закрыть</button></div></div></div></div>`}
async function psecAdd(){const M=PAY.secm,n=String(M.name||'').replace(/\s+/g,' ').trim();
  if(n.length<3){M.err='Название слишком короткое';render();return}
  if(psecList().some(x=>x.toLowerCase()===n.toLowerCase())){M.err='Такой раздел уже есть';render();return}
  try{await srvFetch('/rest/v1/pay_sections',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({name:n})});PAY.secs=(PAY.secs||[]).concat([{name:n}]).sort((a,b)=>a.name.localeCompare(b.name,'ru'));M.name='';M.err=''}
  catch(e){M.err='Не сохранилось: '+e.message}render();const i=document.getElementById('psec-new');if(i)i.focus()}
async function psecDel(n){const M=PAY.secm;try{await srvFetch('/rest/v1/pay_sections?name=eq.'+encodeURIComponent(n),{method:'DELETE'});PAY.secs=(PAY.secs||[]).filter(x=>x.name!==n);M.err=''}catch(e){M.err='Не удалилось: '+e.message}render()}
document.addEventListener('click',e=>{const t=e.target.closest('[data-psec]');if(!t)return;const v=t.dataset.psec;
  if(v==='open'){PAY.secm={name:'',err:''};render()}else if(v==='close'){PAY.secm=null;render()}else if(v==='add')psecAdd();else if(v.startsWith('del:'))psecDel(v.slice(4))});
document.addEventListener('input',e=>{if(e.target.id==='psec-new'&&PAY.secm)PAY.secm.name=e.target.value});
document.addEventListener('keydown',e=>{if(!PAY.secm)return;if(e.key==='Escape'){PAY.secm=null;render()}else if(e.key==='Enter'&&e.target.id==='psec-new'){e.preventDefault();psecAdd()}});
