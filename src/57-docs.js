/* ---------- документация: общее ТЗ по отелю и протоколы по модулям ---------- */
const DOCS={rows:[],loaded:false,busy:'',err:''};
const dcEdit=()=>!!(SRV.on&&AUTH&&['admin','manager','tech'].includes(AUTH.role));
async function docsLoad(force){if(!SRV.on||!AUTH||(DOCS.loaded&&!force))return;DOCS.loaded=true;
  try{DOCS.rows=await (await srvFetch('/rest/v1/docs?select=*&order=created.desc')).json();DOCS.err=''}catch(e){DOCS.err='Документы не загрузились: '+e.message}
  if(S.sec==='docs')render()}
const dcSize=n=>n>=1048576?(n/1048576).toFixed(1).replace('.',',')+' МБ':Math.max(1,Math.round(n/1024))+' КБ';
function dcFile(r,ed){return `<div class="dfile"><button type="button" class="lnk" data-dopen="${r.id}" title="Открыть">📎 ${esc(r.name)}</button><span class="mut">${r.size?dcSize(+r.size)+' · ':''}${r.created?new Date(r.created).toLocaleDateString('ru-RU'):''}${r.by_name?' · '+esc(r.by_name):''}</span>${ed?`<button type="button" class="lnk mu" data-ddel="${r.id}" title="Удалить файл" aria-label="Удалить файл">×</button>`:''}</div>`}
function dcAdd(kind,module,label){return `<label class="act">${label}<input type="file" multiple hidden data-dk="${kind}" data-dm="${esc(module||'')}"></label>`}
function docsView(){const h=S.hs[0],ed=dcEdit();
  if(!SRV.on)return `<div class="page">${hotelBar()}<div class="card" style="padding:24px"><h2 style="margin-top:0">Документация</h2><p class="mut">Раздел работает при подключении к базе — войдите в систему.</p></div></div>`;
  docsLoad();
  const all=DOCS.rows.filter(r=>r.hotel===h),tz=all.filter(r=>r.kind==='tz'),pr=all.filter(r=>r.kind==='protocol');
  const labels=((S.C&&S.C[h]&&S.C[h].labels)||[]).map(x=>x.l);
  const mods=[...new Set([...labels,...pr.map(r=>r.module||'').filter(Boolean)])];
  const noMod=pr.filter(r=>!r.module);
  const mrow=m=>{const fs=pr.filter(r=>r.module===m);return `<div class="drow"><div class="dmod"><b>${esc(m)}</b><span class="mut">${fs.length?fs.length+' '+(fs.length%10===1&&fs.length!==11?'файл':fs.length%10>=2&&fs.length%10<=4&&(fs.length<12||fs.length>14)?'файла':'файлов'):'протокола нет'}</span></div><div class="dfs">${fs.map(r=>dcFile(r,ed)).join('')||'<span class="mut">—</span>'}</div>${ed?`<div class="dadd">${dcAdd('protocol',m,'＋ прикрепить')}</div>`:''}</div>`};
  return `<div class="page">${hotelBar()}
   <div class="card dcard"><div class="dhd"><h2>Общее техническое задание</h2><span class="mut">на отель ${esc(h)} · ${tz.length?tz.length+' файл.':'не приложено'}</span><span class="sp"></span>${ed?dcAdd('tz','','＋ прикрепить файлы'):''}</div>
    <div class="dfs">${tz.map(r=>dcFile(r,ed)).join('')||'<span class="mut">Файлов пока нет.</span>'}</div></div>
   <div class="card dcard"><div class="dhd"><h2>Протоколы по модулям</h2><span class="mut">на отель ${esc(h)} · файлов: ${pr.length}</span></div>
    ${mods.length?mods.map(mrow).join(''):'<p class="mut" style="margin:0 0 8px">Список модулей отеля пока не загружен — введите название модуля ниже.</p>'}
    ${noMod.length?`<div class="drow"><div class="dmod"><b>Без модуля</b></div><div class="dfs">${noMod.map(r=>dcFile(r,ed)).join('')}</div></div>`:''}
    ${ed?`<div class="drow dnew"><div class="dmod"><b>Другой модуль</b><span class="mut">если его нет в списке</span></div><div class="dfs"><input class="dt" id="dmx" list="dml" placeholder="название модуля" aria-label="Название модуля"><datalist id="dml">${labels.map(l=>`<option value="${esc(l)}">`).join('')}</datalist></div><div class="dadd">${dcAdd('protocol','','＋ прикрепить')}</div></div>`:''}
   </div>
   ${DOCS.busy?`<p class="note">${esc(DOCS.busy)}</p>`:''}${DOCS.err?`<p class="note red">${esc(DOCS.err)} <button type="button" class="lnk" data-dre="1">Обновить</button></p>`:''}</div>`}
async function docsUpload(hotel,kind,module,files){files=[...files];const big=files.filter(f=>f.size>30*1024*1024);files=files.filter(f=>f.size<=30*1024*1024);
  DOCS.err=big.length?'Файл больше 30 МБ не прикреплён: '+big.map(f=>f.name).join(', '):'';
  if(!files.length){render();return}
  DOCS.busy='Загрузка файлов…';render();let i=0;
  try{for(const f of files){const ext=(/\.[A-Za-z0-9]{1,5}$/.exec(f.name)||[''])[0].toLowerCase(),path=hotel+'/'+kind+'/'+Date.now()+'-'+(i++)+ext;
      await srvFetch('/storage/v1/object/docs/'+path,{method:'POST',headers:{'Content-Type':f.type||'application/octet-stream','x-upsert':'true'},body:f});
      const r=await (await srvFetch('/rest/v1/docs',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({hotel,kind,module:kind==='protocol'&&module?module:null,name:f.name,path,size:f.size,by_name:AUTH&&AUTH.name||''})})).json();DOCS.rows.unshift(r[0])}}
  catch(e){DOCS.err='Не загрузилось: '+e.message}
  DOCS.busy='';render()}
async function docsOpen(id){const r=DOCS.rows.find(x=>x.id===id);if(!r)return;const w=window.open('','_blank');
  try{const j=await (await srvFetch('/storage/v1/object/sign/docs/'+r.path,{method:'POST',body:JSON.stringify({expiresIn:300})})).json();const u=rb('/storage/v1'+j.signedURL);if(w)w.location=u;else location.href=u}catch(e){if(w)w.close();DOCS.err='Файл не открылся: '+e.message;render()}}
async function docsDel(id){const r=DOCS.rows.find(x=>x.id===id);if(!r||!confirm('Удалить файл «'+r.name+'»?'))return;
  try{await srvFetch('/rest/v1/docs?id=eq.'+id,{method:'DELETE'});DOCS.rows=DOCS.rows.filter(x=>x.id!==id);DOCS.err='';try{await srvFetch('/storage/v1/object/docs/'+r.path,{method:'DELETE'})}catch(e){}}catch(e){DOCS.err='Не удалено: '+e.message}render()}
document.addEventListener('click',e=>{const t=e.target.closest('[data-dopen],[data-ddel],[data-dre]');if(!t)return;const d=t.dataset;
  if(d.dopen)docsOpen(d.dopen);else if(d.ddel)docsDel(d.ddel);else if(d.dre){DOCS.err='';docsLoad(true)}});
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||!t.dataset.dk||!t.files||!t.files.length)return;const files=[...t.files];t.value='';
  let m=t.dataset.dm||'';if(t.dataset.dk==='protocol'&&!m){const x=document.getElementById('dmx');m=x?x.value.trim():'';if(!m){DOCS.err='Укажите название модуля, к которому относится протокол';render();return}}
  docsUpload(S.hs[0],t.dataset.dk,m,files)});
