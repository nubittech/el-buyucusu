/* SİLAH POZU her yönelimde okunuyor mu?
   Şüphe: silahı ileri doğrulttuğunda işaret parmağı kameraya bakar ve
   perspektifte KISALIR; 2B uzama oranı onu "kapalı" sanır.
   Burada poz 3B kurulup döndürülüyor, hem 2B hem 3B özelliklerle sınanıyor. */
const realLog = console.log; console.log = () => { };
const H = require('./handtest.js');
console.log = realLog;
const { finger } = H;
require('../muhur.js');
const M = globalThis.MUHUR;
const D2R = Math.PI / 180;

const TOUCH_CURL = 0.42;
const TUCK = [-0.20, 0.80, 0.10], FULL = [-0.92, 0.90, 0.18];
const GUN_LO = [-0.50, 0.95, 0.12], GUN_HI = [-0.85, 1.12, 0.16];
/* 3B nokta bulutu (yerel eksen: x avuç boyunca, y parmaklar, z avuç normali) */
function poz3({ touch = [], folded = [], thumbTuck = false, thumbUp = false, thumbOpen = 1, fan = 12 }) {
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
  const out = [[0, 0, 0], ...th];
  for (const f of ['i', 'm', 'r', 'p']) out.push(...ch[f]);
  return out;
}
/* pitch: parmakları kameraya doğru yatır (silahı ileri doğrultmak) · roll: eli yana yatır */
function yonlendir(p3, pitch, roll, yaw) {
  const cp = Math.cos(pitch * D2R), sp = Math.sin(pitch * D2R);
  const cr = Math.cos(roll * D2R), sr = Math.sin(roll * D2R);
  const cy = Math.cos(yaw * D2R), sy = Math.sin(yaw * D2R);
  return p3.map(([x, y, z]) => {
    let Y = y * cp - z * sp, Z = y * sp + z * cp;          /* pitch (x ekseni) */
    let X = x * cr - Y * sr; Y = x * sr + Y * cr;          /* roll (z ekseni) */
    const X2 = X * cy + Z * sy; Z = -X * sy + Z * cy;      /* yaw (y ekseni) */
    return [X2, Y, Z];
  });
}
/* MediaPipe benzeri çıktı: x,y görüntü koordinatı, z bileğe göre derinlik (x ile aynı ölçekte) */
function landmark(p3) {
  const wz = p3[0][2];
  return p3.map(([x, y, z]) => ({ x: 0.5 + x * 0.09, y: 0.90 - y * 0.09, z: (z - wz) * 0.09 }));
}

/* --- özellikler: 2B (mevcut) ve 3B (z dahil) --- */
const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const d3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
function ozellik(lm, D) {
  const pw = D(lm[5], lm[17]) || 1e-6;
  const ext = (t, p) => D(lm[t], lm[0]) / (D(lm[p], lm[0]) || 1e-6);
  return [ext(8, 6), ext(12, 10), ext(16, 14), ext(20, 18),
    D(lm[4], lm[8]) / pw, D(lm[4], lm[12]) / pw, D(lm[4], lm[16]) / pw, D(lm[4], lm[20]) / pw,
    D(lm[4], lm[17]) / pw];
}
const W = [1.6, 1.6, 1.6, 1.6, 1.5, 1, 1, 1, 1.3];
const uzak = (a, b) => { let s = 0; for (let k = 0; k < 9; k++) { const d = (a[k] - b[k]) * W[k]; s += d * d; } return Math.sqrt(s); };

const DEF = {
  fire: { touch: ['i'] }, air: {}, water: { folded: ['p'], thumbTuck: true },
  bolt: { folded: ['i', 'm', 'r'] }, earth: { folded: ['m', 'r'], thumbTuck: true },
  gun: { folded: ['r', 'p'], thumbUp: true },
};
const NAMES = Object.keys(DEF);
/* prototipler: her iki uzaklık ölçüsü için ayrı ayrı, düz duruştan */
const PROTO = { d2: {}, d3: {} };
for (const n of NAMES) {
  const lm = landmark(yonlendir(poz3(DEF[n]), 0, 0, 0));
  PROTO.d2[n] = ozellik(lm, d2); PROTO.d3[n] = ozellik(lm, d3);
}
function sinifla(lm, mod) {
  const f = ozellik(lm, mod === 'd2' ? d2 : d3);
  const ds = NAMES.map(n => [uzak(f, PROTO[mod][n]), n]).sort((a, b) => a[0] - b[0]);
  if (ds[0][0] > M.RED_MESAFE) return 'RED';
  if (ds[1][0] / (ds[0][0] || 1e-6) < M.RED_ORAN) return 'BELİRSİZ';
  return ds[0][1];
}

const pad = (s, n) => String(s).padEnd(n);
console.log('SİLAH POZU — parmaklar kameraya doğru yatırıldıkça (pitch)\n');
console.log(pad('pitch', 7), pad('ext(işaret) 2B', 15), pad('ext(işaret) 3B', 15), pad('2B sonuç', 12), '3B sonuç');
for (let p = 0; p <= 75; p += 15) {
  const lm = landmark(yonlendir(poz3(DEF.gun), p, 0, 0));
  const f2 = ozellik(lm, d2), f3 = ozellik(lm, d3);
  console.log(pad(p + '°', 7), pad(f2[0].toFixed(3), 15), pad(f3[0].toFixed(3), 15),
    pad(sinifla(lm, 'd2'), 12), sinifla(lm, 'd3'));
}

console.log('\n\nTÜM POZLAR × YÖNELİM IZGARASI (pitch 0–60, roll ±30, yaw ±25)\n');
const acilar = [];
for (let p = 0; p <= 60; p += 15) for (const r of [-30, 0, 30]) for (const y of [-25, 0, 25]) acilar.push([p, r, y]);
for (const mod of ['d2', 'd3']) {
  let tot = 0, ok = 0, red = 0, yanlis = 0; const per = {};
  for (const n of NAMES) {
    let c = 0, rj = 0, y2 = 0;
    for (const [p, r, y] of acilar) {
      const lm = landmark(yonlendir(poz3(DEF[n]), p, r, y));
      const g = sinifla(lm, mod);
      tot++;
      if (g === n) { ok++; c++; } else if (g === 'RED' || g === 'BELİRSİZ') { red++; rj++; } else { yanlis++; y2++; }
    }
    per[n] = [c / acilar.length, rj / acilar.length, y2 / acilar.length];
  }
  console.log(`${mod === 'd2' ? '2B (mevcut)' : '3B (z dahil) '}  doğru %${(ok / tot * 100).toFixed(1)} · red %${(red / tot * 100).toFixed(1)} · YANLIŞ %${(yanlis / tot * 100).toFixed(1)}`);
  for (const n of NAMES)
    console.log(`     ${pad(M.BY[n].el + ' ' + M.BY[n].ad, 16)} doğru %${(per[n][0] * 100).toFixed(0).padStart(3)}  red %${(per[n][1] * 100).toFixed(0).padStart(3)}  yanlış %${(per[n][2] * 100).toFixed(0).padStart(3)}`);
  console.log('');
}

/* --- Silah baş parmağına duyarlı mı? Kullanıcı her seferinde aynı tutmaz. --- */
console.log('\nSİLAH — baş parmak duruşuna göre (mevcut prototip: baş parmak DİK)\n');
function gunTip(t){ /* 0 = avuçta kapalı, 1 = tam dik */
  return TUCK.map((v,k)=>v+(GUN_HI[k]-v)*t);
}
function poz3Gun(t){
  const p=poz3({folded:['r','p'],thumbUp:true});
  const tip=gunTip(t), base=[-0.35,0.25,0.05];
  p[1]=base.slice();                    /* landmark 1 = CMC, 2..4 = MCP/IP/UÇ */
  for(let k=1;k<=3;k++){ const u=k/3,bow=Math.sin(u*Math.PI)*0.10;
    p[k+1]=[base[0]+(tip[0]-base[0])*u-bow, base[1]+(tip[1]-base[1])*u, base[2]+(tip[2]-base[2])*u+bow]; }
  return p;
}
console.log(pad('baş parmak',12), pad('sonuç',12), 'en yakın iki mesafe');
for(let t=0;t<=1.001;t+=0.2){
  const lm=landmark(yonlendir(poz3Gun(t),0,0,0));
  const f=ozellik(lm,d2);
  const ds=NAMES.map(n=>[uzak(f,PROTO.d2[n]),n]).sort((a,b)=>a[0]-b[0]);
  console.log(pad('%'+(t*100).toFixed(0),12), pad(sinifla(lm,'d2'),12),
    ds.slice(0,2).map(x=>`${x[1]} ${x[0].toFixed(2)}`).join(' · '));
}

/* --- baş parmaktan bağımsız yeni prototip: aralığın ortalaması --- */
const fs=[]; for(let t=0;t<=1.001;t+=0.05) fs.push(ozellik(landmark(yonlendir(poz3Gun(t),0,0,0)),d2));
const gunYeni=fs[0].map((_,k)=>+(fs.reduce((s,f)=>s+f[k],0)/fs.length).toFixed(4));
console.log('\ngun (yeni, baş parmaktan bağımsız):',JSON.stringify(gunYeni));
console.log('gun (eski):                        ',JSON.stringify(PROTO.d2.gun.map(x=>+x.toFixed(4))));

const P2={...PROTO.d2,gun:gunYeni};
function sinifla2(lm){
  const f=ozellik(lm,d2);
  const ds=NAMES.map(n=>[uzak(f,P2[n]),n]).sort((a,b)=>a[0]-b[0]);
  if(ds[0][0]>M.RED_MESAFE) return 'RED';
  if(ds[1][0]/(ds[0][0]||1e-6)<M.RED_ORAN) return 'BELİRSİZ';
  return ds[0][1];
}
console.log('\nyeni prototiple silah, baş parmak taraması:');
for(let t=0;t<=1.001;t+=0.2){
  const lm=landmark(yonlendir(poz3Gun(t),0,0,0));
  console.log('  baş parmak %'+(t*100).toFixed(0).padStart(3)+' → '+sinifla2(lm));
}
console.log('\ndiğer pozlar bozuldu mu (yönelim ızgarası, yeni gun prototipi):');
let tot=0,ok=0,kotu=[];
for(const n of NAMES) for(const [p,r,y] of acilar){
  const lm=landmark(yonlendir(poz3(DEF[n]),p,r,y));
  const g=sinifla2(lm); tot++; if(g===n) ok++; else kotu.push(`${n}@${p}/${r}/${y}→${g}`);
}
console.log(`  doğru %${(ok/tot*100).toFixed(1)}` + (kotu.length?('  sapmalar: '+kotu.slice(0,6).join(', ')):'  (sapma yok)'));

/* --- Silahın açıklık deseni (işaret+orta) altı poz içinde BENZERSİZ.
       Yani baş parmak mesafeleri silah için ayırt edici değil, gürültü.
       Çözüm: poz başına ağırlık — silahta baş parmak terimlerini kıs. --- */
console.log('\n\nPOZ BAŞINA AĞIRLIK DENEMESİ\n');
const W_GUN=[1.9,1.9,1.9,1.9,0.3,0.3,0.3,0.3,0.3];
function uzakW(a,b,w){let s=0;for(let k=0;k<9;k++){const d=(a[k]-b[k])*w[k];s+=d*d;}return Math.sqrt(s);}
function yap(gunProto,gunW){
  const P={...PROTO.d2,gun:gunProto};
  const WW={}; for(const n of NAMES) WW[n]= n==='gun'?gunW:W;
  return lm=>{
    const f=ozellik(lm,d2);
    const ds=NAMES.map(n=>[uzakW(f,P[n],WW[n]),n]).sort((a,b)=>a[0]-b[0]);
    if(ds[0][0]>M.RED_MESAFE) return 'RED';
    if(ds[1][0]/(ds[0][0]||1e-6)<M.RED_ORAN) return 'BELİRSİZ';
    return ds[0][1];
  };
}
const gunOrta=ozellik(landmark(yonlendir(poz3Gun(0.55),0,0,0)),d2).map(x=>+x.toFixed(4));
const adaylar=[
  ['mevcut (dik baş parmak, eşit ağırlık)', PROTO.d2.gun, W],
  ['orta baş parmak (%55), eşit ağırlık',   gunOrta,      W],
  ['orta baş parmak + kısık baş parmak ağırlığı', gunOrta, W_GUN],
];
for(const [ad,pr,w] of adaylar){
  const sn=yap(pr,w);
  let gunOk=0,gunN=0;
  for(let t=0;t<=1.001;t+=0.1){ for(const [p,r,y] of acilar.filter(a=>a[0]<=45)){
    gunN++; if(sn(landmark(yonlendir(poz3Gun(t),p,r,y)))==='gun') gunOk++; } }
  let digOk=0,digN=0,sap=[];
  for(const n of NAMES.filter(x=>x!=='gun')) for(const [p,r,y] of acilar){
    digN++; const g=sn(landmark(yonlendir(poz3(DEF[n]),p,r,y)));
    if(g===n) digOk++; else sap.push(n+'→'+g);
  }
  console.log(` ${pad(ad,44)} silah %${(gunOk/gunN*100).toFixed(1).padStart(5)}  diğerleri %${(digOk/digN*100).toFixed(1)}${sap.length?'  ('+[...new Set(sap)].slice(0,3).join(', ')+')':''}`);
}
console.log('\ngun prototipi (orta baş parmak):',JSON.stringify(gunOrta));
console.log('W_GUN:',JSON.stringify(W_GUN));
