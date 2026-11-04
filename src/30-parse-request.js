/* ---------- разбор заявки ---------- */
const skey=s=>String(s||'').toLowerCase().replace(/[«»"“”'`]/g,'').replace(/\b(ооо|тоо|ип|чп|ао|оао|зао|одо|сооо|тд|торговый дом|частное предприятие)\b/g,'').replace(/[^a-zа-яё0-9]/g,'');
const isoDate=s=>{const[d,m,y]=s.split('.');return y+'-'+m+'-'+d};
async function parseFull(buf,file,kind){
  const SH=await readXlsx(buf);const base=file.replace(/\.xlsx$/i,'');
  const mm=/^\s*[ЗZ3]-?\s*(\d{2})(?:-(\d))?/.exec(base);if(!mm)return null;
  const n='З-'+mm[1]+(mm[2]?'-'+mm[2]:'');
  const sb=/\(([^()]+)\)\s*$/.exec(base);let who=sb?sb[1].trim():'';if(!/^[А-ЯЁA-Z][а-яёa-z-]+(?:\s[А-ЯЁA-Z]\.?)?$/.test(who))who='';
  const topic=base.replace(/^\s*[ЗZ3]-?\s*\d{2}(?:-\d)?\s*/,'').replace(/\s*\([^()]*\)\s*$/,'').trim();
  const z={n,sec:n.slice(0,4),t:topic,st:kind,file,who,h:{}};
  for(const h of HOTELS){
    const sh=SH['Отель '+h];if(!sh){z.h[h]=null;continue}
    const V=sh.cells,cv=makeEval(sh);const g=(c,r)=>{const x=V[c+','+r];return x?x.v:undefined};
    let hr=0;for(let r=1;r<=15;r++)if(g(1,r)==='Компонент'){hr=r;break}if(!hr){z.h[h]=null;continue}
    const t3=String(g(2,3)||'');const mo=/Заказать до:\s*([\d.]+)/.exec(t3),mn=/Нужно на объекте:\s*([\d.]+)/.exec(t3);
    let lc=0;for(let c=8;c<=80;c++)if(g(c,hr)==='Шифр лота'){lc=c;break}
    const mods=[];for(let c=8;c<(lc||40);c++){const l=g(c,hr);if(l===undefined||l===''||l==='Статья бюджета'||l==='Примечание')break;mods.push({c,l:String(l),k:+g(c,hr-1)||0})}
    const md=/Дата:\s*(\d{2}\.\d{2}\.\d{4})/.exec(t3);let filed=md?isoDate(md[1]):null,fsrc=md?'дата заявки':'';
    for(let r=hr+1;r<=sh.maxr;r++){const a2=String(g(2,r)||'');if(/^(Подал|Принял)/.test(a2)){let tx=a2;for(let c=3;c<=8;c++)tx+=' '+String(g(c,r)||'');const m2=/Дата:\s*(\d{2}\.\d{2}\.\d{4})/.exec(tx);if(m2){const iso=isoDate(m2[1]);if(/^Принял/.test(a2)||!fsrc||fsrc==='дата заявки'){if(/^Принял/.test(a2)||fsrc!=='принял'){filed=iso;fsrc=/^Принял/.test(a2)?'принято снабжением':'подана технологом'}}}}}
    const H={order:mo?isoDate(mo[1]):null,need:mn?isoDate(mn[1]):null,filed,fsrc,mods,lots:[],items:[]};
    let cur=null;
    for(let r=hr+1;r<=sh.maxr;r++){
      const a=g(1,r),b=g(2,r),F=V['6,'+r];
      if(a&&(b===undefined||b==='')){const t=String(a);const codes=[...t.matchAll(/[МП]\d*-([LR]\d{3})/g)].map(m=>m[1]);
        if(codes.length||/нет в прежних/.test(t)){const parts=t.split('·').map(x=>x.trim()).filter(x=>x&&!/^[МП]\d*-[LR]\d{3}$/.test(x)&&!/^прежн/.test(x)&&!/^нет в/.test(x)&&!/^позиций/.test(x));
          cur={codes,sup:parts[0]||'',skey:skey(parts[0]||''),n:0,ix:[]};H.lots.push(cur)}continue}
      if(b!==undefined&&b!==''&&F&&(F.v!==undefined||F.f)&&a!=='Компонент'&&!/^(Подал|Принял|Позиций)/.test(String(b))){
        const q={};for(const m of mods){const v=+cv(m.c,r);if(v)q[m.l]=v}
        const sup=cur&&cur.sup?cur.sup:String(g(4,r)||'').split('\n')[0];
        const lot=lc?(/[LR]\d{3}/.exec(String(g(lc,r)||''))||[''])[0]:'';
        const code=a?String(a).trim():'';
        H.items.push({code,name:String(b),unit:g(5,r)||'',total:+cv(6,r)||0,zap:+cv(7,r)||0,q,sup,lot,lotc:cur?cur.codes:[]});
        if(cur){cur.n++;cur.ix.push(H.items.length-1)}}}
    z.h[h]=H}
  return z}
