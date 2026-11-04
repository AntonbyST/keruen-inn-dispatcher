/* переключатель темы: тёмная по умолчанию, выбор запоминается в браузере */
function themeCur(){return document.documentElement.getAttribute('data-theme')==='light'?'light':'dark'}
function themePaint(){const b=document.getElementById('thm');if(b){b.setAttribute('aria-pressed',themeCur()==='light');b.dataset.t=themeCur()}}
function themeSet(t){if(t==='light')document.documentElement.setAttribute('data-theme','light');else document.documentElement.removeAttribute('data-theme');try{localStorage.setItem('ktheme',t)}catch(e){}themePaint()}
document.addEventListener('click',e=>{if(e.target.closest('#thm'))themeSet(themeCur()==='light'?'dark':'light')});
themePaint();
