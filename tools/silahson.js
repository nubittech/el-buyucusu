/* Silah düzeltmesinin GERÇEK muhur.js üzerinde son doğrulaması. */
const rl=console.log; console.log=()=>{};
const H=require('./handtest.js'); console.log=rl;
const {finger}=H; require('../muhur.js'); const M=globalThis.MUHUR;
const D2R=Math.PI/180, TUCK=[-0.20,0.80,0.10], GUN_HI=[-0.85,1.12,0.16], FULL=[-0.92,0.90,0.18];
function poz3(o){const c={i:0,m:0,r:0,p:0};
 for(const f of(o.touch||[]))c[f]=0.42; for(const f of(o.folded||[]))c[f]=0.92;
 const FA={i:-12,m:0,r:12,p:25.2},ch={};
 for(const f of['i','m','r','p'])ch[f]=finger(f,c[f],FA[f]);
 let tip;
 if(o.touch&&o.touch.length){tip=[0,0,0];for(const f of o.touch){const t=ch[f][3];for(let k=0;k<3;k++)tip[k]+=t[k]/o.touch.length;}tip[2]+=0.06;}
 else if(o.gunT!==undefined) tip=TUCK.map((v,k)=>v+(GUN_HI[k]-v)*o.gunT);
 else if(o.thumbTuck) tip=TUCK.slice();
 else tip=TUCK.map((v,k)=>v+(FULL[k]-v)*(o.thumbOpen===undefined?1:o.thumbOpen));
 const base=[-0.35,0.25,0.05],out=[[0,0,0],base];
 for(let k=1;k<=3;k++){const u=k/3,bw=Math.sin(u*Math.PI)*0.10;
  out.push([base[0]+(tip[0]-base[0])*u-bw,base[1]+(tip[1]-base[1])*u,base[2]+(tip[2]-base[2])*u+bw]);}
 for(const f of['i','m','r','p'])out.push(...ch[f]);
 return out;}
function don(p,pi,ro,ya){const cp=Math.cos(pi*D2R),sp=Math.sin(pi*D2R),cr=Math.cos(ro*D2R),sr=Math.sin(ro*D2R),cy=Math.cos(ya*D2R),sy=Math.sin(ya*D2R);
 return p.map(([x,y,z])=>{let Y=y*cp-z*sp,Z=y*sp+z*cp;let X=x*cr-Y*sr;Y=x*sr+Y*cr;const X2=X*cy+Z*sy;Z=-X*sy+Z*cy;return[X2,Y,Z];});}
const lmk=p=>p.map(([x,y])=>({x:0.5+x*0.09,y:0.90-y*0.09,z:0}));
const DEF={fire:{touch:['i']},air:{},water:{folded:['p'],thumbTuck:1},
 bolt:{folded:['i','m','r']},earth:{folded:['m','r'],thumbTuck:1}};
const acilar=[];for(let p=0;p<=60;p+=15)for(const r of[-30,0,30])for(const y of[-25,0,25])acilar.push([p,r,y]);

let gOk=0,gN=0;
for(let t=0;t<=1.001;t+=0.1) for(const[p,r,y] of acilar.filter(a=>a[0]<=45)){
  gN++; if(M.siniflandir(M.feat(lmk(don(poz3({folded:['r','p'],gunT:t}),p,r,y)))).id==='gun') gOk++;
}
console.log(`👉 SİLAH — baş parmak %0–100 × yönelim ızgarası: doğru %${(gOk/gN*100).toFixed(1)}  (${gN} örnek)`);
let dOk=0,dN=0,sap={};
for(const n in DEF) for(const[p,r,y] of acilar){
  dN++; const g=M.siniflandir(M.feat(lmk(don(poz3(DEF[n]),p,r,y)))).id;
  if(g===n)dOk++; else sap[n+'→'+(g||'red')]=(sap[n+'→'+(g||'red')]||0)+1;
}
console.log(`diğer beş poz: doğru %${(dOk/dN*100).toFixed(1)}` + (Object.keys(sap).length?'   sapmalar: '+JSON.stringify(sap):'   (sapma yok)'));
