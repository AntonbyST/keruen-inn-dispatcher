<script>try{if(localStorage.getItem('ktheme')==='light')document.documentElement.setAttribute('data-theme','light')}catch(e){}</script>
<script>
'use strict';
const APP_VER='v0.0.18 · 04.11.2026';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>(n==null||isNaN(n))?'—':Number(n).toLocaleString('ru-RU',{maximumFractionDigits:2});
const TODAY=(()=>{const d=window.__TODAY?new Date(window.__TODAY):new Date();return new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()))})();
const DAY=864e5;
const dts=iso=>iso?iso.slice(8,10)+'.'+iso.slice(5,7):'—';
const dd=iso=>iso?Math.round((new Date(iso+'T00:00:00Z')-TODAY)/DAY):null;
const isoD=d=>d.toISOString().slice(0,10);
const sname=n=>n.replace(/^З-/,'З-');
/* ---------- состояние ---------- */
const S={hotel:'11',hs:['11'],sec:'buy',tab:{buy:'z',ved:'v',prod:'m'},fz:'all',fr:'wait',vmod:'',vf:'all',vq:'',Z:[],R:[],src:{ap:[],dr:[],reg:[]},at:null,msg:'',open:{},zopen:{},popen:{},vopen:{},drawer:null,vlimit:400};
const SNAP=/*SNAP*/null;
let OV={};try{OV=JSON.parse(localStorage.getItem('kom_ov')||'{}')}catch(e){}
const saveOV=()=>{try{localStorage.setItem('kom_ov',JSON.stringify(OV))}catch(e){}};
const HOTELS=['11','10','12'];
