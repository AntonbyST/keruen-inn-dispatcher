/* ---------- загрузка ---------- */
async function ingest(src){
  S.src=src;S.Z=[];S.R=[];const errs=[];
  for(const [k,kind] of [['ap','appr'],['dr','draft']])for(const f of src[k]){try{const z=await parseFull(f.buf,f.name,kind);if(z)S.Z.push(z)}catch(e){errs.push(f.name+': '+e.message)}}
  for(const f of src.reg){try{S.R.push(...await parseReg(f.buf,f.name))}catch(e){errs.push(f.name+': '+e.message)}}
  S.Z.sort((a,b)=>a.n.localeCompare(b.n));
  relate();S.at=new Date();S.snap=null;S.local=true;S.msg=errs.length?('Не прочитано: '+errs.join('; ')):'';
  if(!S.vmod)S.vmod='';
  pushLive();render()}
window.__ingest=async o=>{const dec=x=>Uint8Array.from(atob(x),c=>c.charCodeAt(0)).buffer;
  await ingest({ap:o.ap.map(f=>({name:f.name,buf:dec(f.b64)})),dr:o.dr.map(f=>({name:f.name,buf:dec(f.b64)})),reg:o.reg.map(f=>({name:f.name,buf:dec(f.b64)}))})};
