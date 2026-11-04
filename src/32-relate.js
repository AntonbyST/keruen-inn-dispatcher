/* ---------- сведение: сопоставление, итоги ---------- */
/* заявки отелей 11–12 в старом составе (колонка «1» ×18, «23» ×10) приводятся к новому (MIX): «1» → «1А» и «1Б» с тем же количеством на модуль,
   итог пересчитывается: было 18·q1 + 10·q23, стало 23·q1 + 5·q23 — разница 5·(q1 − q23), у обычных позиций она нулевая.
   В отеле 10 колонка «1А» сводится к «1». Повторный вызов ничего не меняет. */
function normMods(z,h){const H=z.h[h];if(!H)return;
  if(h==='10'){const seen=new Set();for(const m of H.mods)if(m.l==='1А')m.l='1';H.mods=H.mods.filter(m=>seen.has(m.l)?false:(seen.add(m.l),true));
    for(const it of H.items)if(it.q['1А']!=null){it.q['1']=(it.q['1']||0)+it.q['1А'];delete it.q['1А']}return}
  const MX=typeof MIX!=='undefined'&&MIX[h];if(!MX)return;
  const i1=H.mods.findIndex(m=>m.l==='1'),m23=H.mods.find(m=>m.l==='23');
  const old=(i1>=0&&!H.mods.some(m=>m.l==='1А'))||(m23&&m23.k!==MX['23']);if(!old)return;
  if(i1>=0){const m=H.mods[i1];H.mods.splice(i1,1,{c:m.c,l:'1А',k:MX['1А']},{c:m.c,l:'1Б',k:MX['1Б']})}
  if(m23)m23.k=MX['23'];
  for(const it of H.items){const q1=it.q['1']||0,q23=it.q['23']||0;
    if(it.q['1']!=null){it.q['1А']=q1;it.q['1Б']=q1;delete it.q['1']}
    const d=5*(q1-q23);if(d&&Object.keys(it.q).length)it.total=Math.max(0,Math.ceil(it.total+d-1e-9))}
  H.legacy=true}
function relate(){
  for(const z of S.Z)for(const h of HOTELS)normMods(z,h);
  for(const r of S.R){ // кандидаты-заявки по поставщику
    const c=[];for(const z of S.Z){const H=z.h[r.h];if(!H)continue;
      if(H.lots.some(l=>l.skey&&r.skey&&(l.skey===r.skey||(Math.min(l.skey.length,r.skey.length)>=5&&(l.skey.includes(r.skey)||r.skey.includes(l.skey))))))c.push(z.n)}
    r.cand=[...new Set(c)];{const ap=r.cand.filter(n=>{const z=S.Z.find(x=>x.n===n);return z&&z.st==='appr'});if(ap.length)r.cand=ap}const o=OV[r.h+'|'+r.skey];const za=String(r.art||'').startsWith('z:')?r.art.slice(2):null;r.zs=o&&o.length?o:za&&S.Z.some(x=>x.n===za&&x.h[r.h])?[za]:r.cand;r.manual=!!(o&&o.length)}
  // ETA: по первому платежу счёта
  const first={},fact={};for(const r of S.R){const k=r.h+'|'+r.skey+'|'+r.doc;if(r.wk&&(!first[k]||r.wk<first[k]))first[k]=r.wk;if(r.paidWk&&(!fact[k]||r.paidWk<fact[k]))fact[k]=r.paidWk}
  for(const r of S.R){const k=r.h+'|'+r.skey+'|'+r.doc,f=fact[k]||first[k];r.etaFact=!!fact[k];r.eta=(f&&r.td!=null)?isoD(new Date(new Date(f+'T00:00:00Z').getTime()+r.td*DAY)):null}
  // позиции Ведомости
  S.C={};for(const h of HOTELS){const M=new Map();const labels=[];
    for(const z of S.Z){const H=z.h[h];if(!H)continue;for(const m of H.mods)if(!labels.some(x=>x.l===m.l))labels.push({l:m.l,k:m.k});
      for(const it of H.items){const key=it.code||('N:'+it.name.toLowerCase().replace(/\s+/g,' ').slice(0,80));let e=M.get(key);if(!e){e={key,code:it.code,name:it.name,unit:it.unit,rows:[]};M.set(key,e)}
        e.rows.push({z:z.n,st:z.st,sup:it.sup,lot:it.lot||(it.lotc[0]||''),total:it.total,zap:it.zap,q:it.q,need:H.need,order:H.order})}}
    for(const e of M.values()){e.st=e.rows.some(r=>r.st==='appr')?'appr':'draft';const use=e.rows.filter(r=>r.st===e.st);
      e.total=use.reduce((a,r)=>a+r.total,0);e.zap=use.reduce((a,r)=>a+r.zap,0);e.q={};for(const r of use)for(const k in r.q)e.q[k]=(e.q[k]||0)+r.q[k]}
    S.C[h]={list:[...M.values()],labels,map:M,legacy:S.Z.filter(z=>z.h[h]&&z.h[h].legacy).map(z=>z.n)}}
}
const payOf=(rows)=>{const n=rows.length,ok=rows.filter(r=>r.ok).length;return{n,ok}};
function payTag(p){if(!p.n)return '<span class="tag t-gray">нет счёта</span>';if(!p.ok)return `<span class="tag t-wait">ждёт галочки · ${p.n}</span>`;if(p.ok<p.n)return `<span class="tag t-wait">${p.ok} из ${p.n} согласовано</span>`;return `<span class="tag t-ok">согласовано · ${p.n}</span>`}
function itPay(h,e){const r=e.rows.find(x=>x.st===e.st);if(e.st!=='appr')return {k:'no',n:0};const p=payOf(regFor(h,r.z,skey(r.sup)));return {k:!p.n?'none':p.ok===p.n?'ok':'wait',n:p.n,ok:p.ok}}
const payShort=p=>p.k==='no'?'<span class="mut">—</span>':p.k==='none'?'<span class="tag t-gray">нет счёта</span>':p.k==='ok'?'<span class="tag t-ok">согласовано</span>':'<span class="tag t-wait">ждёт галочки</span>';
const regFor=(h,zn,sk)=>S.R.filter(r=>r.h===h&&r.zs.includes(zn)&&(!sk||r.skey===sk||(Math.min(r.skey.length,sk.length)>=5&&(r.skey.includes(sk)||sk.includes(r.skey)))));
function reqs(h){return S.Z.filter(z=>z.h[h]&&z.h[h].items.length+z.h[h].lots.length>0)}
function zsum(z,h){const H=z.h[h];const rows=S.R.filter(r=>r.h===h&&r.zs.includes(z.n));return payOf(rows)}
