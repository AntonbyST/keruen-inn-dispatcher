/* ---------- разбор реестра платежей ---------- */
const MONTH=/^(янв|фев|мар|апр|май|июн|июл|авг|сен|окт|ноя|дек)\s*(\d\d)$/i;
function weekMonday(y,w){const j4=new Date(Date.UTC(y,0,4));const dow=(j4.getUTCDay()+6)%7;const m1=new Date(j4.getTime()-dow*DAY);return new Date(m1.getTime()+(w-1)*7*DAY)}
async function parseReg(buf,file){
  const mh=/Мотел[ьяи]\s*(?:№\s*)?(\d+)/i.exec(file);const h=mh?mh[1]:'?';
  const SH=await readXlsx(buf);const out=[];
  for(const [sn,sh] of Object.entries(SH)){const mo=MONTH.exec(sn.trim());if(!mo)continue;const yr=2000+ +mo[2];
    const V=sh.cells,g=(c,r)=>{const x=V[c+','+r];return x?x.v:undefined};
    for(let r=3;r<=sh.maxr;r++){const sup=g(2,r);if(!sup||typeof sup!=='string')continue;const doc=g(3,r);const amt=g(5,r);if(doc===undefined||String(doc).trim()==='')continue;
      const week=+g(8,r)||null;const term=String(g(14,r)||'');let td=null;let m;
      if(m=/(\d+)\s*(?:дн|дней|день|дня)/i.exec(term))td=+m[1];else if(m=/(\d+)\s*нед/i.exec(term))td=+m[1]*7;
      const wm=week?weekMonday(yr,week):null;
      out.push({h,sheet:sn.trim(),row:r,sup:sup.trim(),skey:skey(sup),doc:String(doc||'').trim(),cur:String(g(4,r)||''),amt:+amt||0,kzt:+g(10,r)||null,desc:String(g(7,r)||'').replace(/\s+/g,' '),
        week,wk:wm?isoD(wm):null,art:String(g(11,r)||''),ok:/[✅✔✓]/.test(String(g(13,r)||'')),term,td,resp:String(g(15,r)||''),note:String(g(16,r)||'')})}}
  return out}
