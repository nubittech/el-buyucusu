/* YANLIŞ OKUMA ÖLÇÜMÜ — kombo2.js'in bakmadığı yön.
   kombo2 şunu soruyor: "istediğim pozu yaparsam tanınır mı" → %97-100.
   Sahadaki şikâyet ise ters yön: HİÇBİR mühür yapmazken mühür okunuyor
   ("yıldırım işaretini yapmadan yıldırım atıyor"). Bu iki soru aynı değil ve
   ikincisi hiç ölçülmüyordu.

   İki senaryo:
     GEÇİŞ    — A'yı tut, B'ye geç, B'yi tut. Beklenen TAM 2 mühür; fazlası
                elin yolda geçtiği ara şekillerden gelen yanlış okuma.
     GEZİNME  — hiçbir mühür kastedilmiyor: el pozlar arasında dolaşıyor,
                hiçbirinde onay süresi kadar durmuyor. Beklenen SIFIR onay.

   Kullanım:  node tools/yanlisokuma.js
   ============================================================= */
const realLog=console.log; console.log=()=>{};
const H=require('./handtest.js');
console.log=realLog;
const {finger}=H;
require('../muhur.js');
const M=globalThis.MUHUR;

/* --- sentetik el: kombo2.js ile aynı kurucu --- */
const TOUCH_CURL=0.42, TUCK=[-0.20,0.80,0.10], FULL=[-0.92,0.90,0.18];
const GUN_LO=[-0.50,0.95,0.12], GUN_HI=[-0.85,1.12,0.16];
function build({touch=[],folded=[],thumbTuck=false,thumbUp=false,thumbOpen=1,fan=12}){
  const curl={i:0,m:0,r:0,p:0};
  for(const f of touch) curl[f]=TOUCH_CURL;
  for(const f of folded) curl[f]=0.92;
  const FANS={i:-fan,m:0,r:fan,p:fan*2.1};
  const ch={}; for(const f of ['i','m','r','p']) ch[f]=finger(f,curl[f],FANS[f]);
  let tip;
  if(touch.length){tip=[0,0,0];for(const f of touch){const t=ch[f][3];for(let k=0;k<3;k++)tip[k]+=t[k]/touch.length;}tip[2]+=0.06;}
  else if(thumbTuck) tip=TUCK.slice();
  else if(thumbUp) tip=GUN_LO.map((v,k)=>v+(GUN_HI[k]-v)*thumbOpen);
  else tip=TUCK.map((v,k)=>v+(FULL[k]-v)*thumbOpen);
  const base=[-0.35,0.25,0.05], th=[base];
  for(let k=1;k<=3;k++){const t=k/3,bow=Math.sin(t*Math.PI)*0.10;
    th.push([base[0]+(tip[0]-base[0])*t-bow, base[1]+(tip[1]-base[1])*t, base[2]+(tip[2]-base[2])*t+bow]);}
  const lm3=[[0,0,0],...th];
  for(const f of ['i','m','r','p']) lm3.push(...ch[f]);
  return lm3.map(([x,y,z])=>({x:0.5+x*0.09,y:0.90-y*0.09,z:0}));
}
const DEF={fire:{touch:['i']},air:{serbest:1},water:{folded:['p'],thumbTuck:true},
  bolt:{folded:['i','m','r'],serbest:1},earth:{folded:['m','r'],thumbTuck:true},
  gun:{folded:['r','p'],thumbUp:true,serbest:1}};
function örnek(n,ac){const d={...DEF[n]};delete d.serbest;if(DEF[n].serbest)d.thumbOpen=ac;return build(d);}
function gauss(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
const d2v=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const TIPS={8:5,12:9,16:13,20:17};
function jitter(lm,s){const sc=d2v(lm[0],lm[9])||1e-6;const o=lm.map(p=>({x:p.x,y:p.y,z:0}));
 for(let i=0;i<o.length;i++){let k=sc*s;
  if(TIPS[i]!==undefined&&d2v(lm[i],lm[4])/sc<0.35){k*=3.5;const m=lm[TIPS[i]],vx=m.x-lm[i].x,vy=m.y-lm[i].y,vl=Math.hypot(vx,vy)||1e-6;
   o[i].x+=vx/vl*sc*0.10;o[i].y+=vy/vl*sc*0.10;}
  o[i].x+=gauss()*k;o[i].y+=gauss()*k;}return o;}
/* iki poz arası ara şekil — el yolda buradan geçiyor */
const karistir=(a,b,t)=>a.map((p,i)=>({x:p.x+(b[i].x-p.x)*t, y:p.y+(b[i].y-p.y)*t, z:0}));

const HZ=30, DT=1000/HZ, ELEM=['fire','air','water','bolt','earth'];
const N=1500, SG=0.070;

/* --- 1) GEÇİŞ --- */
function gecis(gecisMs){
  let onay=0, fazla=0, eksik=0, gecikme=[]; const kim={};
  for(let d=0;d<N;d++){
    const a=ELEM[(Math.random()*ELEM.length)|0];
    let b=a; while(b===a) b=ELEM[(Math.random()*ELEM.length)|0];
    const lmA=örnek(a,0.35+Math.random()*0.65), lmB=örnek(b,0.35+Math.random()*0.65);
    const D=M.yeniDizi(); let now=0; const cikan=[];
    const sur=lm=>{ const res=M.siniflandir(M.feat(jitter(lm,SG)));
      for(const o of M.guncelle(D,res.id,DT,now,true)) if(o.tip==='muhur') cikan.push({id:o.id,t:now});
      now+=DT; };
    for(let t=0;t<600;t+=DT) sur(lmA);
    for(let t=0;t<gecisMs;t+=DT) sur(karistir(lmA,lmB,t/gecisMs));
    for(let t=0;t<600;t+=DT) sur(lmB);
    onay+=cikan.length;
    const ilk=cikan.find(m=>m.id===a); if(ilk) gecikme.push(ilk.t);
    const kalan=[a,b];
    for(const m of cikan){ const ix=kalan.indexOf(m.id);
      if(ix>=0) kalan.splice(ix,1); else { fazla++; kim[m.id]=(kim[m.id]||0)+1; } }
    eksik+=kalan.length;
  }
  return {onay,fazla,eksik,kim,
    ortGecikme:gecikme.length?Math.round(gecikme.reduce((s,v)=>s+v,0)/gecikme.length):null};
}

/* --- 2) GEZİNME: hiçbir mühür kastedilmiyor --- */
function gezinme(durMs,deney=500){
  let toplam=0; const kim={};
  for(let d=0;d<deney;d++){
    const D=M.yeniDizi(); let now=0;
    for(const poz of [...ELEM].sort(()=>Math.random()-0.5)){
      const lm=örnek(poz,0.35+Math.random()*0.65);
      for(let t=0;t<durMs;t+=DT){
        const res=M.siniflandir(M.feat(jitter(lm,SG)));
        for(const o of M.guncelle(D,res.id,DT,now,true))
          if(o.tip==='muhur'){ toplam++; kim[o.id]=(kim[o.id]||0)+1; }
        now+=DT;
      }
    }
  }
  return {toplam,kim,deney};
}

console.log(`\nKILIT_MS=${M.KILIT_MS} · ${HZ} Hz çıkarım · σ=%${(SG*100).toFixed(1)}`);
console.log(`\nGEÇİŞ — ${N} deney × (A 600ms → geçiş → B 600ms), beklenen TAM 2 mühür\n`);
console.log('  geçiş süresi   onay/deney   FAZLA okuma   kaçan   ilk onay');
console.log('  '+'-'.repeat(58));
for(const g of [100,200,300]){
  const r=gecis(g);
  console.log('  '+String(g+' ms').padEnd(15)+String((r.onay/N).toFixed(2)).padStart(8)+
    String(r.fazla).padStart(13)+String(r.eksik).padStart(9)+String(r.ortGecikme+' ms').padStart(10));
  const k=Object.entries(r.kim).sort((a,b)=>b[1]-a[1]);
  if(k.length) console.log('      fazladan okunanlar: '+k.map(([a,b])=>a+'×'+b).join(', '));
}
console.log('\nGEZİNME — el pozlar arasında dolaşıyor, hiçbirinde durmuyor. Beklenen: SIFIR\n');
console.log('  poz başına duruş   onaylanan mühür   hangileri');
console.log('  '+'-'.repeat(58));
for(const d of [100,150,200,250]){
  const r=gezinme(d);
  console.log('  '+String(d+' ms').padEnd(19)+String(r.toplam).padStart(10)+'        '+
    (Object.entries(r.kim).sort((a,b)=>b[1]-a[1]).map(([a,b])=>a+'×'+b).join(', ')||'—'));
}
console.log('\nNot: GEZİNME sütunundaki her mühür, oyuncunun hiç yapmadığı bir mühür.');
