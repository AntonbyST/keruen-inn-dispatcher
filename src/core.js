/* ---- чтение xlsx без библиотек: zip (DecompressionStream) + разбор XML регулярками ---- */
const dec=s=>s.replace(/&#x([0-9a-f]+);/gi,(_,h)=>String.fromCodePoint(parseInt(h,16))).replace(/&#(\d+);/g,(_,d)=>String.fromCodePoint(+d)).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
async function inflate(u8){const ds=new DecompressionStream('deflate-raw');const w=ds.writable.getWriter();w.write(u8);w.close();return new Uint8Array(await new Response(ds.readable).arrayBuffer())}
async function unzip(buf){
  const u=new Uint8Array(buf),dv=new DataView(u.buffer,u.byteOffset,u.byteLength);let e=u.length-22;
  while(e>=0&&dv.getUint32(e,true)!==0x06054b50)e--; if(e<0)throw new Error('не zip');
  const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const files={};
  for(let i=0;i<n;i++){const meth=dv.getUint16(p+10,true),csz=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),el=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),off=dv.getUint32(p+42,true);
    const name=new TextDecoder().decode(u.subarray(p+46,p+46+nl));const lnl=dv.getUint16(off+26,true),lel=dv.getUint16(off+28,true);const st=off+30+lnl+lel;
    files[name]={meth,data:u.subarray(st,st+csz)};p+=46+nl+el+cl}
  const out={};const get=async nm=>{const f=files[nm];if(!f)return null;const d=f.meth===0?f.data:await inflate(f.data);return new TextDecoder().decode(d)};
  return{names:Object.keys(files),get}}
const colN=s=>{let n=0;for(const ch of s)n=n*26+ch.charCodeAt(0)-64;return n};
async function readXlsx(buf){
  const z=await unzip(buf);
  const wbx=await z.get('xl/workbook.xml'),rel=await z.get('xl/_rels/workbook.xml.rels');
  const ssx=await z.get('xl/sharedStrings.xml');const ss=[];
  if(ssx)for(const m of ssx.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)){let t='';for(const x of m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g))t+=x[1];ss.push(dec(t))}
  const rels={};for(const m of rel.matchAll(/<Relationship\b([^>]*)>/g)){const id=/Id="([^"]*)"/.exec(m[1]),tg=/Target="([^"]*)"/.exec(m[1]);if(id&&tg)rels[id[1]]=tg[1]}
  const sheets={};
  for(const m of wbx.matchAll(/<sheet\b([^>]*)>/g)){const nm=/name="([^"]*)"/.exec(m[1]),rid=/r:id="([^"]*)"/.exec(m[1]);if(!nm||!rid)continue;
    let tg=rels[rid[1]];tg=tg.startsWith('/')?tg.slice(1):'xl/'+tg;const x=await z.get(tg);if(!x)continue;
    const cells={};let maxr=0;
    for(const c of x.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){const at=c[1],body=c[2]||'';
      const r=/\br="([A-Z]+)(\d+)"/.exec(at);if(!r)continue;const t=(/\bt="([^"]*)"/.exec(at)||[])[1];
      const f=/<f\b[^>]*>([\s\S]*?)<\/f>/.exec(body);const vv=/<v>([\s\S]*?)<\/v>/.exec(body);let v;
      if(t==='inlineStr'){let s='';for(const q of body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g))s+=q[1];v=dec(s)}
      else if(vv&&vv[1]!==''){v=t==='s'?ss[+vv[1]]:t==='str'||t==='e'?dec(vv[1]):t==='b'?vv[1]==='1':+vv[1]}
      const key=colN(r[1])+','+r[2];if(v===undefined&&!f)continue;cells[key]={v,f:f?dec(f[1]):undefined};maxr=Math.max(maxr,+r[2])}
    sheets[dec(nm[1])]={cells,maxr}}
  return sheets}
/* ---- мини-вычислитель формул (запас/«Всего»), если в файле нет сохранённых значений ---- */
function makeEval(sh){
  const memo={};
  const cellV=(c,r)=>{const k=c+','+r;if(k in memo)return memo[k];const x=sh.cells[k];let v=0;
    if(x){if(x.v!==undefined)v=x.v;else if(x.f){memo[k]=0;try{v=evalF(x.f)}catch(e){v=0}}}
    memo[k]=v;return v};
  const rd=(a,b)=>{const A=/^\$?([A-Z]+)\$?(\d+)$/.exec(a),B=/^\$?([A-Z]+)\$?(\d+)$/.exec(b);const out=[];
    for(let r=+A[2];r<=+B[2];r++)for(let c=colN(A[1]);c<=colN(B[1]);c++)out.push(cellV(c,r));return out};
  const rnd=(x,d,up)=>{const m=Math.pow(10,d);const y=Math.abs(x)*m;const e=up?Math.ceil(y-1e-9):Math.round(y+1e-9);return Math.sign(x)*e/m};
  function evalF(src){
    const T=[];for(const m of src.matchAll(/\s*(\$?[A-Z]{1,3}\$?\d+:\$?[A-Z]{1,3}\$?\d+|\$?[A-Z]{1,3}\$?\d+|[A-Z]+(?=\()|\d+(?:\.\d+)?|[-+*/(),])/g))T.push(m[1]);
    let i=0;const num=v=>Array.isArray(v)?v.reduce((a,b)=>a+(+b||0),0):(+v||0);
    function ex(){let a=term();while(T[i]==='+'||T[i]==='-'){const o=T[i++];const b=term();a=o==='+'?num(a)+num(b):num(a)-num(b)}return a}
    function term(){let a=fac();while(T[i]==='*'||T[i]==='/'){const o=T[i++];const b=fac();a=o==='*'?num(a)*num(b):num(a)/num(b)}return a}
    function fac(){const t=T[i++];if(t==='-')return -num(fac());if(t==='+')return fac();if(t==='('){const v=ex();i++;return v}
      if(/^\d/.test(t))return +t;
      if(/^[A-Z]+$/.test(t)&&T[i]==='('){i++;const args=[];if(T[i]!==')'){for(;;){args.push(ex());if(T[i]===',')i++;else break}}i++;
        if(t==='ROUND')return rnd(num(args[0]),num(args[1]),false);if(t==='ROUNDUP')return rnd(num(args[0]),num(args[1]),true);
        if(t==='SUM')return args.reduce((a,b)=>a+num(b),0);
        if(t==='SUMPRODUCT'){const A=args[0],B=args[1];let s=0;for(let k=0;k<A.length;k++)s+=(+A[k]||0)*(+B[k]||0);return s}
        throw new Error('func '+t)}
      if(t.includes(':')){const[a,b]=t.split(':');return rd(a,b)}
      const m=/^\$?([A-Z]+)\$?(\d+)$/.exec(t);return cellV(colN(m[1]),+m[2])}
    return ex()}
  return cellV}
