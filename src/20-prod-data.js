/* ---------- производство: данные из встроенной страницы ---------- */
let PROD_HTML='';let PD=null;
try{const b=atob($('#prodb64').textContent.trim());const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);PROD_HTML=new TextDecoder().decode(u);
 const m=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(PROD_HTML);if(m)PD=JSON.parse(m[1])}catch(e){}
/* состав модулей с 02.11.2026 (решение Заказчика): в отелях 11 и 12 вместо 18×«1» и 10×«23» — 1А ×8, 1Б ×15, 23 ×5; отель 10 не меняется.
   Состав покупных позиций 1А и 1Б пока берётся от типа 1 (меняются только кровати и текстиль — уточнить по заявкам З-13, З-14). */
const MIX={'11':{'1А':8,'1Б':15,'23':5},'12':{'1А':8,'1Б':15,'23':5}};
function fixPD(){try{if(PD){const m1=PD.mods.find(m=>m.id==='М1');
  if(m1)for(const [id,lab] of [['М1А','1А'],['М1Б','1Б']])if(!PD.mods.some(m=>m.id===id)){const c=JSON.parse(JSON.stringify(m1));c.id=id;c.label=lab;PD.mods.push(c)}
  for(const h of ['11','12']){const o=PD.hotels[h];if(!o)continue;if(o['М1']!=null){o['М1А']=MIX[h]['1А'];o['М1Б']=MIX[h]['1Б'];delete o['М1']}if(o['М23']!=null)o['М23']=MIX[h]['23']}}}catch(e){}}
fixPD();
