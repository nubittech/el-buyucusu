/* KADEMELİ AÇILIM ÖLÇÜMÜ
   Hikâye modunda oyuncu elementleri tek tek öğreniyor. Soru: sınıflandırıcı
   yalnız AÇILMIŞ pozlara bakarsa tanıma ne kadar iyileşir?

   Gerçek koddan sapmamak için muhur.js'in kendi siniflandir()'ini çağırıp
   döndürdüğü mesafe listesini (ds) açılmış alt kümeye daraltıyor, sonra AYNI
   red kurallarını (esik, oranEsik) o alt kümeye uyguluyoruz. Yani mesafeler
   sevk edilen koddan, karar kuralı da öyle — yalnız aday kümesi değişiyor. */
const realLog = console.log; console.log = () => {};
const H = require('./handtest.js');
console.log = realLog;
const { finger } = H;
require('../muhur.js');
const M = globalThis.MUHUR;

/* --- verifymuhur.js ile AYNI poz üreteci ve gürültü modeli --- */
const TOUCH_CURL = 0.42;
const TUCK = [-0.20, 0.80, 0.10], FULL = [-0.92, 0.90, 0.18];
const GUN_LO = [-0.50, 0.95, 0.12], GUN_HI = [-0.85, 1.12, 0.16];
function build({ touch = [], folded = [], thumbTuck = false, thumbUp = false, thumbOpen = 1, fan = 12 }) {
  const curl = { i: 0, m: 0, r: 0, p: 0 };
  for (const f of touch) curl[f] = TOUCH_CURL;
  for (const f of folded) curl[f] = 0.92;
  const FANS = { i: -fan, m: 0, r: fan, p: fan * 2.1 };
  const ch = {}; for (const f of ['i','m','r','p']) ch[f] = finger(f, curl[f], FANS[f]);
  let tip;
  if (touch.length) { tip=[0,0,0]; for(const f of touch){const t=ch[f][3];for(let k=0;k<3;k++)tip[k]+=t[k]/touch.length;} tip[2]+=0.06; }
  else if (thumbTuck) tip = TUCK.slice();
  else if (thumbUp) tip = GUN_LO.map((v,k)=>v+(GUN_HI[k]-v)*thumbOpen);
  else tip = TUCK.map((v,k)=>v+(FULL[k]-v)*thumbOpen);
  const base=[-0.35,0.25,0.05], th=[base];
  for(let k=1;k<=3;k++){const t=k/3,bow=Math.sin(t*Math.PI)*0.10;
    th.push([base[0]+(tip[0]-base[0])*t-bow, base[1]+(tip[1]-base[1])*t, base[2]+(tip[2]-base[2])*t+bow]);}
  const lm3=[[0,0,0],...th];
  for(const f of ['i','m','r','p']) lm3.push(...ch[f]);
  return lm3.map(([x,y,z])=>({x:0.5+x*0.09, y:0.90-y*0.09, z:0}));
}
const DEF = {
  fire:{touch:['i']}, air:{serbest:1}, water:{folded:['p'],thumbTuck:true},
  bolt:{folded:['i','m','r'],serbest:1}, earth:{folded:['m','r'],thumbTuck:true},
  gun:{folded:['r','p'],thumbUp:true,serbest:1},
};
function örnek(n,ac){const d={...DEF[n]};delete d.serbest;if(DEF[n].serbest)d.thumbOpen=ac;return build(d);}
function gauss(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
const d2v=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const TIPS={8:5,12:9,16:13,20:17};
function jitter(lm,s){const sc=d2v(lm[0],lm[9])||1e-6;const o=lm.map(p=>({x:p.x,y:p.y,z:0}));
 for(let i=0;i<o.length;i++){let k=sc*s;
  if(TIPS[i]!==undefined&&d2v(lm[i],lm[4])/sc<0.35){k*=3.5;const m=lm[TIPS[i]],vx=m.x-lm[i].x,vy=m.y-lm[i].y,vl=Math.hypot(vx,vy)||1e-6;
   o[i].x+=vx/vl*sc*0.10;o[i].y+=vy/vl*sc*0.10;}
  o[i].x+=gauss()*k;o[i].y+=gauss()*k;}return o;}

/* Açılmış alt kümeye daraltılmış karar. siniflandir()'in kuralının aynısı. */
function kisitliKarar(res, acik){
  const ds = res.ds.filter(d => acik.includes(d.id));
  if (!ds.length) return {id:null, red:'kume-bos'};
  if (ds[0].d > res.esik) return {id:null, red:'uzak'};
  if (ds.length > 1 && (ds[1].d/(ds[0].d||1e-6)) < res.oranEsik) return {id:null, red:'belirsiz'};
  return {id:ds[0].id, red:null};
}

/* Kademeler: silah ilk gelmek zorunda (onsuz ateş edilemiyor) */
const KADEME = [
  ['gun','fire'],
  ['gun','fire','water'],
  ['gun','fire','water','air'],
  ['gun','fire','water','air','bolt'],
  ['gun','fire','water','air','bolt','earth'],
];
const AD = {gun:'silah', fire:'ateş', water:'su', air:'hava', bolt:'yıldırım', earth:'toprak'};
const N = 4000;

for (const sg of [0.045, 0.070]) {
  console.log(`\nσ=%${(sg*100).toFixed(1)} gürültü · poz başına ${N} örnek\n`);
  console.log('  açık poz  yeni öğrenilen   doğru    red   YANLIŞ');
  console.log('  ' + '-'.repeat(52));
  let öncekiDogru = null;
  for (const acik of KADEME) {
    let tot=0, ok=0, red=0, yanlis=0;
    for (const n of acik) {
      for (let k=0;k<N;k++){
        const res = M.siniflandir(M.feat(jitter(örnek(n, 0.35+Math.random()*0.65), sg)));
        const kr = kisitliKarar(res, acik);
        tot++;
        if (!kr.id) { red++; }
        else if (kr.id === n) ok++;
        else yanlis++;
      }
    }
    const d=(ok/tot*100), r=(red/tot*100), y=(yanlis/tot*100);
    const fark = öncekiDogru===null ? '' : `  (${(d-öncekiDogru>=0?'+':'')}${(d-öncekiDogru).toFixed(1)})`;
    const yeni = acik[acik.length-1];
    console.log(`  ${String(acik.length).padStart(2)}        ${AD[yeni].padEnd(12)} %${d.toFixed(1).padStart(5)}  %${r.toFixed(1).padStart(4)}  %${y.toFixed(2).padStart(5)}${fark}`);
    öncekiDogru = d;
  }
}
console.log('\nNot: "YANLIŞ" = başka bir mühür sanıldı. Oyunda en pahalı hata bu —');
console.log('yanlış element atmak, hiç atmamaktan kötü.\n');
