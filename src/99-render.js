function render(){
  srvHeader();
  if(SRV.on&&!AUTH){const m=$('#main');m.hidden=false;m.innerHTML=loginView();$('#prodhost').hidden=true;$('#dr').hidden=true;{const c=$('#chk');if(c)c.hidden=true}return}
  {const c=document.getElementById('chk');if(c){if(S.chk&&S.sec==='ved'&&S.vmod!==''){c.innerHTML=chkView();c.hidden=false;document.body.classList.add('chkon')}else{c.hidden=true;document.body.classList.remove('chkon')}}}
  if(SRV.on&&S.sec!=='team'&&!canSec(S.sec)){const f=SECS.map(x=>x[0]).find(canSec);if(f)S.sec=f;else if(isAdmin())S.sec='team'}
  shell();
  const m=$('#main');
  const ph=$('#prodhost');
  if(S.sec==='team'&&isAdmin()){ph.hidden=true;m.hidden=false;m.innerHTML=teamView();$('#dr').hidden=true;return}
  if(S.sec==='docs'){ph.hidden=true;m.hidden=false;m.innerHTML=docsView();$('#dr').hidden=true;return}
  if(S.sec==='prod'){if(S.tab.prod==='e'){ph.hidden=true;m.hidden=false;m.innerHTML=`<div class="page">${stagesView()}</div>`;$('#dr').hidden=true;return}
    if(!ph.firstChild)ph.innerHTML=prodView();ph.hidden=false;m.hidden=true;$('#dr').hidden=true;return}
  ph.hidden=true;m.hidden=false;
  if(SRV.on&&!SECS.some(x=>canSec(x[0]))&&!isAdmin()){m.innerHTML='<div class="hello"><div class="card" style="padding:28px"><h2 style="margin-top:0">Разделы не назначены</h2><p>Попросите администратора открыть вам доступ к нужным разделам.</p></div></div>';$('#dr').hidden=true;return}
  if(S.sec==='buy')payMerge();
  const payTab=SRV.on&&S.sec==='buy'&&(S.tab.buy==='r'||S.tab.buy==='b');
  if(!S.at&&!(payTab&&PAY.on)){m.innerHTML=hello();$('#dr').hidden=true;return}
  const h=S.hotel=S.hs[0];let html='';
  if(S.sec==='buy'){const hs=S.hs;html=hotelBar()+(payTab?'':buyKpi(hs))+(S.tab.buy==='z'?(hs.length>1?tabZm(hs):tabZ(hs[0]))+hs.map(tabP).join(''):S.tab.buy==='n'?tabN(hs):S.tab.buy==='r'?(SRV.on?payView():hs.map(tabR).join('')):S.tab.buy==='b'?payBudget(hs):S.tab.buy==='o'?tabO(hs):hs.map(tabP).join(''))}
  else html=hotelBar()+(S.tab.ved==='v'?tabV(h):tabM(h));
  html+=S.msg?`<p class="note red">${esc(S.msg)}</p>`:'';
  m.innerHTML=`<div class="page">${html}</div>`;
  const d=$('#dr');if(S.drawer&&S.sec==='ved'){d.innerHTML=drawer();d.hidden=false}else if(S.lotd&&S.sec!=='ved'){d.innerHTML=lotDrawer();d.hidden=!d.innerHTML;fitTags(d)}else d.hidden=true}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(S.drawer||S.lotd||S.chk)){S.drawer=null;S.lotd=null;S.chk=false;render()}});
if(!SRV.on&&SNAP){S.Z=SNAP.Z;S.R=SNAP.R;S.at=new Date(SNAP.at);S.snap=SNAP.note;relate();pushLive()}
if(SRV.on)srvBoot();else render();
</script>
</body>
</html>
