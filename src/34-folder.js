/* ---------- папка ---------- */
let ROOTS=[];
const idb=(m,fn)=>new Promise((res,rej)=>{try{const q=indexedDB.open('kom',1);q.onupgradeneeded=()=>q.result.createObjectStore('k');q.onsuccess=()=>{const tx=q.result.transaction('k',m),st=tx.objectStore('k'),rq=fn(st);tx.oncomplete=()=>res(rq&&rq.result);tx.onerror=()=>rej(tx.error)};q.onerror=()=>rej(q.error)}catch(e){rej(e)}});
async function readDir(dir){const o=[];for await(const[n,h]of dir.entries()){if(h.kind==='file'&&/\.xlsx$/i.test(n)&&!n.startsWith('~$'))o.push(h)}return o}
const SKIP=/^(КД|Закупки \(архив\)|договор|Устав|ТЗ|Расчеты|переписка|Общая|городской|трассовые|планировки|Состав модулей)/i;
async function scan(root){
  const f={ap:null,dr:null,reg:[]};
  async function walk(dir,depth){for await(const[n,h]of dir.entries()){
    if(h.kind==='directory'){
      if(/^Заявки \(согласованные/i.test(n))f.ap=h;
      else if(/^Заявки \(/i.test(n)&&/черновик|шаблон/i.test(n))f.dr=f.dr||h;
      else if(depth<1&&!SKIP.test(n))await walk(h,depth+1)}
    else if(/^Реестр платежей.*\.xls[mx]$/i.test(n)&&!n.startsWith('~$'))f.reg.push(h)}}
  await walk(root,0);return f}
async function loadAll(){
  S.msg='Читаю файлы…';render();
  const src={ap:[],dr:[],reg:[]};const seen=new Set();
  for(const root of ROOTS){const f=await scan(root);
    if(f.ap)for(const h of await readDir(f.ap)){const fl=await h.getFile();if(!seen.has('a'+h.name)){seen.add('a'+h.name);src.ap.push({name:h.name,buf:await fl.arrayBuffer()})}}
    if(f.dr)for(const h of await readDir(f.dr)){const fl=await h.getFile();if(!seen.has('d'+h.name)){seen.add('d'+h.name);src.dr.push({name:h.name,buf:await fl.arrayBuffer()})}}
    for(const h of f.reg){const fl=await h.getFile();if(!seen.has('r'+h.name)){seen.add('r'+h.name);src.reg.push({name:h.name,buf:await fl.arrayBuffer()})}}}
  if(!src.ap.length&&!src.dr.length){S.msg='В выбранной папке нет «Заявки (согласованные)» и «Заявки (…черновики)». Выберите папку 2027, где лежат реестры и заявки.';render();return}
  await ingest(src)}
$('#pick').onclick=async()=>{try{
  if(!window.showDirectoryPicker){S.msg='Откройте страницу в Chrome или Edge: другие браузеры не умеют читать папки.';render();return}
  if(ROOTS.length&&$('#pick').dataset.again){let ok=true;for(const r of ROOTS)if(await r.requestPermission({mode:'read'})!=='granted')ok=false;if(ok){delete $('#pick').dataset.again;$('#pick').textContent='Добавить папку';$('#reload').hidden=false;await loadAll();return}}
  const h=await showDirectoryPicker({id:'komplektacia',mode:'read'});
  if(!ROOTS.some(x=>x.name===h.name))ROOTS.push(h);try{await idb('readwrite',s=>s.put(ROOTS,'roots'))}catch(e){}
  $('#pick').textContent='Добавить папку';$('#reload').hidden=false;await loadAll()}catch(e){if(e.name!=='AbortError'){S.msg='Ошибка: '+e.message;render()}}};
$('#reload').onclick=async()=>{try{for(const r of ROOTS)if(await r.requestPermission({mode:'read'})!=='granted')return;await loadAll()}catch(e){S.msg='Ошибка: '+e.message;render()}};
(async()=>{try{const r=await idb('readonly',s=>s.get('roots'));if(r&&r.length){ROOTS=r;const b=$('#pick');b.textContent='Разрешить доступ к папке';b.dataset.again='1';$('#reload').hidden=true}}catch(e){}})();
