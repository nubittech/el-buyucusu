/* muhur.js'i doğrudan doğrular: sınıflandırıcı, beceri tablosu, çarpışma, dizi motoru. */
const realLog = console.log; console.log = () => { };
const H = require('./handtest.js');
console.log = realLog;
const { finger } = H;
require('../muhur.js');
const M = globalThis.MUHUR;

/* --- sentetik poz üreteci (prototiplerle aynı model) --- */
const TOUCH_CURL = 0.42;
const TUCK = [-0.20, 0.80, 0.10], FULL = [-0.92, 0.90, 0.18];
const GUN_LO = [-0.50, 0.95, 0.12], GUN_HI = [-0.85, 1.12, 0.16];
function build({ touch = [], folded = [], thumbTuck = false, thumbUp = false, thumbOpen = 1, fan = 12 }) {
  const curl = { i: 0, m: 0, r: 0, p: 0 };
  for (const f of touch) curl[f] = TOUCH_CURL;
  for (const f of folded) curl[f] = 0.92;
  const FANS = { i: -fan, m: 0, r: fan, p: fan * 2.1 };
  const ch = {}; for (const f of ['i', 'm', 'r', 'p']) ch[f] = finger(f, curl[f], FANS[f]);
  let tip;
  if (touch.length) { tip = [0, 0, 0]; for (const f of touch) { const t = ch[f][3]; for (let k = 0; k < 3; k++) tip[k] += t[k] / touch.length; } tip[2] += 0.06; }
  else if (thumbTuck) tip = TUCK.slice();
  else if (thumbUp) tip = GUN_LO.map((v, k) => v + (GUN_HI[k] - v) * thumbOpen);
  else tip = TUCK.map((v, k) => v + (FULL[k] - v) * thumbOpen);
  const base = [-0.35, 0.25, 0.05], th = [base];
  for (let k = 1; k <= 3; k++) { const t = k / 3, bow = Math.sin(t * Math.PI) * 0.10;
    th.push([base[0] + (tip[0] - base[0]) * t - bow, base[1] + (tip[1] - base[1]) * t, base[2] + (tip[2] - base[2]) * t + bow]); }
  const lm3 = [[0, 0, 0], ...th];
  for (const f of ['i', 'm', 'r', 'p']) lm3.push(...ch[f]);
  return lm3.map(([x, y, z]) => ({ x: 0.5 + x * 0.09, y: 0.90 - y * 0.09, z: 0 }));
}
const DEF = {
  fire: { touch: ['i'] }, air: { serbest: 1 }, water: { folded: ['p'], thumbTuck: true },
  bolt: { folded: ['i', 'm', 'r'], serbest: 1 }, earth: { folded: ['m', 'r'], thumbTuck: true },
  gun: { folded: ['r', 'p'], thumbUp: true, serbest: 1 },
};
const NAMES = Object.keys(DEF);
function örnek(n, ac) { const d = { ...DEF[n] }; delete d.serbest; if (DEF[n].serbest) d.thumbOpen = ac; return build(d); }
function gauss(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
const d2v=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const TIPS={8:5,12:9,16:13,20:17};
function jitter(lm,s){const sc=d2v(lm[0],lm[9])||1e-6;const o=lm.map(p=>({x:p.x,y:p.y,z:0}));
 for(let i=0;i<o.length;i++){let k=sc*s;
  if(TIPS[i]!==undefined&&d2v(lm[i],lm[4])/sc<0.35){k*=3.5;const m=lm[TIPS[i]],vx=m.x-lm[i].x,vy=m.y-lm[i].y,vl=Math.hypot(vx,vy)||1e-6;
   o[i].x+=vx/vl*sc*0.10;o[i].y+=vy/vl*sc*0.10;}
  o[i].x+=gauss()*k;o[i].y+=gauss()*k;}return o;}

let fail = 0;
const pad = (s, n) => String(s).padEnd(n);

console.log('1) SINIFLANDIRICI — temiz pozlar (baş parmak açıklığı %35 ve %100)\n');
for (const n of NAMES) for (const ac of [0.35, 1.0]) {
  const r = M.siniflandir(M.feat(örnek(n, ac)));
  const ok = r.id === n; if (!ok) fail++;
  console.log(` ${ok ? '✓' : '✗ HATA'}  ${pad(M.BY[n].el + ' ' + M.BY[n].ad, 16)} açıklık %${(ac*100)|0} → ${r.id || 'RED(' + r.red + ')'}`);
}

console.log('\n2) GÜRÜLTÜ + BAŞ PARMAK VARYASYONU (2500 örnek/poz)\n');
for (const sg of [0.025, 0.045, 0.070]) {
  let tot=0,ok=0,red=0,yanlis=0; const per={};
  for (const n of NAMES) {
    let c=0,r=0,y=0;
    for (let k=0;k<2500;k++){
      const res=M.siniflandir(M.feat(jitter(örnek(n,0.35+Math.random()*0.65),sg)));
      tot++; if(!res.id){red++;r++;} else if(res.id===n){ok++;c++;} else {yanlis++;y++;}
    }
    per[n]=[c/2500,r/2500,y/2500];
  }
  console.log(` σ=%${(sg*100).toFixed(1)}  doğru %${(ok/tot*100).toFixed(1)} · red %${(red/tot*100).toFixed(1)} · YANLIŞ %${(yanlis/tot*100).toFixed(2)}`);
  if (sg>=0.045) for(const n of NAMES)
    console.log(`     ${pad(M.BY[n].el+' '+M.BY[n].ad,16)} doğru %${(per[n][0]*100).toFixed(1).padStart(5)}  red %${(per[n][1]*100).toFixed(1).padStart(4)}  yanlış %${(per[n][2]*100).toFixed(2)}`);
  if (yanlis/tot > 0.01) { fail++; console.log('  ✗ HATA: yanlış oranı %1 üstünde'); }
}

console.log('\n3) BECERİ TABLOSU\n');
const T = [
  [['fire'],'Alev Oku'],[['earth'],'Taş Mermisi'],
  [['fire','fire'],'Ejder Nefesi'],[['earth','earth'],'Taş Duvar'],
  [['fire','air'],'Alev Fırtınası'],[['water','fire'],'Kaynar Dalga'],
  [['fire','water'],'Buhar Perdesi'],[['earth','bolt'],'Sarsıntı'],
  [['earth','water','fire'],'Volkan'],[['fire','air','bolt'],'Yanan Gökyüzü'],
  [['fire','bolt'],null],[['air','water'],null],[['fire','air','water'],null],
];
for (const [dz,bekl] of T) {
  const b=M.beceriBul(dz), got=b?b.ad:null, ok=got===bekl; if(!ok)fail++;
  console.log(` ${ok?'✓':'✗ HATA'}  ${pad(dz.map(x=>M.BY[x].el).join(''),8)} → ${pad(got||'eşleşme yok',22)}${b?b.tur+' ×'+b.kat:''}`);
}
const EL=['fire','air','water','bolt','earth'];
let kaps=0,isim=new Set();
for(const a of EL)for(const b of EL){const r=M.beceriBul([a,b]);if(r){kaps++;isim.add(r.ad);}}
let z=0;for(const a of EL)for(const b of EL)for(const c of EL)if(M.beceriBul([a,b,c]))z++;
console.log(`\n ikili kapsam ${kaps}/25 · ${isim.size} farklı beceri · üçlü zincir ${z}/125`);
if(kaps!==15||isim.size!==15||z!==5){fail++;console.log(' ✗ HATA: kapsam beklenenden farklı');}

console.log('\n4) HAVADA ÇARPIŞMA\n');
const mermi=(el,guc)=>({el,guc});
const C=[
  ['Ateş(1) vs Hava(1) — ateş avantajlı', mermi('fire',1), mermi('air',1), 'deldi','fire'],
  ['Hava(1) vs Ateş(1) — sıra fark etmemeli', mermi('air',1), mermi('fire',1), 'deldi','fire'],
  ['Ateş(1) vs Ateş(1) — aynı güç', mermi('fire',1), mermi('fire',1), 'notr',null],
  ['Ateş(2.6) vs Ateş(1) — güçlü olan deler', mermi('fire',2.6), mermi('fire',1), 'deldi','fire'],
  ['Toprak(1) vs Hava(1) — nötr eşleşme', mermi('earth',1), mermi('air',1), 'deldi','earth'],
];
for(const [ad,a,b,beklSonuc,beklEl] of C){
  const r=M.carpismaCoz(a,b);
  const el=r.kazanan?r.kazanan.el:null;
  const ok=(r.sonuc===beklSonuc && el===beklEl); if(!ok)fail++;
  console.log(` ${ok?'✓':'✗ HATA'}  ${pad(ad,42)} → ${r.sonuc}${el?' · kazanan '+M.BY[el].el+' (kalan güç '+r.kalanGuc.toFixed(2)+')':''}`);
}
/* çözüm argüman sırasından bağımsız olmalı */
let asimetri=0;
for(const a of EL) for(const b of EL) for(const g1 of [1,1.6,2.6]) for(const g2 of [1,1.6,2.6]){
  const r1=M.carpismaCoz(mermi(a,g1),mermi(b,g2)), r2=M.carpismaCoz(mermi(b,g2),mermi(a,g1));
  if(r1.sonuc!==r2.sonuc) asimetri++;
  else if(r1.sonuc==='deldi' && r1.kazanan.el!==r2.kazanan.el) asimetri++;
}
console.log(` ${asimetri?'✗ HATA':'✓'}  çözüm argüman sırasından bağımsız (${asimetri} sapma / 225 çift)`);
if(asimetri)fail++;
/* aynı element: hep güçlü olan delmeli */
let sapma=0;
for(const el of EL) for(const [g1,g2] of [[1,1.6],[1.6,1],[1,2.6],[2.6,1.6]]){
  const r=M.carpismaCoz(mermi(el,g1),mermi(el,g2));
  if(r.sonuc!=='deldi'||r.kazanan.guc!==Math.max(g1,g2)) sapma++;
}
console.log(` ${sapma?'✗ HATA':'✓'}  aynı element çarpışmasında hep güçlü mühür deliyor (${sapma} sapma)`);
if(sapma)fail++;

console.log('\n5) TEK MÜHÜR MODU (kombo kapalı, 60 fps kare simülasyonu)\n');
const DT=1000/60;
function oyna(adimlar){
  const D=M.yeniDizi(); let t=0; const olaylar=[];
  for(const [id,n] of adimlar) for(let k=0;k<n;k++){ t+=DT; olaylar.push(...M.guncelle(D,id,DT,t)); }
  return {D,olaylar};
}
const F=(id,ms)=>[id,Math.round(ms/DT)];
const tip=r=>r.olaylar.map(o=>o.tip).join(',')||'—';
const SEN=[
  ['🔥 → şarj olur (ateş etmez)', [F('fire',300),F(null,600)],
    r=>tip(r)==='yuklemeBasladi,yuklendi' && r.D.beceri && r.D.beceri.ad==='Alev Oku'],
  ['🔥 → 👉 → ateşler', [F('fire',300),F(null,150),F('gun',300),F(null,200)],
    r=>r.olaylar.some(o=>o.tip==='ates'&&o.beceri.ad==='Alev Oku')],
  ['ateşten sonra şarj sıfırlanır', [F('fire',300),F(null,150),F('gun',300),F(null,200)],
    r=>r.D.beceri===null],
  ['şarjsız 👉 hiçbir şey yapmaz', [F('gun',400),F(null,200)],
    r=>!r.olaylar.some(o=>o.tip==='ates')],
  ['🔥 sonra tekrar 🔥 şarjı baştan başlatmaz',
    [F('fire',300),F(null,150),F('fire',300),F(null,150)],
    r=>r.olaylar.filter(o=>o.tip==='yuklemeBasladi').length===1],
  ['şarjlıyken farklı element şarjı değiştirir',
    [F('fire',300),F(null,600),F('earth',300),F(null,600)],
    r=>r.D.beceri&&r.D.beceri.el==='earth'],
  /* şarj 350 ms; mühür ~167 ms'de onaylanıyor, silah da ~167 ms sonra →
     şarj 167 ms'de kalır, dolmadığı için ateşlememeli */
  ['şarj dolmadan 👉 ateşlemez',
    [F('earth',180),F('gun',260),F(null,60)],
    r=>!r.olaylar.some(o=>o.tip==='ates')],   /* şarj sonradan dolabilir, önemli olan ateşlememesi */
  ['🔥 kısa dokunuş (100ms) tetiklemez', [F('fire',100),F(null,400)],
    r=>tip(r)==='—'],
  ['iki kez ateşlemek için iki mühür gerekir',
    [F('fire',300),F(null,150),F('gun',300),F(null,150),F('gun',300),F(null,150),
     F('fire',300),F(null,150),F('gun',300),F(null,150)],
    r=>r.olaylar.filter(o=>o.tip==='ates').length===2],
];
for(const [ad,adim,kontrol] of SEN){
  const r=oyna(adim); const ok=kontrol(r); if(!ok)fail++;
  console.log(` ${ok?'✓':'✗ HATA'}  ${pad(ad,44)} olaylar: ${tip(r)}`);
}

console.log(fail ? `\n=== ${fail} BAŞARISIZ ===` : '\n=== HEPSİ GEÇTİ ===');
process.exit(fail ? 1 : 0);
