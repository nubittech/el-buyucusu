/* Asimetrik ağırlık yanlılığı: W ve W_GUN toplamları eşit değil, bu yüzden
   silahın mesafesi sistematik küçük çıkıyor olabilir. Ölçüp doğrula. */
const rl=console.log; console.log=()=>{}; const H=require('./handtest.js'); console.log=rl;
const {finger}=H; require('../muhur.js'); const M=globalThis.MUHUR;
const W=[1.6,1.6,1.6,1.6,1.5,1,1,1,1.3], WG=[1.9,1.9,1.9,1.9,0.3,0.3,0.3,0.3,0.3];
const norm=v=>{const s=Math.hypot(...v);return v.map(x=>x/s);};
console.log('W    normu:',Math.hypot(...W).toFixed(3),' toplam:',W.reduce((a,b)=>a+b).toFixed(1));
console.log('W_GUN normu:',Math.hypot(...WG).toFixed(3),' toplam:',WG.reduce((a,b)=>a+b).toFixed(1));
console.log('→ W_GUN normu W\'nin %'+(Math.hypot(...WG)/Math.hypot(...W)*100).toFixed(0)+'\'i\n');

const TUCK=[-0.20,0.80,0.10],FULL=[-0.92,0.90,0.18],GUN_HI=[-0.85,1.12,0.16];
function poz(o){const c={i:0,m:0,r:0,p:0};
 for(const f of(o.touch||[]))c[f]=0.42; for(const f of(o.folded||[]))c[f]=0.92;
 const FA={i:-12,m:0,r:12,p:25.2},ch={};
 for(const f of['i','m','r','p'])ch[f]=finger(f,c[f],FA[f]);
 let tip;
 if(o.touch&&o.touch.length){tip=[0,0,0];for(const f of o.touch){const t=ch[f][3];for(let k=0;k<3;k++)tip[k]+=t[k]/o.touch.length;}tip[2]+=0.06;}
 else if(o.gunT!==undefined)tip=TUCK.map((v,k)=>v+(GUN_HI[k]-v)*o.gunT);
 else if(o.thumbTuck)tip=TUCK.slice();
 else tip=TUCK.map((v,k)=>v+(FULL[k]-v)*(o.thumbOpen===undefined?1:o.thumbOpen));
 const base=[-0.35,0.25,0.05],out=[[0,0,0],base];
 for(let k=1;k<=3;k++){const u=k/3,bw=Math.sin(u*Math.PI)*0.10;
  out.push([base[0]+(tip[0]-base[0])*u-bw,base[1]+(tip[1]-base[1])*u,base[2]+(tip[2]-base[2])*u+bw]);}
 for(const f of['i','m','r','p'])out.push(...ch[f]);
 return out.map(([x,y])=>({x:0.5+x*0.09,y:0.90-y*0.09,z:0}));}
const DEF={fire:{touch:['i']},air:{},water:{folded:['p'],thumbTuck:1},
 bolt:{folded:['i','m','r']},earth:{folded:['m','r'],thumbTuck:1},gun:{folded:['r','p'],gunT:0.55}};
const N=Object.keys(DEF);
function gauss(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
const d2v=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const TIPS={8:5,12:9,16:13,20:17};
function jit(lm,s){const sc=d2v(lm[0],lm[9])||1e-6;const o=lm.map(p=>({x:p.x,y:p.y,z:0}));
 for(let i=0;i<o.length;i++){let k=sc*s;
  if(TIPS[i]!==undefined&&d2v(lm[i],lm[4])/sc<0.35){k*=3.5;const m=lm[TIPS[i]],vx=m.x-lm[i].x,vy=m.y-lm[i].y,vl=Math.hypot(vx,vy)||1e-6;
   o[i].x+=vx/vl*sc*0.10;o[i].y+=vy/vl*sc*0.10;}
  o[i].x+=gauss()*k;o[i].y+=gauss()*k;}return o;}

function dene(wGun,etiket){
  const P=M.PROTO;
  const uz=(a,b,w)=>{let s=0;for(let k=0;k<9;k++){const d=(a[k]-b[k])*w[k];s+=d*d;}return Math.sqrt(s);};
  const sn=f=>{const ds=N.map(n=>[uz(f,P[n],n==='gun'?wGun:W),n]).sort((a,b)=>a[0]-b[0]);
    if(ds[0][0]>M.RED_MESAFE)return 'red'; if(ds[1][0]/(ds[0][0]||1e-6)<M.RED_ORAN)return 'red'; return ds[0][1];};
  let tot=0,ok=0,red=0,gunCaldi=0; const per={};
  for(const n of N){ let c=0,r=0,g=0;
    for(let k=0;k<3000;k++){
      const o={...DEF[n]}; if(n==='gun')o.gunT=Math.random(); else if(!o.touch&&!o.thumbTuck)o.thumbOpen=0.35+Math.random()*0.65;
      const res=sn(M.feat(jit(poz(o),0.045)));
      tot++; if(res===n){ok++;c++;} else if(res==='red'){red++;r++;} else {if(res==='gun'&&n!=='gun'){gunCaldi++;g++;}}
    }
    per[n]=[c/3000,r/3000,g/3000];
  }
  console.log(`${etiket}\n  doğru %${(ok/tot*100).toFixed(1)} · red %${(red/tot*100).toFixed(1)} · silahın çaldığı %${(gunCaldi/tot*100).toFixed(2)}`);
  for(const n of N) console.log(`     ${M.BY[n].el} ${M.BY[n].ad.padEnd(9)} doğru %${(per[n][0]*100).toFixed(1).padStart(5)}  red %${(per[n][1]*100).toFixed(1).padStart(4)}${per[n][2]>0?'  →silah %'+(per[n][2]*100).toFixed(1):''}`);
  console.log('');
  return ok/tot;
}
dene(WG,'MEVCUT (W_GUN normalize DEĞİL)');
const WGn=(()=>{const s=Math.hypot(...W)/Math.hypot(...WG);return WG.map(x=>x*s);})();
console.log('normalize W_GUN:',WGn.map(x=>+x.toFixed(3)).join(', '));
dene(WGn,'NORMALİZE (aynı norm)');
