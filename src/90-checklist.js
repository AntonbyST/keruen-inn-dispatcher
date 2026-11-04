/* ---------- ЧЕК-ЛИСТ МОДУЛЯ ---------- */
let CK={};try{CK=JSON.parse(localStorage.getItem('kom_ck')||'{}')}catch(e){}
let CKUSER='';try{CKUSER=localStorage.getItem('kom_user')||''}catch(e){}
const CKFILE='Чек-листы Keruen Inn.json';S.cgc={};
const ckSave=()=>{try{localStorage.setItem('kom_ck',JSON.stringify(CK))}catch(e){}};
function ckMerge(o){let ch=false;for(const k in o){if(!CK[k]||(o[k].t||0)>(CK[k].t||0)){CK[k]=o[k];ch=true}}return ch}
async function ckFileSync(ask){const r=ROOTS&&ROOTS[0];if(!r||!r.queryPermission)return;
  try{let pm=await r.queryPermission({mode:'readwrite'});if(pm!=='granted'&&ask&&!S.ckAsked){S.ckAsked=true;pm=await r.requestPermission({mode:'readwrite'})}
    if(pm!=='granted'){S.ckSync='только этот браузер';return}
    let ex={};try{const fh=await r.getFileHandle(CKFILE);ex=JSON.parse(await (await fh.getFile()).text())}catch(e){}
    ckMerge(ex);ckSave();const fh=await r.getFileHandle(CKFILE,{create:true});const w=await fh.createWritable();await w.write(JSON.stringify(CK));await w.close();S.ckSync='общий файл в папке «'+r.name+'»'}
  catch(e){S.ckSync='только этот браузер'}}
const ckKey=(h,m,x,c)=>h+'|'+m+'|'+(x.code||x.name)+'|'+c;
const ckStamp=()=>{const d=new Date();return d.toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})};
function chkData(){const h=S.hotel,m=S.vmod,C=S.C&&S.C[h];if(!C||m==='')return null;
  const g={};if(PD)for(const pm of PD.mods)for(const [grp,its] of pm.pur){const a=grp.split(' · ').map(x=>x.trim().toLowerCase().replace(/\s+/g,' '));for(const it of its)if(!g[it[0]])g[it[0]]=[a[0],a.slice(1).join(' · ')]}
  const S2=new Map();
  for(const e of C.list){const q=e.q[m];if(!q)continue;const zr=e.rows&&e.rows[0],zz=zr&&S.Z.find(z=>z.n===zr.z),gg=(e.code&&g[e.code])||[((zz&&zz.t)||'прочее').trim().toLowerCase().replace(/\s+/g,' '),''];const sec=gg[0];if(!S2.has(sec))S2.set(sec,new Map());const sm=S2.get(sec);if(!sm.has(gg[1]))sm.set(gg[1],[]);sm.get(gg[1]).push({code:e.code||'',name:e.name,unit:e.unit||'',q})}
  const rank=s=>s.startsWith('инженерные')?0:s.startsWith('коробка')?1:s.startsWith('отделка')?2:s.startsWith('оборудование')?3:s.startsWith('мебель')?4:s==='упаковка'?5:9;
  const secs=[...S2.entries()].sort((a,b)=>rank(a[0])-rank(b[0])||(a[0]<b[0]?-1:1)).map(([s,sm])=>({s,subs:[...sm.entries()].sort((a,b)=>a[0]<b[0]?-1:1).map(([n,l])=>({n,l:l.sort((a,b)=>a.code.localeCompare(b.code,'ru',{numeric:true}))}))}));
  const all=[];for(const s of secs)for(const u of s.subs)for(const x of u.l)all.push(x);
  return {h,m,secs,all,n:all.length}}
const ckOn=(D,x,c)=>{const e=CK[ckKey(D.h,D.m,x,c)];return e&&e.v===true?e:null};
const ckCnt=(D,l,c)=>l.filter(x=>ckOn(D,x,c)).length;
function chkView(){const D=chkData();if(!D)return '';
  const cell=(x,c)=>{const e=ckOn(D,x,c);return `<td class="cb" data-ck="${c}|${esc(x.code||x.name)}">${e?`<span class="on">☑</span><small>${esc(e.u||'—')}<br>${esc(e.d||'')}</small>`:'☐'}</td>`};
  const prog=(l)=>`<span class="pg">Завод ${ckCnt(D,l,'з')}/${l.length} · СМР ${ckCnt(D,l,'с')}/${l.length}</span>`;
  let rows='';
  for(const s of D.secs){const al=s.subs.flatMap(u=>u.l);const sk=s.s,cl=S.cgc[sk];
    rows+=`<tr class="cs" data-cg="${esc(sk)}"><td colspan="7"><span class="tg">${cl?'▸':'▾'}</span> Раздел: ${esc(s.s)} ${prog(al)}</td></tr>`;
    if(cl)continue;
    for(const u of s.subs){const k2=sk+'|'+u.n,cl2=S.cgc[k2];
      if(u.n)rows+=`<tr class="cu" data-cg="${esc(k2)}"><td colspan="7"><span class="tg">${cl2?'▸':'▾'}</span> ${esc(u.n)} ${prog(u.l)}</td></tr>`;
      if(u.n&&cl2)continue;
      rows+=u.l.map(x=>`<tr><td class="m"><b>${esc(x.code)}</b></td><td>${esc(x.name)}</td><td>${esc(x.unit)}</td><td class="n">${fmt(x.q)}</td>${cell(x,'з')}${cell(x,'с')}<td class="cm"><input data-cm="${esc(x.code||x.name)}" value="${esc((CK[ckKey(D.h,D.m,x,'к')]||{}).v||'')}" aria-label="Комментарий"></td></tr>`).join('')}}
  return `<div class="chkbox"><div class="chkbar"><div><b>Чек-лист · модуль ${esc(D.m)}</b> <span class="mut">отель ${D.h} · ${D.n} позиций · кол-во на 1 модуль</span></div><div><button class="chip" data-pr="1">Печать</button> <button class="chip" data-xl="1">Скачать Excel</button> <button class="chip" data-close="1">Закрыть</button></div></div>
  <div class="chkwho"><label>Кто отмечает: <input id="ckuser" value="${esc(CKUSER)}" placeholder="фамилия или имя" autocomplete="off" title="Подставляется по вашему входу; при необходимости измените вручную"></label><span class="mut">имя подставляется по входу, можно изменить · отметка сохраняет имя и время · хранение: ${esc(S.ckSync||(SB?'общая база Supabase':'только этот браузер'))}</span>${S.sbErr?`<span style="color:var(--no)">ошибка: ${esc(S.sbErr)}</span>`:''}<span class="chkbtns"><button class="chip" data-cgall="1">Свернуть всё</button> <button class="chip" data-cgall="0">Развернуть всё</button></span></div>
  <div class="chktitle">Мотель ${D.h} · модуль ${esc(D.m)}</div>
  <table class="chkt"><thead><tr><th>Компонент</th><th>Номенклатура</th><th>Ед.изм.</th><th>Кол-во</th><th>Завод</th><th>СМР</th><th>Комментарии</th></tr></thead><tbody>${rows||'<tr><td colspan="7">В заявках нет позиций для этого модуля</td></tr>'}</tbody></table></div>`}
const crcT=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function ckToggle(v){if(!canWrite()){S.msg='Нет прав на отметки: у вас роль «просмотр».';render();return}const D=chkData();if(!D)return;const [c,code]=v.split('|');const x=D.all.find(y=>(y.code||y.name)===code);if(!x)return;
  const u=(document.getElementById('ckuser')||{}).value||CKUSER;if(!u.trim()){const i=document.getElementById('ckuser');if(i){i.focus();i.classList.add('need')}return}
  CKUSER=u.trim();try{localStorage.setItem('kom_user',CKUSER)}catch(e){}
  const k=ckKey(D.h,D.m,x,c),on=!ckOn(D,x,c);CK[k]={v:on,u:CKUSER,d:ckStamp(),t:Date.now()};ckSave();render();(SB?sbPush([k]):ckFileSync(true)).then(render)}
document.addEventListener('change',e=>{const i=e.target;if(i.id==='ckuser'){CKUSER=i.value.trim();try{localStorage.setItem('kom_user',CKUSER)}catch(_){}i.classList.remove('need')}
  else if(i.dataset&&i.dataset.cm!==undefined){const D=chkData();if(!D)return;const x=D.all.find(y=>(y.code||y.name)===i.dataset.cm);if(!x)return;{const kk=ckKey(D.h,D.m,x,'к');CK[kk]={v:i.value,u:CKUSER,d:ckStamp(),t:Date.now()};ckSave();SB?sbPush([kk]).then(render):ckFileSync(true)}}});
function crc32(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=crcT[(c^b[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0}
function zipStore(files){const te=new TextEncoder(),parts=[],cd=[];let off=0;
  const u16=v=>[v&255,v>>8&255],u32=v=>[v&255,v>>8&255,v>>16&255,v>>>24&255];
  for(const [n,s] of files){const nb=te.encode(n),d=te.encode(s),c=crc32(d);
    const lh=new Uint8Array([0x50,0x4b,3,4,20,0,0,8,0,0,0,0,0,0,...u32(c),...u32(d.length),...u32(d.length),...u16(nb.length),0,0,...nb]);
    parts.push(lh,d);
    cd.push(new Uint8Array([0x50,0x4b,1,2,20,0,20,0,0,8,0,0,0,0,0,0,...u32(c),...u32(d.length),...u32(d.length),...u16(nb.length),0,0,0,0,0,0,0,0,0,0,0,0,...u32(off),...nb]));
    off+=lh.length+d.length}
  const cds=cd.reduce((s,x)=>s+x.length,0);
  const end=new Uint8Array([0x50,0x4b,5,6,0,0,0,0,...u16(files.length),...u16(files.length),...u32(cds),...u32(off),0,0]);
  return new Blob([...parts,...cd,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}
function chkXlsx(){const D=chkData();if(!D)return;
  const X=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
  const cell=(r,c,v,s,num)=>{const ref='ABCDEFG'[c]+r;return num?`<c r="${ref}" s="${s}"><v>${v}</v></c>`:`<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${X(v)}</t></is></c>`};
  let rows='',r=1;
  rows+=`<row r="1" ht="24" customHeight="1">${['Компонент','Номенклатура','Ед.изм.','Кол-во','Завод','СМР','Комментарии'].map((v,i)=>cell(1,i,v,1)).join('')}</row>`;
  const ck=(x,c)=>{const e=ckOn(D,x,c);return e?'☑ '+(e.u||'')+' '+(e.d||''):'☐'};
  for(const s of D.secs){r++;rows+=`<row r="${r}">${cell(r,0,'Раздел: '+s.s,2)}${[1,2,3,4,5,6].map(i=>cell(r,i,'',3)).join('')}</row>`;
    for(const u of s.subs){let lv=1;if(u.n){r++;lv=2;rows+=`<row r="${r}" outlineLevel="1">${cell(r,0,u.n,8)}${[1,2,3,4,5,6].map(i=>cell(r,i,'',8)).join('')}</row>`}
      for(const x of u.l){r++;rows+=`<row r="${r}" outlineLevel="${lv}">${cell(r,0,x.code,4)}${cell(r,1,x.name,5)}${cell(r,2,x.unit,5)}${cell(r,3,x.q,6,true)}${cell(r,4,ck(x,'з'),9)}${cell(r,5,ck(x,'с'),9)}${cell(r,6,(CK[ckKey(D.h,D.m,x,'к')]||{}).v||'',5)}</row>`}}}
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15" outlineLevelRow="2"/><cols><col min="1" max="1" width="16" customWidth="1"/><col min="2" max="2" width="72" customWidth="1"/><col min="3" max="3" width="9" customWidth="1"/><col min="4" max="4" width="9" customWidth="1"/><col min="5" max="6" width="22" customWidth="1"/><col min="7" max="7" width="40" customWidth="1"/></cols><sheetData>${rows}</sheetData><pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToHeight="0"/></worksheet>`.replace('<sheetViews>','<sheetPr><outlinePr summaryBelow="0"/><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews>');
  const bd='<border><left style="thin"><color rgb="FFD0D5D2"/></left><right style="thin"><color rgb="FFD0D5D2"/></right><top style="thin"><color rgb="FFD0D5D2"/></top><bottom style="thin"><color rgb="FFD0D5D2"/></bottom><diagonal/></border>';
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="10"/><name val="Roboto"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Roboto"/></font><font><b/><sz val="10"/><name val="Roboto"/></font><font><sz val="13"/><name val="Roboto"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2E6B4F"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9E1F2"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEDF1FA"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>${bd}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="10"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf><xf fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf fontId="2" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1"/><xf fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/><xf fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf><xf fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment horizontal="left" vertical="center"/></xf><xf fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf><xf fontId="2" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf></cellXfs></styleSheet>`;
  const nm=('Модуль '+D.m).replace(/[\\\/?*\[\]:]/g,'_').slice(0,31);
  const files=[['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
   ['_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
   ['xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${X(nm)}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
   ['xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
   ['xl/styles.xml',styles],['xl/worksheets/sheet1.xml',sheet]];
  const url=URL.createObjectURL(zipStore(files));const a=document.createElement('a');a.href=url;a.download=`Чек-лист Мотель ${D.h} модуль ${D.m}.xlsx`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000)}
