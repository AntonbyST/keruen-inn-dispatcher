/* ---------- ПРОИЗВОДСТВО ---------- */
let blobUrl=null;
function prodMap(){const m={};
  for(const h of HOTELS){const C=S.C&&S.C[h];if(!C)continue;for(const e of C.list){if(!e.code)continue;const r=e.rows.find(x=>x.st===e.st);const cur=m[e.code];
    if(!cur||(cur.src==='черн'&&e.st==='appr'))m[e.code]={src:e.st==='appr'?'согл':'черн',z:r.z,lot:r.lot}}}
  return m}
function pushLive(){const f=$('#pf');if(!f||!f.contentWindow||!S.at)return;f.contentWindow.postMessage({type:'live',map:prodMap(),at:S.at.toLocaleString('ru-RU')},'*')}
window.addEventListener('message',e=>{if(e.data&&e.data.type==='ready')pushLive()});
const INJ=`<script>addEventListener('message',function(e){var d=e.data;if(!d||d.type!=='live')return;for(var dec in DRW){var sp=DRW[dec].spec;for(var i=0;i<sp.length;i++){var r=sp[i][4];if(r&&r.code&&d.map[r.code]){var m=d.map[r.code];r.src=m.src;r.z=m.z;if(m.lot)r.lot=m.lot}}}if(typeof META==='object')META.live=d.at;render();if(dsel)drawDrw();var n=document.getElementById('livenote');if(!n){n=document.createElement('div');n.id='livenote';n.className='note';n.style.margin='8px auto';n.style.maxWidth='1180px';n.style.padding='0 16px';var w=document.querySelector('.wrap');if(w)w.parentNode.insertBefore(n,w)}n.textContent='Статусы закупки обновлены из папок заявок: '+d.at+'.'});parent.postMessage({type:'ready'},'*');<\/script>`;
function prodView(){
  if(!PROD_HTML)return '<div class="empty">Состав модулей не встроен</div>';
  if(!blobUrl)blobUrl=URL.createObjectURL(new Blob([PROD_HTML+INJ],{type:'text/html;charset=utf-8'}));
  return `<div id="prodwrap"><iframe id="pf" src="${blobUrl}" title="Состав модулей" onload="pushLive()"></iframe></div>`}
/* ---------- главный рендер ---------- */
