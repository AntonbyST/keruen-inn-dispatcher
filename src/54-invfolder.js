/* ---------- v0.0.10: счета из папки — выбрать папку «счета 2027», приложение само раскладывает файлы по строкам реестра ---------- */
const FNZ=s=>String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/g,' ').trim();
const FEXT=/\.(pdf|docx?|xlsx?|jpe?g|png)$/i;
const FCT={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',doc:'application/msword',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',xls:'application/vnd.ms-excel',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png'};
/* «номерные» слова названия: 17113, 00цб-28557, 261020-20 (годы и короткие числа не считаем) */
const FTOK=s=>{const out=new Set();const add=x=>{if(x.length>=4&&!/^20\d\d$/.test(x))out.add(x)};
  for(const m of String(s||'').toLowerCase().matchAll(/[a-zа-я0-9-]*\d[a-zа-я0-9-]*/g)){const t=m[0].replace(/^-+|-+$/g,'');if(!t)continue;add(t);if(t.includes('-'))for(const q of t.split('-'))add(q)}return out};
const fHotel=rel=>{let m=/МОТЕЛЬ\s*№?\s*(\d+)/i.exec(rel);if(m)return m[1];m=/Мотел[ьяи]\s*(?:№\s*)?(\d+)/i.exec(rel.split('/').pop());return m?m[1]:''};
function foldFiles(list){const out=[];for(const f of list){const rel=f.webkitRelativePath||f.name,name=rel.split('/').pop();if(/^~\$/.test(name)||!FEXT.test(name))continue;
  const parts=rel.split('/'),folder=parts.length>1?parts[parts.length-2]:'';out.push({file:f,rel,name,hotel:fHotel(rel),base:FNZ(folder.replace(/\s+\d+$/,'')),size:f.size||0})}return out}
const fSupOk=(r,base)=>{const s=FNZ(r.sup);return !!base&&s.length>=2&&(s.includes(base)||base.includes(s))};
function foldScore(r,f){if(!f.hotel||f.hotel!==String(r.hotel))return 0;const stem=FNZ(f.name.replace(FEXT,'')),bs=FNZ(r.basis),stem2=stem.replace(/ (подписан[а-я]*|подп)$/,'');let s=0;
  if(bs&&(stem===bs||stem2===bs))s=100;
  else if(fSupOk(r,f.base)){const a=FTOK(r.basis),b=FTOK(f.name);for(const t of a)if(b.has(t)){s=60;break}}
  if(s&&/подписан|подп( |$)/.test(stem))s+=5;if(s&&/специф/.test(stem))s-=50;return s}
/* возвращает {pairs:[{f,rows}], loose:[файлы без строки], left:[строки без файла], skip:[строки, у которых счёт уже есть], amb:[неоднозначные строки]} */
function foldMatch(files,rows,replace){const by=new Map(),amb=[],skip=[],left=[];
  for(const r of rows){if(r.inv_file&&!replace){skip.push(r);continue}
    let best=0,bf=null,tie=false;for(const f of files){const s=foldScore(r,f);if(s>best){best=s;bf=f;tie=false}else if(s===best&&s>0&&bf!==f)tie=true}
    if(best<55){left.push(r);continue}if(tie&&best<100){amb.push(r);continue}
    if(!by.has(bf))by.set(bf,[]);by.get(bf).push(r)}
  const pairs=[...by].map(([f,rs])=>({f,rows:rs})).sort((a,b)=>a.f.rel.localeCompare(b.f.rel,'ru'));const used=new Set(pairs.map(p=>p.f));
  return{pairs,loose:files.filter(f=>!used.has(f)),left,skip,amb}}
function foldPick(list){const files=foldFiles([...list]);const F=PAY.fold={files,replace:false,busy:false,done:0,fail:[],fin:false,err:''};
  if(!files.length){F.err='В выбранной папке нет файлов счетов (pdf, docx, xlsx, jpg, png).'}foldRun();render()}
function foldRun(){const F=PAY.fold;if(!F)return;F.res=foldMatch(F.files,PAY.rows,F.replace)}
function foldView(){const F=PAY.fold,R=F.res;const nr=R?R.pairs.reduce((a,p)=>a+p.rows.length,0):0;const sz=n=>n>=1048576?(n/1048576).toFixed(1)+' МБ':Math.max(1,Math.round(n/1024))+' КБ';
  const lab=r=>`${esc(r.sup)} · Мотель ${esc(r.hotel)} · ${esc(r.note||r.month)} · ${pf2(r.amt)} ${esc(r.cur)}`;
  const body=F.err?`<p class="red">${esc(F.err)}</p>`:F.fin?`<p><b>Готово.</b> Прикреплено файлов: ${F.done}, строк реестра со счётом: ${nr-F.fail.reduce((a,x)=>a+(x.n||0),0)}.</p>${F.fail.length?`<p class="red">Не загрузились (${F.fail.length}):</p><ul class="fold">${F.fail.map(x=>`<li>${esc(x.t)}</li>`).join('')}</ul>`:''}`
   :`<p>Файлов в папке: <b>${F.files.length}</b>. Нашлась пара для <b>${R.pairs.length}</b> файлов → <b>${nr}</b> строк реестра (один счёт может относиться к нескольким платежам: аванс и доплата).</p>
   ${R.skip.length?`<p class="mut">Уже со счётом: ${R.skip.length} строк — не трогаю.</p>`:''}
   <label class="pnur"><input type="checkbox" id="pfold-rep"${F.replace?' checked':''}> заменить уже прикреплённые файлы</label>
   ${R.pairs.length?`<div class="tw foldt"><table class="rep"><thead><tr><th>Файл</th><th>Куда</th></tr></thead><tbody>${R.pairs.map(p=>`<tr><td>${esc(p.f.name)}<br><span class="mut">${esc(p.f.rel.split('/').slice(0,-1).join(' / '))} · ${sz(p.f.size)}</span></td><td>${p.rows.map(r=>`<div>${lab(r)}</div>`).join('')}</td></tr>`).join('')}</tbody></table></div>`:''}
   ${R.loose.length?`<details><summary>Файлы без пары — ${R.loose.length} (останутся в папке; прикрепить вручную в карточке платежа)</summary><ul class="fold">${R.loose.map(f=>`<li>${esc(f.rel)}</li>`).join('')}</ul></details>`:''}
   ${R.left.length?`<details><summary>Строки без файла — ${R.left.length}</summary><ul class="fold">${R.left.map(r=>`<li>${lab(r)}</li>`).join('')}</ul></details>`:''}
   ${R.amb.length?`<details open><summary class="red">Неоднозначно (подходит несколько файлов) — ${R.amb.length}, пропущу</summary><ul class="fold">${R.amb.map(r=>`<li>${lab(r)}</li>`).join('')}</ul></details>`:''}`;
  const btn=F.fin||F.err?`<button class="act p" data-pfold="no">Закрыть</button>`:`<button class="act p" data-pfold="go" ${F.busy||!R.pairs.length?'disabled':''}>${F.busy?`Загружаю… ${F.done} из ${R.pairs.length}`:`Прикрепить ${R.pairs.length} файлов`}</button> <button class="chip" data-pfold="no" ${F.busy?'disabled':''}>Отмена</button>`;
  return `<div class="pmodal"><div class="card pimpc pnmod" role="dialog" aria-modal="true" aria-labelledby="pfold-h"><h3 id="pfold-h">Счета из папки<small>файлы раскладываются по строкам реестра по названию и поставщику</small></h3><div class="pnbody">${body}<div class="pnr pnbt"><span class="sp"></span>${btn}</div></div></div></div>`}
async function foldGo(){const F=PAY.fold;if(!F||F.busy)return;F.busy=true;F.done=0;F.fail=[];render();
  for(const g of F.res.pairs){try{const ext=(/\.[A-Za-z0-9]{1,5}$/.exec(g.f.name)||[''])[0].toLowerCase(),path='payments/'+g.rows[0].id+'/'+Date.now()+ext;
      await srvFetch('/storage/v1/object/invoices/'+path,{method:'POST',headers:{'Content-Type':g.f.file.type||FCT[ext.slice(1)]||'application/octet-stream','x-upsert':'true'},body:g.f.file});
      let bad=0;for(const r of g.rows){try{const j=await (await srvFetch('/rest/v1/payments?id=eq.'+r.id,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({inv_file:path,inv_name:g.f.name})})).json();if(j[0]){const p=PAY.rows.find(x=>x.id===r.id);if(p)Object.assign(p,j[0]);if(j[0].upd>PAY.at)PAY.at=j[0].upd}}catch(e){bad++}}
      if(bad)F.fail.push({t:g.f.name+': не записалось строк — '+bad,n:bad});F.done++}
    catch(e){F.fail.push({t:g.f.name+': '+e.message,n:g.rows.length})}
    PAY.ver++;render()}
  F.busy=false;F.fin=true;PAY.ver++;render()}
document.addEventListener('change',e=>{const t=e.target;if(t.id==='pfold'&&t.files){foldPick(t.files);t.value='';return}
  if(t.id==='pfold-rep'&&PAY.fold){PAY.fold.replace=t.checked;foldRun();render()}});
document.addEventListener('click',e=>{const t=e.target.closest('[data-pfold]');if(!t)return;if(t.dataset.pfold==='go')foldGo();else if(!(PAY.fold&&PAY.fold.busy)){PAY.fold=null;render()}});
document.addEventListener('keydown',e=>{if(PAY.fold&&e.key==='Escape'&&!PAY.fold.busy){PAY.fold=null;render()}});
