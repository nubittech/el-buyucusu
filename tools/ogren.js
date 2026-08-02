/* Öğrenilmiş kalibrasyon gerçekten kazandırıyor mu?
   Kaydı simüle et (poz + hareket varyasyonu), sonra EĞİTİMDE GÖRÜLMEMİŞ
   örneklerle varsayılan modla karşılaştır. */
const rl=console.log; console.log=()=>{}; const H=require('./handtest.js'); console.log=rl;
const {finger}=H;
global.localStorage={_d:{},getItem(k){return this._d[k]||null;},setItem(k,v){this._d[k]=v;},removeItem(k){delete this._d[k];}};
require('../muhur.js'); const M=globalThis.MUHUR;
const D2R=Math.PI/180, TUCK=[-0.20,0.80,0.10], FULL=[-0.92,0.90,0.18], GUN_HI=[-0.85,1.12,0.16];
function poz3(o){const c={i:0,m:0,r:0,p:0};
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
 return out;}
function don(p,pi,ro,ya){const cp=Math.cos(pi*D2R),sp=Math.sin(pi*D2R),cr=Math.cos(ro*D2R),sr=Math.sin(ro*D2R),cy=Math.cos(ya*D2R),sy=Math.sin(ya*D2R);
 return p.map(([x,y,z])=>{let Y=y*cp-z*sp,Z=y*sp+z*cp;let X=x*cr-Y*sr;Y=x*sr+Y*cr;const X2=X*cy+Z*sy;Z=-X*sy+Z*cy;return[X2,Y,Z];});}
function gauss(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
const d2v=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const TIPS={8:5,12:9,16:13,20:17};
function lmk(p3,olcek,sg){
  const lm=p3.map(([x,y])=>({x:0.5+x*0.09*olcek,y:0.90-y*0.09*olcek,z:0}));
  const sc=d2v(lm[0],lm[9])||1e-6;
  for(let i=0;i<lm.length;i++){let k=sc*sg;
    if(TIPS[i]!==undefined&&d2v(lm[i],lm[4])/sc<0.35){k*=3.5;
      const m=lm[TIPS[i]],vx=m.x-lm[i].x,vy=m.y-lm[i].y,vl=Math.hypot(vx,vy)||1e-6;
      lm[i].x+=vx/vl*sc*0.10;lm[i].y+=vy/vl*sc*0.10;}
    lm[i].x+=gauss()*k;lm[i].y+=gauss()*k;}
  return lm;}
const DEF={fire:{touch:['i']},air:{serbest:1},water:{folded:['p'],thumbTuck:1},
 bolt:{folded:['i','m','r'],serbest:1},earth:{folded:['m','r'],thumbTuck:1},gun:{gunSerbest:1,folded:['r','p']}};
const N=Object.keys(DEF);
/* "elini gezdir": ölçek, yönelim, baş parmak ve gürültü hep birlikte değişiyor */
function ornek(n,sg){
  const o={...DEF[n]}; delete o.serbest; delete o.gunSerbest;
  if(DEF[n].serbest) o.thumbOpen=0.35+Math.random()*0.65;
  if(DEF[n].gunSerbest) o.gunT=Math.random();
  const pi=Math.random()*45, ro=(Math.random()*2-1)*30, ya=(Math.random()*2-1)*28;
  const olcek=0.7+Math.random()*0.6;
  return lmk(don(poz3(o),pi,ro,ya),olcek,sg);
}
function olc(etiket){
  let tot=0,ok=0,red=0,yanlis=0;const per={};
  for(const n of N){let c=0,r=0,y=0;
    for(let k=0;k<1500;k++){
      const res=M.siniflandir(M.feat(ornek(n,0.045)));
      tot++; if(!res.id){red++;r++;} else if(res.id===n){ok++;c++;} else {yanlis++;y++;}
    }
    per[n]=[c/1500,r/1500,y/1500];
  }
  console.log(`${etiket}  doğru %${(ok/tot*100).toFixed(1)} · emin değil %${(red/tot*100).toFixed(1)} · YANLIŞ %${(yanlis/tot*100).toFixed(2)}`);
  for(const n of N) console.log(`     ${M.BY[n].el} ${M.BY[n].ad.padEnd(9)} doğru %${(per[n][0]*100).toFixed(1).padStart(5)}  emin değil %${(per[n][1]*100).toFixed(1).padStart(4)}  yanlış %${(per[n][2]*100).toFixed(2)}`);
  console.log('');
  return ok/tot;
}
console.log('Hareket varyasyonu: yönelim (pitch 0-45, roll ±30, yaw ±28) + ölçek 0.7-1.3x + baş parmak serbest + σ=%4.5 gürültü\n');
const a=olc('VARSAYILAN MOD (sentetik prototip)');
/* 4 sn kayıt ≈ 120 kare */
for(const n of N){ M.kayitBasla(n); for(let k=0;k<130;k++) M.kayitOrnek(ornek(n,0.045)); M.kayitBitir(); }
console.log(`kayıt tamam · öğrenilmiş mod: ${M.ogrenilmisMod()} (${M.kalSayim()}/6)\n`);
const b=olc('ÖĞRENİLMİŞ MOD (kendi elinden)');
console.log(`>>> doğruluk %${(a*100).toFixed(1)} → %${(b*100).toFixed(1)}`);

/* ============================================================
   ASIL SORU: prototipler senin eline UYMUYORSA?
   Farklı anatomi simüle et — parmak boyları, baş parmak erişimi ve avuç
   oranları değişsin. Sabit prototip bu kişiyi hiç görmedi; öğrenilmiş mod
   ise doğrudan ondan öğreniyor. Gerçek dünyadaki durum bu.
   ============================================================ */
function kisiselles(p3,K){
  const MCPI={i:5,m:9,r:13,p:17};
  const out=p3.map(a=>a.slice());
  for(const [f,mi] of Object.entries(MCPI)){
    const base=out[mi], k=K.parmak[f];
    for(let j=mi+1;j<=mi+3;j++)
      for(let c=0;c<3;c++) out[j][c]=base[c]+(out[j][c]-base[c])*k;
  }
  for(let j=1;j<=4;j++){                       /* baş parmak erişimi */
    for(let c=0;c<3;c++) out[j][c]=out[0][c]+(out[j][c]-out[0][c])*K.basParmak;
  }
  for(const j of [5,9,13,17])                  /* avuç genişliği */
    out[j][0]*=K.avuc;
  return out;
}
function ornekK(n,sg,K){
  const o={...DEF[n]}; delete o.serbest; delete o.gunSerbest;
  if(DEF[n].serbest) o.thumbOpen=0.35+Math.random()*0.65;
  if(DEF[n].gunSerbest) o.gunT=Math.random();
  const pi=Math.random()*45, ro=(Math.random()*2-1)*30, ya=(Math.random()*2-1)*28;
  return lmk(don(kisiselles(poz3(o),K),pi,ro,ya),0.7+Math.random()*0.6,sg);
}
function olcK(etiket,K){
  let tot=0,ok=0,red=0,yanlis=0;
  for(const n of N) for(let k=0;k<1500;k++){
    const res=M.siniflandir(M.feat(ornekK(n,0.045,K)));
    tot++; if(!res.id)red++; else if(res.id===n)ok++; else yanlis++;
  }
  console.log(`  ${etiket.padEnd(26)} doğru %${(ok/tot*100).toFixed(1).padStart(5)}  emin değil %${(red/tot*100).toFixed(1).padStart(4)}  YANLIŞ %${(yanlis/tot*100).toFixed(2)}`);
  return ok/tot;
}
const KISILER=[
  ['kısa parmak, kısa baş parmak',{parmak:{i:0.85,m:0.85,r:0.82,p:0.78},basParmak:0.82,avuc:1.10}],
  ['uzun parmak, geniş avuç',     {parmak:{i:1.15,m:1.18,r:1.15,p:1.12},basParmak:1.10,avuc:0.92}],
  ['serçesi kısa, baş parmağı uzun',{parmak:{i:1.0,m:1.0,r:0.95,p:0.72},basParmak:1.20,avuc:1.0}],
];
console.log('\n\nFARKLI ELLER — prototip bu kişiyi hiç görmedi\n');
for(const [ad,K] of KISILER){
  console.log(` ${ad}:`);
  M.kalSil();
  const v=olcK('varsayılan prototip',K);
  for(const n of N){ M.kayitBasla(n); for(let k=0;k<130;k++) M.kayitOrnek(ornekK(n,0.045,K)); M.kayitBitir(); }
  const o=olcK('bu kişiden öğrenilmiş',K);
  console.log(`   → %${(v*100).toFixed(1)} → %${(o*100).toFixed(1)}\n`);
}
